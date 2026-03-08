
CREATE TABLE public.device_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  ip_address text,
  user_id uuid,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_reg_fingerprint ON public.device_registrations (fingerprint);
CREATE INDEX idx_device_reg_ip ON public.device_registrations (ip_address);

ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) can insert/read
CREATE POLICY "Service role only" ON public.device_registrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
