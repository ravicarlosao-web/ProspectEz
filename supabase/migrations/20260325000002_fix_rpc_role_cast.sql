-- Fix: cast app_role enum to text in the RPC return value
-- This was the root cause of "structure of query does not match function result type"
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id               uuid,
  full_name             text,
  email                 text,
  phone                 text,
  registered_at         timestamptz,
  last_login_at         timestamptz,
  is_suspended          boolean,
  suspension_reason     text,
  role                  text,
  plan_type             text,
  weekly_limit          integer,
  monthly_limit         integer,
  used_this_week        integer,
  used_this_month       integer,
  tokens_added_manually integer,
  is_active             boolean,
  weekly_carry_over     integer
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
    COALESCE(NULLIF(p.full_name, ''), NULLIF(p.email, ''), p.user_id::text)  AS full_name,
    COALESCE(p.email, '')                                                     AS email,
    COALESCE(p.phone, '')                                                     AS phone,
    COALESCE(p.registered_at, p.created_at)                                  AS registered_at,
    p.last_login_at,
    COALESCE(p.is_suspended, false)                                           AS is_suspended,
    COALESCE(p.suspension_reason, '')                                         AS suspension_reason,
    COALESCE(r.role::text, 'vendedor')                                        AS role,
    COALESCE(q.plan_type, 'free')                                             AS plan_type,
    COALESCE(q.weekly_limit, 1)                                               AS weekly_limit,
    COALESCE(q.monthly_limit, 0)                                              AS monthly_limit,
    COALESCE(q.used_this_week, 0)                                             AS used_this_week,
    COALESCE(q.used_this_month, 0)                                            AS used_this_month,
    COALESCE(q.tokens_added_manually, 0)                                      AS tokens_added_manually,
    COALESCE(q.is_active, true)                                               AS is_active,
    COALESCE(q.weekly_carry_over, 0)                                          AS weekly_carry_over
  FROM public.profiles p
  LEFT JOIN public.user_roles r    ON r.user_id = p.user_id
  LEFT JOIN public.search_quotas q ON q.user_id = p.user_id
  ORDER BY COALESCE(p.registered_at, p.created_at) DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
