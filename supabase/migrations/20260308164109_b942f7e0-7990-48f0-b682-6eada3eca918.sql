
-- Fix: The previous migration partially applied. Check and clean up.
-- The trigger and function should have been created. Let's verify and fix the policy.

-- Drop the policy if it was created with wrong role target
DROP POLICY IF EXISTS "Users can update own usage safely" ON public.search_quotas;

-- Recreate with correct RESTRICTIVE qualifier to match existing pattern
CREATE POLICY "Users can update own usage safely"
ON public.search_quotas
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
