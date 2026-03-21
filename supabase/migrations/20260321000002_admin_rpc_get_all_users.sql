-- Admin RPC function that bypasses RLS entirely (SECURITY DEFINER runs as owner)
-- This is the most reliable way to let admins read all user data
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id       uuid,
  full_name     text,
  email         text,
  phone         text,
  registered_at timestamptz,
  last_login_at timestamptz,
  is_suspended  boolean,
  suspension_reason text,
  role          text,
  plan_type     text,
  weekly_limit  integer,
  monthly_limit integer,
  used_this_week  integer,
  used_this_month integer,
  tokens_added_manually integer,
  is_active     boolean,
  weekly_carry_over integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    p.email,
    p.phone,
    p.registered_at,
    p.last_login_at,
    COALESCE(p.is_suspended, false)   AS is_suspended,
    COALESCE(p.suspension_reason, '') AS suspension_reason,
    COALESCE(r.role, 'vendedor')      AS role,
    COALESCE(q.plan_type, 'free')     AS plan_type,
    COALESCE(q.weekly_limit, 1)       AS weekly_limit,
    COALESCE(q.monthly_limit, 0)      AS monthly_limit,
    COALESCE(q.used_this_week, 0)     AS used_this_week,
    COALESCE(q.used_this_month, 0)    AS used_this_month,
    COALESCE(q.tokens_added_manually, 0) AS tokens_added_manually,
    COALESCE(q.is_active, true)       AS is_active,
    COALESCE(q.weekly_carry_over, 0)  AS weekly_carry_over
  FROM public.profiles p
  LEFT JOIN public.user_roles r    ON r.user_id = p.user_id
  LEFT JOIN public.search_quotas q ON q.user_id = p.user_id
  ORDER BY p.registered_at DESC NULLS LAST;
END;
$$;

-- Grant execute permission to authenticated users (function itself checks for admin role)
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
