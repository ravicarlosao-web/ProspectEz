-- Per-plan source control: each plan can have sources enabled/disabled independently
CREATE TABLE IF NOT EXISTS public.plan_search_sources (
  plan_type  text NOT NULL,
  source_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (plan_type, source_key)
);

ALTER TABLE public.plan_search_sources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'plan_search_sources'
    AND policyname = 'All authenticated can read plan_search_sources'
  ) THEN
    CREATE POLICY "All authenticated can read plan_search_sources"
      ON public.plan_search_sources FOR SELECT
      TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'plan_search_sources'
    AND policyname = 'Admins can manage plan_search_sources'
  ) THEN
    CREATE POLICY "Admins can manage plan_search_sources"
      ON public.plan_search_sources FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Seed: all plan × source combinations enabled by default
INSERT INTO public.plan_search_sources (plan_type, source_key, is_enabled)
SELECT plans.p, srcs.s, true
FROM (VALUES ('free'), ('starter'), ('pro'), ('business')) AS plans(p)
CROSS JOIN (VALUES
  ('yellow_ao'), ('angolist'), ('verangola'), ('ao_domain'),
  ('facebook'), ('instagram'), ('linkedin'), ('tiktok'),
  ('google_maps'), ('directorio'), ('geral')
) AS srcs(s)
ON CONFLICT (plan_type, source_key) DO NOTHING;
