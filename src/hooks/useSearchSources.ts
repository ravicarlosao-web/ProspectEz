import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SearchSource = {
  key: string;
  label: string;
  description: string;
  is_enabled: boolean;
  sort_order: number;
};

export const useSearchSources = () => {
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data } = await supabase
      .from("search_sources" as any)
      .select("*")
      .order("sort_order");
    if (data) {
      setSources(data as SearchSource[]);
      setEnabledKeys(new Set((data as SearchSource[]).filter(s => s.is_enabled).map(s => s.key)));
    }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return { sources, enabledKeys, loading, refetch: fetch };
};
