-- ============================================================
-- Admin RPC: update a user's quota/plan server-side
-- SECURITY DEFINER bypasses all RLS — safe because we verify
-- the caller is an admin before making any changes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_quota(
  p_target_user_id    uuid,
  p_plan_type         text,
  p_weekly_limit      integer,
  p_monthly_limit     integer,
  p_tokens_manually   integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_plan text;
  v_today    date := CURRENT_DATE;
BEGIN
  -- Admin-only guard
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'access_denied');
  END IF;

  -- Get current plan for comparison
  SELECT plan_type INTO v_old_plan
  FROM public.search_quotas
  WHERE user_id = p_target_user_id;

  IF NOT FOUND THEN
    -- No quota row yet — create one
    INSERT INTO public.search_quotas (
      user_id, plan_type, weekly_limit, monthly_limit,
      used_this_week, used_this_month, tokens_added_manually,
      last_weekly_reset, last_monthly_reset
    )
    VALUES (
      p_target_user_id, p_plan_type, p_weekly_limit, p_monthly_limit,
      0, 0, COALESCE(p_tokens_manually, 0),
      v_today, v_today
    );
    RETURN jsonb_build_object('ok', true, 'created', true);
  END IF;

  -- Plan is changing → reset usage counters so new limits apply immediately
  IF v_old_plan IS DISTINCT FROM p_plan_type THEN
    UPDATE public.search_quotas SET
      plan_type          = p_plan_type,
      weekly_limit       = p_weekly_limit,
      monthly_limit      = p_monthly_limit,
      used_this_week     = 0,
      used_this_month    = 0,
      weekly_carry_over  = 0,
      last_weekly_reset  = v_today,
      last_monthly_reset = v_today,
      tokens_added_manually = COALESCE(p_tokens_manually, tokens_added_manually)
    WHERE user_id = p_target_user_id;
  ELSE
    -- Same plan — only update limits (preserve usage counts)
    UPDATE public.search_quotas SET
      plan_type         = p_plan_type,
      weekly_limit      = p_weekly_limit,
      monthly_limit     = p_monthly_limit,
      tokens_added_manually = COALESCE(p_tokens_manually, tokens_added_manually)
    WHERE user_id = p_target_user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'plan_changed', v_old_plan IS DISTINCT FROM p_plan_type);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_quota(uuid, text, integer, integer, integer) TO authenticated;
