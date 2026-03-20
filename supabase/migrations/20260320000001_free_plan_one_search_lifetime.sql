-- Free plan: exactly 1 search for lifetime (weekly_limit=1, monthly_limit=0)
-- weekly_limit=1 → user can do 1 search total (counter never auto-resets for free users)
-- monthly_limit=0 → skip monthly check (unlimited on that axis)
-- After the 1 search, used_this_week=1, check 1+1>1 = permanently blocked until upgraded.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
END;
$$;
