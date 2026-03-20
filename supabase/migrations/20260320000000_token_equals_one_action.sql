-- Migration: 1 TOKEN = 1 PESQUISA = 10 RESULTADOS
-- weekly_limit and monthly_limit now represent TOKENS (actions), not raw results.
-- 1 search = 1 token consumed. 1 "Ver Mais" click = 1 token consumed.
-- Each token delivers 10 results to the user.

-- Update consume_search_token to explicitly consume 1 token per call
CREATE OR REPLACE FUNCTION public.consume_search_token(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota record;
  v_weekly_max integer;
  v_monthly_max integer;
BEGIN
  -- Fetch current quota with weekly reset logic
  SELECT *
  INTO v_quota
  FROM public.search_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Auto-reset weekly counter if a new week has started
  IF v_quota.week_start IS NOT NULL AND
     date_trunc('week', now()) > date_trunc('week', v_quota.week_start) THEN
    UPDATE public.search_quotas
    SET used_this_week = 0,
        week_start = date_trunc('week', now())
    WHERE user_id = p_user_id;
    v_quota.used_this_week := 0;
  END IF;

  -- Auto-reset monthly counter if a new month has started
  IF v_quota.month_start IS NOT NULL AND
     date_trunc('month', now()) > date_trunc('month', v_quota.month_start) THEN
    UPDATE public.search_quotas
    SET used_this_month = 0,
        month_start = date_trunc('month', now())
    WHERE user_id = p_user_id;
    v_quota.used_this_month := 0;
  END IF;

  -- Effective limits (0 = unlimited for that dimension)
  v_weekly_max  := COALESCE(v_quota.weekly_limit, 0) + COALESCE(v_quota.tokens_added_manually, 0);
  v_monthly_max := COALESCE(v_quota.monthly_limit, 0) + COALESCE(v_quota.tokens_added_manually, 0);

  -- Check weekly limit (skip if 0 = unlimited)
  IF v_weekly_max > 0 AND v_quota.used_this_week + 1 > v_weekly_max THEN
    RETURN false;
  END IF;

  -- Check monthly limit (skip if 0 = unlimited)
  IF v_monthly_max > 0 AND v_quota.used_this_month + 1 > v_monthly_max THEN
    RETURN false;
  END IF;

  -- Consume exactly 1 token (1 action = 1 pesquisa or 1 "Ver Mais")
  UPDATE public.search_quotas
  SET used_this_week  = used_this_week  + 1,
      used_this_month = used_this_month + 1
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;
