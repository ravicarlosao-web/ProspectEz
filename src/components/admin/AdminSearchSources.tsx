import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useSearchSources, type SearchSource, type PlanSourceMap,
  DEFAULT_SOURCES, PLAN_LABELS, PLAN_COLORS,
} from "@/hooks/useSearchSources";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Globe, Instagram, Facebook, Linkedin, MapPin, Search, BookOpen,
  TrendingUp, Network, LayoutGrid, Music2, AlertTriangle, Copy, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  yellow_ao:   <BookOpen className="h-4 w-4 text-yellow-500" />,
  angolist:    <LayoutGrid className="h-4 w-4 text-blue-500" />,
  verangola:   <Globe className="h-4 w-4 text-green-600" />,
  ao_domain:   <Network className="h-4 w-4 text-indigo-500" />,
  facebook:    <Facebook className="h-4 w-4 text-blue-600" />,
  instagram:   <Instagram className="h-4 w-4 text-pink-500" />,
  linkedin:    <Linkedin className="h-4 w-4 text-blue-700" />,
  tiktok:      <Music2 className="h-4 w-4 text-black dark:text-white" />,
  google_maps: <MapPin className="h-4 w-4 text-red-500" />,
  directorio:  <Search className="h-4 w-4 text-orange-500" />,
  geral:       <TrendingUp className="h-4 w-4 text-gray-500" />,
};

const SOURCE_TABS: Record<string, string[]> = {
  "Empresas":        ["yellow_ao", "angolist", "verangola", "ao_domain", "google_maps", "facebook", "directorio", "geral"],
  "Websites/Social": ["linkedin", "instagram", "facebook", "google_maps", "ao_domain", "verangola", "directorio", "geral"],
  "Redes Sociais":   ["instagram", "facebook", "linkedin", "tiktok", "verangola", "geral"],
};

const PLANS = ["free", "starter", "pro", "business"];

const PLAN_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  free:     "secondary",
  starter:  "outline",
  pro:      "outline",
  business: "default",
};

const SETUP_SQL = `-- Migration 1: search_sources (fontes globais)
CREATE TABLE IF NOT EXISTS public.search_sources (
  key text PRIMARY KEY, label text NOT NULL,
  description text NOT NULL DEFAULT '', is_enabled boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.search_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read search_sources" ON public.search_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage search_sources" ON public.search_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.search_sources (key,label,description,is_enabled,sort_order) VALUES
('yellow_ao','Yellow Pages Angola','site:yellow.co.ao',true,1),('angolist','Angolist','site:angolist.com',true,2),
('verangola','VerAngola','site:verangola.net',true,3),('ao_domain','Domínios .ao','site:*.ao e .co.ao',true,4),
('facebook','Facebook','site:facebook.com',true,5),('instagram','Instagram','site:instagram.com',true,6),
('linkedin','LinkedIn','site:linkedin.com',true,7),('tiktok','TikTok','site:tiktok.com',true,8),
('google_maps','Google Maps','Google Maps',true,9),('directorio','Directório Angola','Directórios gerais',true,10),
('geral','Pesquisa Geral','Google geral',true,11) ON CONFLICT (key) DO NOTHING;

-- Migration 2: plan_search_sources (fontes por plano)
CREATE TABLE IF NOT EXISTS public.plan_search_sources (
  plan_type text NOT NULL, source_key text NOT NULL, is_enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (plan_type, source_key)
);
ALTER TABLE public.plan_search_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read plan_search_sources" ON public.plan_search_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage plan_search_sources" ON public.plan_search_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.plan_search_sources (plan_type,source_key,is_enabled)
SELECT p,s,true FROM (VALUES ('free'),('starter'),('pro'),('business')) AS plans(p)
CROSS JOIN (VALUES ('yellow_ao'),('angolist'),('verangola'),('ao_domain'),('facebook'),('instagram'),('linkedin'),('tiktok'),('google_maps'),('directorio'),('geral')) AS srcs(s)
ON CONFLICT (plan_type,source_key) DO NOTHING;`;

