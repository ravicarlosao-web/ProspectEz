import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchSources, type SearchSource } from "@/hooks/useSearchSources";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Globe, Instagram, Facebook, Linkedin, MapPin, Search, BookOpen,
  TrendingUp, Network, LayoutGrid, Music2, AlertTriangle, Copy, CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  "Empresas":        ["yellow_ao", "angolist", "verangola", "ao_domain", "google_maps", "facebook", "directorio", "geral"],
  "Websites/Social": ["linkedin", "instagram", "facebook", "google_maps", "ao_domain", "verangola", "directorio", "geral"],
  "Redes Sociais":   ["instagram", "facebook", "linkedin", "tiktok", "verangola", "geral"],
};

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS public.search_sources (
  key         text PRIMARY KEY,
  label       text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_enabled  boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0
);
ALTER TABLE public.search_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read search_sources"
  ON public.search_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage search_sources"
  ON public.search_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.search_sources (key, label, description, is_enabled, sort_order) VALUES
  ('yellow_ao','Yellow Pages Angola','site:yellow.co.ao — directório de empresas angolanas',true,1),
  ('angolist','Angolist','site:angolist.com — listagem de negócios em Angola',true,2),
  ('verangola','VerAngola','site:verangola.net — portal de empresas angolanas',true,3),
  ('ao_domain','Domínios .ao','Pesquisa em sites com domínio .ao e .co.ao',true,4),
  ('facebook','Facebook','site:facebook.com — páginas e grupos de empresas',true,5),
  ('instagram','Instagram','site:instagram.com — perfis de empresas',true,6),
  ('linkedin','LinkedIn','site:linkedin.com — perfis corporativos',true,7),
  ('tiktok','TikTok','site:tiktok.com — contas de empresas',true,8),
  ('google_maps','Google Maps','Pesquisa de empresas e localizações via Google Maps',true,9),
  ('directorio','Directório Angola','Listagens e directórios gerais de empresas angolanas',true,10),
  ('geral','Pesquisa Geral','Resultados gerais do Google sem site específico',true,11)
ON CONFLICT (key) DO NOTHING;`;

export function AdminSearchSources() {
  const { sources, loading, usingFallback, refetch } = useSearchSources();
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggle = async (source: SearchSource) => {
    if (usingFallback) {
      toast.error("Aplica primeiro o SQL no Supabase para guardar alterações.");
      return;
    }
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

  const copySql = () => {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setCopied(true);
      toast.success("SQL copiado! Cola no Supabase SQL Editor e clica Run.");
      setTimeout(() => setCopied(false), 3000);
    });
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
        <Badge
          variant={usingFallback ? "secondary" : enabledCount === sources.length ? "default" : "secondary"}
          className="text-sm px-3 py-1"
        >
          {usingFallback ? "Pré-visualização" : `${enabledCount}/${sources.length} activas`}
        </Badge>
      </div>

      {usingFallback && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Tabela não encontrada no Supabase</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p className="text-sm">
              A tabela <code className="rounded bg-muted px-1 py-0.5 text-xs">search_sources</code> ainda não existe.
              Estás a ver uma pré-visualização — os toggles estão desactivados até aplicares o SQL abaixo.
            </p>
            <Button size="sm" variant="outline" onClick={copySql} className="gap-2 border-amber-500/50">
              {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar SQL de configuração"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Cola o SQL no <strong>Supabase → SQL Editor</strong> e clica Run. Depois volta aqui e actualiza a página.
            </p>
          </AlertDescription>
        </Alert>
      )}

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
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${usingFallback ? "opacity-60" : "hover:bg-muted/40"}`}
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
                        disabled={saving === source.key || usingFallback}
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

      {!usingFallback && (
        <Card className="border-dashed">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Nota:</strong> As alterações aplicam-se imediatamente a todas as pesquisas seguintes.
              As pesquisas em curso não são afectadas. Desactivar uma fonte remove todas as queries
              associadas a essa plataforma em todos os tipos de pesquisa (Empresas, Websites e Redes Sociais).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
