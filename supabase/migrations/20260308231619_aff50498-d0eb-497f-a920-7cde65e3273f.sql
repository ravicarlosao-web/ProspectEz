
-- Add persistent_token column to device_registrations
ALTER TABLE public.device_registrations ADD COLUMN IF NOT EXISTS persistent_token text;
CREATE INDEX IF NOT EXISTS idx_device_reg_token ON public.device_registrations (persistent_token);

-- Rate limiting table for registration attempts
CREATE TABLE IF NOT EXISTS public.registration_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text,
  fingerprint text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reg_attempts_ip_time ON public.registration_attempts (ip_address, created_at);

ALTER TABLE public.registration_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.registration_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
