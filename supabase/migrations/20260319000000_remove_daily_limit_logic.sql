
-- ============================================================
-- Remove daily limit logic from DB functions
-- Keep daily_limit and used_today columns for backward compat
-- but stop using them in business logic.
-- ============================================================

-- 1. Update handle_new_user: new free users get weekly=10, monthly=10
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

  INSERT INTO public.search_quotas (
    user_id,
    plan_type,
    weekly_limit,
    monthly_limit,
    used_this_week,
    used_this_month,
    tokens_added_manually
  )
  VALUES (NEW.id, 'free', 10, 10, 0, 0, 0);

  RETURN NEW;
END;
$function$;

-- Re-attach trigger in case it was dropped
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Replace consume_search_token: weekly + monthly only, no daily
--    (The frontend does direct updates; this function is kept as a
--    safe fallback / server-side path but no longer checks daily.)
CREATE OR REPLACE FUNCTION public.consume_search_token(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quota RECORD;
  v_suspended boolean;
  v_weekly_max integer;
  v_monthly_max integer;
BEGIN
  -- Check suspension
  SELECT is_suspended INTO v_suspended FROM public.profiles WHERE user_id = p_user_id;
  IF v_suspended IS TRUE THEN
    RETURN false;
  END IF;

  SELECT * INTO v_quota FROM public.search_quotas WHERE user_id = p_user_id FOR UPDATE;

  -- Auto-create quota for edge cases
  IF NOT FOUND THEN
    INSERT INTO public.search_quotas (
      user_id, plan_type, weekly_limit, monthly_limit,
      used_this_week, used_this_month, tokens_added_manually
    )
    VALUES (p_user_id, 'free', 10, 10, 0, 0, 0);
    SELECT * INTO v_quota FROM public.search_quotas WHERE user_id = p_user_id;
  END IF;

  -- Check is_active
  IF v_quota.is_active IS FALSE THEN
    RETURN false;
  END IF;

  -- Auto-reset weekly on Monday
  IF v_quota.last_weekly_reset < date_trunc('week', CURRENT_DATE)::date THEN
    UPDATE public.search_quotas
    SET used_this_week = 0, last_weekly_reset = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_this_week := 0;
  END IF;

  -- Auto-reset monthly on 1st of month
  IF v_quota.last_monthly_reset < date_trunc('month', CURRENT_DATE)::date THEN
    UPDATE public.search_quotas
    SET used_this_month = 0, last_monthly_reset = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_this_month := 0;
  END IF;

  -- Effective limits (bonus tokens added to monthly only)
  v_weekly_max  := v_quota.weekly_limit;
  v_monthly_max := v_quota.monthly_limit + COALESCE(v_quota.tokens_added_manually, 0);

  -- Check weekly limit
  IF v_weekly_max > 0 AND v_quota.used_this_week >= v_weekly_max THEN
    RETURN false;
  END IF;

  -- Check monthly limit
  IF v_monthly_max > 0 AND v_quota.used_this_month >= v_monthly_max THEN
    RETURN false;
  END IF;

  -- Consume 1 result (note: frontend consumes in batches of 10 directly)
  UPDATE public.search_quotas
  SET used_this_week  = used_this_week  + 1,
      used_this_month = used_this_month + 1,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$function$;
