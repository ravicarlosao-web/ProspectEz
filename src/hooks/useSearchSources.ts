import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SearchSource = {
  key: string;
  label: string;
  description: string;
  is_enabled: boolean;
  sort_order: number;
};

export type PlanSourceRow = {
  plan_type: string;
  source_key: string;
  is_enabled: boolean;
};

export type PlanSourceMap = Record<string, Record<string, boolean>>;

export const PLAN_LABELS: Record<string, string> = {
  free:     "Free",
  starter:  "Starter",
  pro:      "Pro",
  business: "Business",
};

export const PLAN_COLORS: Record<string, string> = {
  free:     "text-gray-500",
  starter:  "text-blue-500",
  pro:      "text-purple-500",
  business: "text-yellow-500",
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

const ALL_KEYS = DEFAULT_SOURCES.map(s => s.key);

export const useSearchSources = () => {
  const [sources, setSources] = useState<SearchSource[]>(DEFAULT_SOURCES);
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(new Set(ALL_KEYS));
  const [planSources, setPlanSources] = useState<PlanSourceMap>({});
  const [effectiveEnabledKeys, setEffectiveEnabledKeys] = useState<Set<string>>(new Set(ALL_KEYS));
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [usingPlanFallback, setUsingPlanFallback] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      // 1. Fetch global sources
      const { data: globalData, error: globalError } = await supabase
        .from("search_sources" as any)
        .select("*")
        .order("sort_order");

      let globalSources: SearchSource[];
      let globalEnabled: Set<string>;

      if (!globalError && globalData && (globalData as any[]).length > 0) {
        globalSources = globalData as SearchSource[];
        globalEnabled = new Set(globalSources.filter(s => s.is_enabled).map(s => s.key));
        setSources(globalSources);
        setUsingFallback(false);
      } else {
        globalSources = DEFAULT_SOURCES;
        globalEnabled = new Set(ALL_KEYS);
        setSources(DEFAULT_SOURCES);
        setUsingFallback(true);
      }
      setEnabledKeys(globalEnabled);

      // 2. Fetch plan sources
      const { data: planData, error: planError } = await supabase
        .from("plan_search_sources" as any)
        .select("*");

      let planMap: PlanSourceMap = {};
      if (!planError && planData && (planData as any[]).length > 0) {
        for (const row of planData as PlanSourceRow[]) {
          if (!planMap[row.plan_type]) planMap[row.plan_type] = {};
          planMap[row.plan_type][row.source_key] = row.is_enabled;
        }
        setPlanSources(planMap);
        setUsingPlanFallback(false);
      } else {
        setUsingPlanFallback(true);
      }

      // 3. Compute effective keys for current user (global ∩ plan)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: quotaData } = await supabase
          .from("search_quotas" as any)
          .select("plan_type")
          .eq("user_id", user.id)
          .single();
        const planType: string = (quotaData as any)?.plan_type || "free";

        if (Object.keys(planMap).length > 0 && planMap[planType]) {
          const planEnabled = new Set(
            Object.entries(planMap[planType])
              .filter(([, enabled]) => enabled)
              .map(([key]) => key)
          );
          setEffectiveEnabledKeys(new Set([...globalEnabled].filter(k => planEnabled.has(k))));
        } else {
          setEffectiveEnabledKeys(globalEnabled);
        }
      } else {
        setEffectiveEnabledKeys(globalEnabled);
      }
    } catch {
      setSources(DEFAULT_SOURCES);
      setEnabledKeys(new Set(ALL_KEYS));
      setEffectiveEnabledKeys(new Set(ALL_KEYS));
      setUsingFallback(true);
      setUsingPlanFallback(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return {
    sources,
    enabledKeys,
    effectiveEnabledKeys,
    planSources,
    loading,
    usingFallback,
    usingPlanFallback,
    refetch: fetch,
  };
};
