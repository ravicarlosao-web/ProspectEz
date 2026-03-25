-- Step 1: Fix trigger so future registrations always save email + full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = ''
                         THEN EXCLUDED.full_name
                         ELSE profiles.full_name END,
        email = CASE WHEN profiles.email IS NULL OR profiles.email = ''
                     THEN EXCLUDED.email
                     ELSE profiles.email END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 2: Backfill emails for existing profiles that are missing it
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.email IS NULL OR p.email = '');

-- Step 3: Backfill full_name from auth metadata for profiles without a name
UPDATE public.profiles p
SET full_name = COALESCE(
  NULLIF(u.raw_user_meta_data->>'full_name', ''),
  u.email
)
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.full_name IS NULL OR p.full_name = '');

-- Step 4: Simpler RPC that only queries public schema (no auth.users at runtime)
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
    COALESCE(NULLIF(p.full_name, ''), NULLIF(p.email, ''), p.user_id::text) AS full_name,
    COALESCE(p.email, '')                                                    AS email,
    COALESCE(p.phone, '')                                                    AS phone,
    p.registered_at,
    p.last_login_at,
    COALESCE(p.is_suspended, false)                                         AS is_suspended,
    COALESCE(p.suspension_reason, '')                                       AS suspension_reason,
    COALESCE(r.role, 'vendedor')                                            AS role,
    COALESCE(q.plan_type, 'free')                                           AS plan_type,
    COALESCE(q.weekly_limit, 1)                                             AS weekly_limit,
    COALESCE(q.monthly_limit, 0)                                            AS monthly_limit,
    COALESCE(q.used_this_week, 0)                                           AS used_this_week,
    COALESCE(q.used_this_month, 0)                                          AS used_this_month,
    COALESCE(q.tokens_added_manually, 0)                                    AS tokens_added_manually,
    COALESCE(q.is_active, true)                                             AS is_active,
    COALESCE(q.weekly_carry_over, 0)                                        AS weekly_carry_over
  FROM public.profiles p
  LEFT JOIN public.user_roles r    ON r.user_id = p.user_id
  LEFT JOIN public.search_quotas q ON q.user_id = p.user_id
  ORDER BY p.registered_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
