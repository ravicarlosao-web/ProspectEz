-- Add weekly_carry_over column to track unused tokens that roll over between weeks.
-- Unused base tokens at end of week enter the pool; pool is distributed equally
-- across remaining weeks of the month via floor(carry_over / remaining_weeks).

ALTER TABLE public.search_quotas
  ADD COLUMN IF NOT EXISTS weekly_carry_over integer NOT NULL DEFAULT 0;

-- Update consume_search_token to include carry-over in effective weekly limit
CREATE OR REPLACE FUNCTION public.consume_search_token(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quota        record;
  v_suspended    boolean;
  v_weekly_max   integer;
  v_monthly_max  integer;
  v_rem_weeks    integer;
  v_carry_extra  integer;
  v_new_carry    integer;
BEGIN
  SELECT is_suspended INTO v_suspended FROM public.profiles WHERE user_id = p_user_id;
  IF v_suspended IS TRUE THEN RETURN false; END IF;

  SELECT * INTO v_quota FROM public.search_quotas WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_quota.is_active IS FALSE THEN RETURN false; END IF;

  -- Monthly reset (non-free plans only)
  IF v_quota.plan_type <> 'free' AND v_quota.last_monthly_reset < date_trunc('month', CURRENT_DATE)::date THEN
    UPDATE public.search_quotas
    SET used_this_month  = 0,
        used_this_week   = 0,
        weekly_carry_over = 0,
        last_monthly_reset = CURRENT_DATE,
        last_weekly_reset  = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_this_month   := 0;
    v_quota.used_this_week    := 0;
    v_quota.weekly_carry_over := 0;

  -- Weekly reset with carry-over (non-free plans only)
  ELSIF v_quota.plan_type <> 'free' AND v_quota.last_weekly_reset < date_trunc('week', CURRENT_DATE)::date THEN
    v_new_carry := GREATEST(0, COALESCE(v_quota.weekly_carry_over, 0) + v_quota.weekly_limit - v_quota.used_this_week);
    UPDATE public.search_quotas
    SET used_this_week    = 0,
        weekly_carry_over = v_new_carry,
        last_weekly_reset = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id;
    v_quota.used_this_week    := 0;
    v_quota.weekly_carry_over := v_new_carry;
  END IF;

  -- Remaining weeks in current month (including current week)
  v_rem_weeks := GREATEST(1, CEIL(
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - CURRENT_DATE)::numeric / 7
  )::integer);

  v_carry_extra := FLOOR(COALESCE(v_quota.weekly_carry_over, 0)::numeric / v_rem_weeks);

  -- Effective limits
  v_weekly_max  := v_quota.weekly_limit + v_carry_extra + COALESCE(v_quota.tokens_added_manually, 0);
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
