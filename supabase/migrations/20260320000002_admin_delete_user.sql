-- Admin delete user: removes all records including the auth.users entry
-- so the user can no longer log in after deletion.
-- Only callable by authenticated users whose role = 'admin'.

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.user_roles
  WHERE user_id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Forbidden: only admins can delete users';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: cannot delete your own account';
  END IF;

  DELETE FROM public.search_quotas WHERE user_id = p_user_id;
  DELETE FROM public.user_roles   WHERE user_id = p_user_id;
  DELETE FROM public.profiles     WHERE user_id = p_user_id;
  DELETE FROM auth.users          WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
