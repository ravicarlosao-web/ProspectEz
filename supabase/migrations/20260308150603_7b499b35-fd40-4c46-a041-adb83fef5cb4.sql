
-- Tabela payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_key text,
  package_key text,
  amount_kz numeric(12,2) NOT NULL DEFAULT 0,
  amount_usd numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'transferencia',
  status text NOT NULL DEFAULT 'pendente',
  receipt_url text,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- User can view own payments
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- User can insert own payments
CREATE POLICY "Users can insert own payments"
  ON public.payments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admin can update payments
CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete payments
CREATE POLICY "Admins can delete payments"
  ON public.payments FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('payment-receipts', 'payment-receipts', false, 1048576);

-- Users can upload to their own folder
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can view own receipts
CREATE POLICY "Users can view own receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role)));

-- Admins can view all receipts
CREATE POLICY "Admins can view all receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-receipts' AND has_role(auth.uid(), 'admin'::app_role));
