
-- LEADS: each user sees only their own leads, admins see all
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;

CREATE POLICY "Users can view own leads" ON public.leads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own leads" ON public.leads FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own leads" ON public.leads FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- PROSPECTION_LOGS: each user sees only their own logs, admins see all
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.prospection_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.prospection_logs;

CREATE POLICY "Users can view own logs" ON public.prospection_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own logs" ON public.prospection_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- MESSAGES: each user sees only messages they sent, admins see all
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated
  USING (sent_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sent_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
