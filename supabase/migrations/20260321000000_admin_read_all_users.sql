-- Allow admins to read ALL profiles (fixes admin panel showing only own account)
CREATE POLICY "admins_can_read_all_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
);

-- Allow admins to read ALL user_roles
CREATE POLICY "admins_can_read_all_user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
);

-- Allow admins to read ALL search_quotas
CREATE POLICY "admins_can_read_all_search_quotas"
ON public.search_quotas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
);

-- Allow admins to UPDATE all profiles (for editing users)
CREATE POLICY "admins_can_update_all_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to UPDATE all user_roles
CREATE POLICY "admins_can_update_all_user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to UPDATE all search_quotas
CREATE POLICY "admins_can_update_all_search_quotas"
ON public.search_quotas
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to INSERT into user_roles (for setting roles on new users)
CREATE POLICY "admins_can_insert_user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to INSERT into search_quotas (for manual quota creation)
CREATE POLICY "admins_can_insert_search_quotas"
ON public.search_quotas
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
