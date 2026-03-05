
-- Table to track search quotas per user
CREATE TABLE public.search_quotas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_limit integer NOT NULL DEFAULT 50,
  used_today integer NOT NULL DEFAULT 0,
  last_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.search_quotas ENABLE ROW LEVEL SECURITY;

-- Users can view their own quota
CREATE POLICY "Users can view own quota"
  ON public.search_quotas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all quotas
CREATE POLICY "Admins can view all quotas"
  ON public.search_quotas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all quotas
CREATE POLICY "Admins can update quotas"
  ON public.search_quotas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert quotas
CREATE POLICY "Admins can insert quotas"
  ON public.search_quotas FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can update their own used_today count
CREATE POLICY "Users can update own usage"
  ON public.search_quotas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-create quota on new user (update existing trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor');
  
  INSERT INTO public.search_quotas (user_id, daily_limit)
  VALUES (NEW.id, 50);
  
  RETURN NEW;
END;
$$;

-- Function to consume a search token (returns true if allowed)
CREATE OR REPLACE FUNCTION public.consume_search_token(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quota RECORD;
BEGIN
  SELECT * INTO v_quota FROM public.search_quotas WHERE user_id = p_user_id FOR UPDATE;
  
  -- If no quota record, create one
  IF NOT FOUND THEN
    INSERT INTO public.search_quotas (user_id, daily_limit, used_today, last_reset_date)
    VALUES (p_user_id, 50, 0, CURRENT_DATE);
    SELECT * INTO v_quota FROM public.search_quotas WHERE user_id = p_user_id;
  END IF;
  
  -- Reset if new day
  IF v_quota.last_reset_date < CURRENT_DATE THEN
    UPDATE public.search_quotas 
    SET used_today = 0, last_reset_date = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_today := 0;
  END IF;
  
  -- Check limit
  IF v_quota.used_today >= v_quota.daily_limit THEN
    RETURN false;
  END IF;
  
  -- Consume token
  UPDATE public.search_quotas 
  SET used_today = used_today + 1, updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;
