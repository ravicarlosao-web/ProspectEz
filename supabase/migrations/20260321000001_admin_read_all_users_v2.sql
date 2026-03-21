-- ============================================================
-- FIX: Admin can read ALL users in admin panel
-- Uses DROP POLICY IF EXISTS to avoid conflicts with previous migration
-- ============================================================

-- PROFILES: drop any previous attempt, then recreate cleanly
DROP POLICY IF EXISTS "admins_can_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- PROFILES UPDATE: drop previous attempt, recreate
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- USER_ROLES: already has "Admins can manage roles" FOR ALL — no change needed
-- Just ensure the SELECT policy also works for regular users
DROP POLICY IF EXISTS "admins_can_read_all_user_roles" ON public.user_roles;

-- SEARCH_QUOTAS SELECT: drop previous attempt
DROP POLICY IF EXISTS "admins_can_read_all_search_quotas" ON public.search_quotas;
DROP POLICY IF EXISTS "admins_can_update_all_search_quotas" ON public.search_quotas;
DROP POLICY IF EXISTS "admins_can_insert_search_quotas" ON public.search_quotas;

-- search_quotas already had "Admins can view all quotas" and "Users can view own quota"
-- Drop and recreate combined to be safe
DROP POLICY IF EXISTS "Admins can view all quotas" ON public.search_quotas;
DROP POLICY IF EXISTS "Users can view own quota" ON public.search_quotas;

CREATE POLICY "Users and admins can view quota"
ON public.search_quotas FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Also ensure admins can update/insert quotas (for manual adjustments)
DROP POLICY IF EXISTS "Admins can update quotas" ON public.search_quotas;
DROP POLICY IF EXISTS "Admins can insert quotas" ON public.search_quotas;
DROP POLICY IF EXISTS "Users can update own usage" ON public.search_quotas;
DROP POLICY IF EXISTS "Users can update own usage safely" ON public.search_quotas;

CREATE POLICY "Users can update own usage"
ON public.search_quotas FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can insert quotas"
ON public.search_quotas FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
