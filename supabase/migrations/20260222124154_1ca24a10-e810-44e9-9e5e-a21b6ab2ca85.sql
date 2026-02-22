
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings"
ON public.app_settings FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can upsert settings"
ON public.app_settings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
ON public.app_settings FOR UPDATE
USING (true);

-- Insert default agency name
INSERT INTO public.app_settings (key, value) VALUES ('agency_name', 'KYS Digital');
