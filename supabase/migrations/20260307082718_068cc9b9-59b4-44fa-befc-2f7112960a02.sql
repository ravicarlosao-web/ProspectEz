
-- Fix app_settings: only admins can modify
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can upsert settings" ON public.app_settings;

CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix message_templates: only admins/creators can modify
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON public.message_templates;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON public.message_templates;

CREATE POLICY "Users can insert own templates" ON public.message_templates FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own templates" ON public.message_templates FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
