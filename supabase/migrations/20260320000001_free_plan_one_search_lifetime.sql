-- Free plan: exactly 1 search for lifetime (weekly_limit=1, monthly_limit=0)
-- weekly_limit=1  → 1 token ever; counter never auto-resets for free plan users.
-- monthly_limit=0 → skip monthly check (0 = unlimited on that axis).
-- After the 1 search: used_this_week=1, check 1+1>1 = permanently blocked until upgraded.
--
-- Preserves full new-user provisioning: profiles + user_roles + search_quotas.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, registered_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, now())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.search_quotas (
    user_id,
    plan_type,
    weekly_limit,
    monthly_limit,
    used_this_week,
    used_this_month,
    tokens_added_manually
  )
  VALUES (NEW.id, 'free', 1, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Re-attach trigger to ensure it picks up the new function body
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update consume_search_token to skip weekly auto-reset for free plan users
-- (free plan has a lifetime limit of 1 token that must never reset automatically)
CREATE OR REPLACE FUNCTION public.consume_search_token(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quota record;
  v_suspended boolean;
  v_weekly_max integer;
  v_monthly_max integer;
BEGIN
  SELECT is_suspended INTO v_suspended FROM public.profiles WHERE user_id = p_user_id;
  IF v_suspended IS TRUE THEN
    RETURN false;
  END IF;

  SELECT * INTO v_quota FROM public.search_quotas WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_quota.is_active IS FALSE THEN
    RETURN false;
  END IF;

  -- Auto-reset weekly counter only for non-free plans
  IF v_quota.plan_type <> 'free' AND v_quota.last_weekly_reset < date_trunc('week', CURRENT_DATE)::date THEN
    UPDATE public.search_quotas
    SET used_this_week = 0, last_weekly_reset = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_this_week := 0;
  END IF;

  -- Auto-reset monthly counter only for non-free plans
  IF v_quota.plan_type <> 'free' AND v_quota.last_monthly_reset < date_trunc('month', CURRENT_DATE)::date THEN
    UPDATE public.search_quotas
    SET used_this_month = 0, last_monthly_reset = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_this_month := 0;
  END IF;

  v_weekly_max  := COALESCE(v_quota.weekly_limit, 0) + COALESCE(v_quota.tokens_added_manually, 0);
  v_monthly_max := COALESCE(v_quota.monthly_limit, 0) + COALESCE(v_quota.tokens_added_manually, 0);

  IF v_weekly_max > 0 AND v_quota.used_this_week + 1 > v_weekly_max THEN
    RETURN false;
  END IF;

  IF v_monthly_max > 0 AND v_quota.used_this_month + 1 > v_monthly_max THEN
    RETURN false;
  END IF;

  UPDATE public.search_quotas
  SET used_this_week  = used_this_week  + 1,
      used_this_month = used_this_month + 1,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;
