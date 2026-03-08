
-- Security logs table for tracking failed logins, lockouts, and suspicious access
CREATE TABLE public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  email text,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read security logs
CREATE POLICY "Admins can view security logs"
  ON public.security_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow edge function (service role) to insert, no direct user inserts
-- We don't create INSERT policy for authenticated users since the edge function uses service role
