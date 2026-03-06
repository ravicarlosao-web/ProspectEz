
-- Add new columns to search_quotas
ALTER TABLE public.search_quotas
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS monthly_limit integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS used_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_this_week integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_reset_type text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS last_weekly_reset date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS last_monthly_reset date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tokens_added_manually integer NOT NULL DEFAULT 0;

-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS registered_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for profiles (for new user detection)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Update consume_search_token to check monthly limit and suspension
CREATE OR REPLACE FUNCTION public.consume_search_token(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quota RECORD;
  v_suspended boolean;
BEGIN
  -- Check if user is suspended
  SELECT is_suspended INTO v_suspended FROM public.profiles WHERE user_id = p_user_id;
  IF v_suspended IS TRUE THEN
    RETURN false;
  END IF;

  SELECT * INTO v_quota FROM public.search_quotas WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO public.search_quotas (user_id, daily_limit, used_today, last_reset_date, plan_type, monthly_limit)
    VALUES (p_user_id, 50, 0, CURRENT_DATE, 'free', 3);
    SELECT * INTO v_quota FROM public.search_quotas WHERE user_id = p_user_id;
  END IF;

  -- Check if active
  IF v_quota.is_active IS FALSE THEN
    RETURN false;
  END IF;
  
  -- Reset daily if new day
  IF v_quota.last_reset_date < CURRENT_DATE THEN
    UPDATE public.search_quotas 
    SET used_today = 0, last_reset_date = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_today := 0;
  END IF;

  -- Reset weekly if new week (Monday)
  IF v_quota.last_weekly_reset < date_trunc('week', CURRENT_DATE)::date THEN
    UPDATE public.search_quotas
    SET used_this_week = 0, last_weekly_reset = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_this_week := 0;
  END IF;

  -- Reset monthly if new month
  IF v_quota.last_monthly_reset < date_trunc('month', CURRENT_DATE)::date THEN
    UPDATE public.search_quotas
    SET used_this_month = 0, last_monthly_reset = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_this_month := 0;
  END IF;
  
  -- Check daily limit
  IF v_quota.daily_limit > 0 AND v_quota.used_today >= v_quota.daily_limit THEN
    RETURN false;
  END IF;

  -- Check monthly limit (including bonus tokens)
  IF v_quota.monthly_limit > 0 AND v_quota.used_this_month >= (v_quota.monthly_limit + v_quota.tokens_added_manually) THEN
    RETURN false;
  END IF;
  
  -- Consume token
  UPDATE public.search_quotas 
  SET used_today = used_today + 1, 
      used_this_week = used_this_week + 1,
      used_this_month = used_this_month + 1,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$function$;

-- Create admin_reset_monthly_tokens function
CREATE OR REPLACE FUNCTION public.admin_reset_monthly_tokens()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.search_quotas
  SET used_this_month = 0,
      used_this_week = 0,
      last_monthly_reset = CURRENT_DATE,
      last_weekly_reset = CURRENT_DATE,
      updated_at = now();
END;
$function$;

-- Update handle_new_user to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, registered_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, now());
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor');
  
  INSERT INTO public.search_quotas (user_id, daily_limit, plan_type, monthly_limit)
  VALUES (NEW.id, 3, 'free', 3);
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
