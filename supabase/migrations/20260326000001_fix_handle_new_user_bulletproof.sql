-- ============================================================
-- FIX: handle_new_user trigger — bulletproof version
-- Reasons for this migration:
--   1. Migration 20260325000001 overwrote handle_new_user and
--      removed the search_quotas insert, leaving new users with
--      no quota row (searches permanently blocked at 0).
--   2. The trigger had no EXCEPTION handler, so any internal
--      error propagated as "Database error saving new user"
--      (Supabase auth rolls back the entire transaction).
--
-- This migration restores all 3 inserts and wraps everything
-- in an EXCEPTION block so registration is never blocked.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1. Create profile row (upsert: keep existing name/email if set)
  INSERT INTO public.profiles (user_id, full_name, email, registered_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET
      full_name = CASE
        WHEN profiles.full_name IS NULL OR profiles.full_name = ''
        THEN EXCLUDED.full_name
        ELSE profiles.full_name
      END,
      email = CASE
        WHEN profiles.email IS NULL OR profiles.email = ''
        THEN EXCLUDED.email
        ELSE profiles.email
      END;

  -- 2. Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor')
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Create search quota — Free plan: 1 pesquisa vitalícia
  --    weekly_limit = 1  → 1 token lifetime (never auto-resets)
  --    monthly_limit = 0 → skip monthly check (0 = unlimited on that axis)
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

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but NEVER block user registration.
    -- The user can still log in; any missing rows can be fixed later.
    RAISE WARNING 'handle_new_user: error for user % — %: %',
      NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Back-fill: ensure all existing users have a search_quotas row
-- (in case they registered after the 20260325000001 migration removed it)
INSERT INTO public.search_quotas (
  user_id,
  plan_type,
  weekly_limit,
  monthly_limit,
  used_this_week,
  used_this_month,
  tokens_added_manually
)
SELECT
  p.user_id,
  'free',
  1, 0, 0, 0, 0
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.search_quotas q WHERE q.user_id = p.user_id
);
