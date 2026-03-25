import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchSources, type SearchSource } from "@/hooks/useSearchSources";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Globe, Instagram, Facebook, Linkedin, MapPin, Search, BookOpen,
  TrendingUp, Network, LayoutGrid, Music2
} from "lucide-react";

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  yellow_ao:   <BookOpen className="h-5 w-5 text-yellow-500" />,
  angolist:    <LayoutGrid className="h-5 w-5 text-blue-500" />,
  verangola:   <Globe className="h-5 w-5 text-green-600" />,
  ao_domain:   <Network className="h-5 w-5 text-indigo-500" />,
  facebook:    <Facebook className="h-5 w-5 text-blue-600" />,
  instagram:   <Instagram className="h-5 w-5 text-pink-500" />,
  linkedin:    <Linkedin className="h-5 w-5 text-blue-700" />,
  tiktok:      <Music2 className="h-5 w-5 text-black dark:text-white" />,
  google_maps: <MapPin className="h-5 w-5 text-red-500" />,
  directorio:  <Search className="h-5 w-5 text-orange-500" />,
  geral:       <TrendingUp className="h-5 w-5 text-gray-500" />,
};

const SOURCE_TABS: Record<string, string[]> = {
  "Empresas":       ["yellow_ao", "angolist", "verangola", "ao_domain", "google_maps", "facebook", "directorio", "geral"],
  "Websites/Social": ["linkedin", "instagram", "facebook", "google_maps", "ao_domain", "verangola", "directorio", "geral"],
  "Redes Sociais":  ["instagram", "facebook", "linkedin", "tiktok", "verangola", "geral"],
};

export function AdminSearchSources() {
  const { sources, loading, refetch } = useSearchSources();
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (source: SearchSource) => {
    setSaving(source.key);
    const { error } = await supabase
      .from("search_sources" as any)
      .update({ is_enabled: !source.is_enabled })
      .eq("key", source.key);

    if (error) {
      toast.error(`Erro ao actualizar "${source.label}": ${error.message}`);
    } else {
      toast.success(`"${source.label}" ${!source.is_enabled ? "activada" : "desactivada"}`);
      await refetch();
    }
    setSaving(null);
  };

  const sourceMap = new Map(sources.map(s => [s.key, s]));
  const enabledCount = sources.filter(s => s.is_enabled).length;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fontes de Pesquisa</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controla quais as plataformas usadas nas pesquisas. Desactivar uma fonte remove-a de todos os tipos de pesquisa.
          </p>
        </div>
        <Badge variant={enabledCount === sources.length ? "default" : "secondary"} className="text-sm px-3 py-1">
          {enabledCount}/{sources.length} activas
        </Badge>
      </div>

      <div className="grid gap-6">
        {Object.entries(SOURCE_TABS).map(([tabName, keys]) => {
          const tabSources = keys.map(k => sourceMap.get(k)).filter(Boolean) as SearchSource[];
          const uniqueSources = tabSources.filter((s, i, arr) => arr.findIndex(x => x.key === s.key) === i);
          return (
            <Card key={tabName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{tabName}</CardTitle>
                <CardDescription>
                  Fontes utilizadas na pesquisa de {tabName.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {uniqueSources.map(source => (
                  <div
                    key={source.key}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/40"
                    data-testid={`source-row-${source.key}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                        {SOURCE_ICONS[source.key] ?? <Globe className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm leading-none">{source.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{source.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={source.is_enabled ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {source.is_enabled ? "Activa" : "Inactiva"}
                      </Badge>
                      <Switch
                        checked={source.is_enabled}
                        disabled={saving === source.key}
                        onCheckedChange={() => toggle(source)}
                        data-testid={`toggle-source-${source.key}`}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Nota:</strong> As alterações aplicam-se imediatamente a todas as pesquisas seguintes.
            As pesquisas em curso não são afectadas. Desactivar uma fonte remove todas as queries
            associadas a essa plataforma em todos os tipos de pesquisa (Empresas, Websites e Redes Sociais).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
