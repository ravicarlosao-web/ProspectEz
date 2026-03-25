import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SearchSource = {
  key: string;
  label: string;
  description: string;
  is_enabled: boolean;
  sort_order: number;
};

export const DEFAULT_SOURCES: SearchSource[] = [
  { key: "yellow_ao",   label: "Yellow Pages Angola",  description: "site:yellow.co.ao — directório de empresas angolanas",  is_enabled: true, sort_order: 1 },
  { key: "angolist",    label: "Angolist",              description: "site:angolist.com — listagem de negócios em Angola",     is_enabled: true, sort_order: 2 },
  { key: "verangola",   label: "VerAngola",             description: "site:verangola.net — portal de empresas angolanas",     is_enabled: true, sort_order: 3 },
  { key: "ao_domain",   label: "Domínios .ao",          description: "Pesquisa em sites com domínio .ao e .co.ao",            is_enabled: true, sort_order: 4 },
  { key: "facebook",    label: "Facebook",              description: "site:facebook.com — páginas e grupos de empresas",      is_enabled: true, sort_order: 5 },
  { key: "instagram",   label: "Instagram",             description: "site:instagram.com — perfis de empresas",               is_enabled: true, sort_order: 6 },
  { key: "linkedin",    label: "LinkedIn",              description: "site:linkedin.com — perfis corporativos",               is_enabled: true, sort_order: 7 },
  { key: "tiktok",      label: "TikTok",                description: "site:tiktok.com — contas de empresas",                  is_enabled: true, sort_order: 8 },
  { key: "google_maps", label: "Google Maps",           description: "Pesquisa de empresas e localizações via Google Maps",   is_enabled: true, sort_order: 9 },
  { key: "directorio",  label: "Directório Angola",     description: "Listagens e directórios gerais de empresas angolanas",  is_enabled: true, sort_order: 10 },
  { key: "geral",       label: "Pesquisa Geral",        description: "Resultados gerais do Google sem site específico",       is_enabled: true, sort_order: 11 },
];

export const useSearchSources = () => {
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(new Set(DEFAULT_SOURCES.map(s => s.key)));
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("search_sources" as any)
        .select("*")
        .order("sort_order");

      if (!error && data && (data as SearchSource[]).length > 0) {
        const rows = data as SearchSource[];
        setSources(rows);
        setEnabledKeys(new Set(rows.filter(s => s.is_enabled).map(s => s.key)));
        setUsingFallback(false);
      } else {
        setSources(DEFAULT_SOURCES);
        setEnabledKeys(new Set(DEFAULT_SOURCES.map(s => s.key)));
        setUsingFallback(true);
      }
    } catch {
      setSources(DEFAULT_SOURCES);
      setEnabledKeys(new Set(DEFAULT_SOURCES.map(s => s.key)));
      setUsingFallback(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return { sources, enabledKeys, loading, usingFallback, refetch: fetch };
};
