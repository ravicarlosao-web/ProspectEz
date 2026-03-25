-- =============================================================
-- SECURITY HARDENING: move quota enforcement to server-side
-- and fix leads RLS data isolation
-- =============================================================

-- ---------------------------------------------------------------
-- 1. FIX LEADS RLS: users should only modify their OWN leads
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;

CREATE POLICY "Users can insert own leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 2. REMOVE broad user UPDATE on search_quotas
--    Users must now go through consume_search_token() RPC.
--    Admins keep their update policy (set in earlier migration).
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own usage" ON public.search_quotas;

-- ---------------------------------------------------------------
-- 3. SECURITY DEFINER RPC: atomically consume one search token
--    Called instead of client-side .update({used_this_week+1}).
--    Runs as DB owner — cannot be bypassed from the client.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_search_token(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota  public.search_quotas%ROWTYPE;
  v_week_start  date;
  v_month_start date;
  v_new_carry   integer;
  v_effective_weekly integer;
  v_monthly_max      integer;
BEGIN
  -- Caller can only consume their own token
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthorized');
  END IF;

  -- Lock the row to prevent race conditions
  SELECT * INTO v_quota
  FROM public.search_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_quota');
  END IF;

  -- FREE PLAN: lifetime limit of 1 search, never resets
  IF v_quota.plan_type = 'free' THEN
    IF v_quota.used_this_week >= v_quota.weekly_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'free_plan_exhausted');
    END IF;
    UPDATE public.search_quotas
    SET used_this_week  = used_this_week  + 1,
        used_this_month = used_this_month + 1
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- PAID PLANS: monthly reset first
  v_month_start := date_trunc('month', CURRENT_DATE)::date;
  IF v_quota.last_monthly_reset IS NULL OR v_quota.last_monthly_reset < v_month_start THEN
    UPDATE public.search_quotas
    SET used_this_month   = 0,
        used_this_week    = 0,
        weekly_carry_over = 0,
        last_monthly_reset = v_month_start,
        last_weekly_reset  = v_month_start
    WHERE user_id = p_user_id
    RETURNING * INTO v_quota;
  END IF;

  -- Weekly reset
  v_week_start := (date_trunc('week', CURRENT_DATE) AT TIME ZONE 'UTC')::date;
  IF v_quota.last_weekly_reset IS NULL OR v_quota.last_weekly_reset < v_week_start THEN
    v_new_carry := GREATEST(0,
      COALESCE(v_quota.weekly_carry_over, 0) + v_quota.weekly_limit - v_quota.used_this_week
    );
    UPDATE public.search_quotas
    SET used_this_week    = 0,
        weekly_carry_over = v_new_carry,
        last_weekly_reset = v_week_start
    WHERE user_id = p_user_id
    RETURNING * INTO v_quota;
  END IF;

  -- Effective weekly limit (base + carry-over + bonus tokens)
  v_effective_weekly := v_quota.weekly_limit
                      + COALESCE(v_quota.weekly_carry_over, 0)
                      + COALESCE(v_quota.tokens_added_manually, 0);

  -- Monthly max (base + bonus)
  v_monthly_max := v_quota.monthly_limit
                 + COALESCE(v_quota.tokens_added_manually, 0);

  -- Weekly limit check
  IF v_effective_weekly > 0 AND v_quota.used_this_week + 1 > v_effective_weekly THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'weekly_limit_reached');
  END IF;

  -- Monthly limit check
  IF v_monthly_max > 0 AND v_quota.used_this_month + 1 > v_monthly_max THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_reached');
  END IF;

  -- All checks passed — consume the token
  UPDATE public.search_quotas
  SET used_this_week  = used_this_week  + 1,
      used_this_month = used_this_month + 1
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_search_token(uuid) TO authenticated;
