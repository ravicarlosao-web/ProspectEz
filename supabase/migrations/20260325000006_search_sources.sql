-- Search sources table: admin-controlled toggle per data source
CREATE TABLE IF NOT EXISTS public.search_sources (
  key         text PRIMARY KEY,
  label       text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_enabled  boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0
);

ALTER TABLE public.search_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read search_sources"
  ON public.search_sources FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage search_sources"
  ON public.search_sources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.search_sources (key, label, description, is_enabled, sort_order) VALUES
  ('yellow_ao',   'Yellow Pages Angola',     'site:yellow.co.ao — directório de empresas angolanas',  true,  1),
  ('angolist',    'Angolist',                'site:angolist.com — listagem de negócios em Angola',     true,  2),
  ('verangola',   'VerAngola',               'site:verangola.net — portal de empresas angolanas',     true,  3),
  ('ao_domain',   'Domínios .ao',            'Pesquisa em sites com domínio .ao e .co.ao',            true,  4),
  ('facebook',    'Facebook',                'site:facebook.com — páginas e grupos de empresas',      true,  5),
  ('instagram',   'Instagram',               'site:instagram.com — perfis de empresas',               true,  6),
  ('linkedin',    'LinkedIn',                'site:linkedin.com — perfis corporativos',               true,  7),
  ('tiktok',      'TikTok',                  'site:tiktok.com — contas de empresas',                  true,  8),
  ('google_maps', 'Google Maps',             'Pesquisa de empresas e localizações via Google Maps',   true,  9),
  ('directorio',  'Directório Angola',       'Listagens e directórios gerais de empresas angolanas',  true, 10),
  ('geral',       'Pesquisa Geral',          'Resultados gerais do Google sem site específico',       true, 11)
ON CONFLICT (key) DO NOTHING;