function SourceRow({
  source, enabled, disabled, onToggle, saving,
}: {
  source: SearchSource; enabled: boolean; disabled: boolean;
  onToggle: () => void; saving: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${disabled ? "opacity-60" : "hover:bg-muted/40"}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          {SOURCE_ICONS[source.key] ?? <Globe className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="font-medium text-sm">{source.label}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={enabled ? "default" : "secondary"} className="text-xs hidden sm:inline-flex">
          {enabled ? "Activa" : "Inactiva"}
        </Badge>
        <Switch checked={enabled} disabled={saving || disabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

export function AdminSearchSources() {
  const { sources, planSources, loading, usingFallback, usingPlanFallback, refetch } = useSearchSources();
  const [savingGlobal, setSavingGlobal] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleGlobal = async (source: SearchSource) => {
    if (usingFallback) { toast.error("Aplica primeiro o SQL no Supabase."); return; }
    setSavingGlobal(source.key);
    const { error } = await supabase.from("search_sources" as any)
      .update({ is_enabled: !source.is_enabled }).eq("key", source.key);
    if (error) toast.error(`Erro: ${error.message}`);
    else { toast.success(`"${source.label}" ${!source.is_enabled ? "activada" : "desactivada"}`); await refetch(); }
    setSavingGlobal(null);
  };

  const togglePlan = async (planType: string, sourceKey: string, currentEnabled: boolean) => {
    if (usingPlanFallback) { toast.error("Aplica primeiro o SQL no Supabase."); return; }
    const label = DEFAULT_SOURCES.find(s => s.key === sourceKey)?.label ?? sourceKey;
    setSavingPlan(`${planType}:${sourceKey}`);
    const { error } = await supabase.from("plan_search_sources" as any)
      .update({ is_enabled: !currentEnabled })
      .eq("plan_type", planType).eq("source_key", sourceKey);
    if (error) toast.error(`Erro: ${error.message}`);
    else { toast.success(`"${label}" ${!currentEnabled ? "activada" : "desactivada"} no plano ${PLAN_LABELS[planType]}`); await refetch(); }
    setSavingPlan(null);
  };

  const copySql = () => {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setCopied(true);
      toast.success("SQL copiado! Cola no Supabase SQL Editor e clica Run.");
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const sourceMap = new Map(sources.map(s => [s.key, s]));
  const enabledGlobalCount = sources.filter(s => s.is_enabled).length;
  const needsSetup = usingFallback || usingPlanFallback;

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
            Controla as plataformas usadas nas pesquisas — globalmente e por plano de subscrição.
          </p>
        </div>
        {!usingFallback && (
          <Badge variant={enabledGlobalCount === sources.length ? "default" : "secondary"} className="text-sm px-3 py-1">
            {enabledGlobalCount}/{sources.length} globais activas
          </Badge>
        )}
      </div>

      {needsSetup && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">
            {usingFallback ? "Tabelas não encontradas no Supabase" : "Tabela de planos não encontrada"}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p className="text-sm">
              {usingFallback
                ? "As tabelas search_sources e plan_search_sources ainda não existem. Estás em modo de pré-visualização."
                : "A tabela plan_search_sources ainda não existe. O controlo por plano não está disponível."}
            </p>
            <Button size="sm" variant="outline" onClick={copySql} className="gap-2 border-amber-500/50">
              {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar SQL completo (ambas as tabelas)"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="global">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="global" className="flex-1 sm:flex-none">Fontes Globais</TabsTrigger>
          <TabsTrigger value="plans" className="flex-1 sm:flex-none">Por Plano</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: GLOBAL ── */}
        <TabsContent value="global" className="mt-6 space-y-5">
          {Object.entries(SOURCE_TABS).map(([tabName, keys]) => {
            const tabSources = keys
              .map(k => sourceMap.get(k)).filter(Boolean) as SearchSource[];
            const uniqueSources = tabSources.filter((s, i, arr) => arr.findIndex(x => x.key === s.key) === i);
            return (
              <Card key={tabName}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{tabName}</CardTitle>
                  <CardDescription>Fontes usadas na pesquisa de {tabName.toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {uniqueSources.map(source => (
                    <SourceRow
                      key={source.key}
                      source={source}
                      enabled={source.is_enabled}
                      disabled={usingFallback}
                      saving={savingGlobal === source.key}
                      onToggle={() => toggleGlobal(source)}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">
                <strong>Fontes Globais</strong> são o interruptor mestre — desactivar uma fonte aqui remove-a
                de <em>todos</em> os planos, independentemente do que estiver configurado por plano.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: POR PLANO ── */}
        <TabsContent value="plans" className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            {PLANS.map(planType => {
              const planMap = planSources[planType] ?? {};
              const planLabel = PLAN_LABELS[planType];
              const planColor = PLAN_COLORS[planType];
              const enabledCount = DEFAULT_SOURCES.filter(s => planMap[s.key] !== false).length;
              return (
                <Card key={planType}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-base ${planColor}`}>{planLabel}</CardTitle>
                      <Badge variant={PLAN_BADGE_VARIANT[planType]} className="text-xs">
                        {usingPlanFallback ? "Pré-visualização" : `${enabledCount}/${DEFAULT_SOURCES.length} activas`}
                      </Badge>
                    </div>
                    <CardDescription>
                      Fontes disponíveis para utilizadores do plano {planLabel}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {DEFAULT_SOURCES.map(source => {
                      const enabled = planMap[source.key] !== false;
                      return (
                        <SourceRow
                          key={source.key}
                          source={source}
                          enabled={enabled}
                          disabled={usingPlanFallback}
                          saving={savingPlan === `${planType}:${source.key}`}
                          onToggle={() => togglePlan(planType, source.key, enabled)}
                        />
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">
                <strong>Por Plano</strong> permite restringir fontes por nível de subscrição.
                Uma fonte só aparece numa pesquisa se estiver activa <em>tanto globalmente como no plano do utilizador</em>.
                Exemplo: podes reservar LinkedIn e TikTok apenas para planos Pro e Business.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
