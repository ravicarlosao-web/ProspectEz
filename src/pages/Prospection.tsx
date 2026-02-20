import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Globe, Loader2, ExternalLink, Phone, Mail, UserPlus, AlertTriangle, CheckCircle2, Instagram, TrendingUp, BarChart3, Users } from "lucide-react";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { supabase } from "@/integrations/supabase/client";
import { PROVINCES_ANGOLA } from "@/lib/constants";

type SearchResult = {
  url: string;
  title: string;
  description: string;
  markdown?: string;
};

type AnalyzedResult = SearchResult & {
  hasWebsite: boolean;
  businessName: string;
  contacts: { emails: string[]; phones: string[] };
};

type SocialAnalyzedResult = SearchResult & {
  businessName: string;
  contacts: { emails: string[]; phones: string[] };
  socialScore: number;
  socialIndicators: {
    hasInstagram: boolean;
    hasFacebook: boolean;
    hasTiktok: boolean;
    hasLinkedin: boolean;
    lowFollowers: boolean;
    irregularPosts: boolean;
    noProfessionalBio: boolean;
    noWebsiteLink: boolean;
  };
  socialProfiles: { platform: string; url: string }[];
};

type ScrapeResult = {
  markdown?: string;
  links?: string[];
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
};

const DIRECTORY_DOMAINS = [
  "facebook.com", "instagram.com", "tiktok.com", "linkedin.com",
  "yellow.co.ao", "yelp.com", "google.com/maps", "guiato.com",
  "tripadvisor.com", "paginas-amarelas", "directorio", "listagem",
];

const isDirectoryOrSocial = (url: string): boolean => {
  return DIRECTORY_DOMAINS.some((d) => url.toLowerCase().includes(d));
};

const SOCIAL_PLATFORMS = [
  { domain: "instagram.com", name: "Instagram", key: "hasInstagram" as const },
  { domain: "facebook.com", name: "Facebook", key: "hasFacebook" as const },
  { domain: "tiktok.com", name: "TikTok", key: "hasTiktok" as const },
  { domain: "linkedin.com", name: "LinkedIn", key: "hasLinkedin" as const },
];

const analyzeSocialPresence = (results: SearchResult[]): SocialAnalyzedResult[] => {
  const businessMap = new Map<string, { results: SearchResult[]; profiles: { platform: string; url: string }[] }>();

  // Group results by business
  for (const r of results) {
    const businessName = r.title?.replace(/\s*[-|–@].*$/, "").replace(/\(.*?\)/g, "").trim() || "Sem nome";
    const normalizedName = businessName.toLowerCase().replace(/[^a-záàâãéèêíïóôõúç\s]/g, "").trim();

    if (!businessMap.has(normalizedName)) {
      businessMap.set(normalizedName, { results: [], profiles: [] });
    }
    const entry = businessMap.get(normalizedName)!;
    entry.results.push(r);

    for (const platform of SOCIAL_PLATFORMS) {
      if (r.url.toLowerCase().includes(platform.domain)) {
        entry.profiles.push({ platform: platform.name, url: r.url });
      }
    }
  }

  const analyzed: SocialAnalyzedResult[] = [];

  for (const [, entry] of businessMap) {
    const mainResult = entry.results[0];
    const allMarkdown = entry.results.map(r => r.markdown || "").join(" ");
    const allDescription = entry.results.map(r => r.description || "").join(" ");
    const combinedText = (allMarkdown + " " + allDescription).toLowerCase();

    const indicators = {
      hasInstagram: entry.profiles.some(p => p.platform === "Instagram"),
      hasFacebook: entry.profiles.some(p => p.platform === "Facebook"),
      hasTiktok: entry.profiles.some(p => p.platform === "TikTok"),
      hasLinkedin: entry.profiles.some(p => p.platform === "LinkedIn"),
      lowFollowers: /(\d{1,3}\s*(seguidores|followers|likes))/i.test(combinedText) ||
                    !/(k\s*seguidores|k\s*followers|\d{4,}\s*(seguidores|followers))/i.test(combinedText),
      irregularPosts: !/(post|publicação|publicacao)/i.test(combinedText) ||
                      /(última publicação|last post).*(semana|mês|month|week|ago)/i.test(combinedText),
      noProfessionalBio: !/(serviço|service|contacto|horário|endereço|preço)/i.test(combinedText),
      noWebsiteLink: !/(\.co\.ao|\.com|\.ao|website|site)/i.test(combinedText) ||
                     entry.results.every(r => isDirectoryOrSocial(r.url)),
    };

    // Calculate social opportunity score (higher = better potential client)
    let score = 0;
    const platformCount = [indicators.hasInstagram, indicators.hasFacebook, indicators.hasTiktok, indicators.hasLinkedin].filter(Boolean).length;
    
    // Less platforms = more opportunity
    if (platformCount <= 1) score += 30;
    else if (platformCount === 2) score += 15;

    if (indicators.lowFollowers) score += 25;
    if (indicators.irregularPosts) score += 20;
    if (indicators.noProfessionalBio) score += 15;
    if (indicators.noWebsiteLink) score += 10;

    const contacts = extractContactInfoStatic(allMarkdown);

    analyzed.push({
      ...mainResult,
      businessName: mainResult.title?.replace(/\s*[-|–@].*$/, "").replace(/\(.*?\)/g, "").trim() || "Sem nome",
      contacts,
      socialScore: Math.min(score, 100),
      socialIndicators: indicators,
      socialProfiles: entry.profiles,
    });
  }

  return analyzed.sort((a, b) => b.socialScore - a.socialScore);
};

const extractContactInfoStatic = (markdown: string | undefined) => {
  if (!markdown) return { emails: [], phones: [] };
  const emails = markdown.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
  const phones = markdown.match(/\+?244[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g) || [];
  return {
    emails: [...new Set(emails)],
    phones: [...new Set(phones)],
  };
};

const getScoreColor = (score: number) => {
  if (score >= 70) return "text-green-600 bg-green-100";
  if (score >= 40) return "text-amber-600 bg-amber-100";
  return "text-muted-foreground bg-muted";
};

const getScoreLabel = (score: number) => {
  if (score >= 70) return "Alta Oportunidade";
  if (score >= 40) return "Média Oportunidade";
  return "Baixa Oportunidade";
};

const Prospection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProvince, setSearchProvince] = useState("");
  const [analyzedResults, setAnalyzedResults] = useState<AnalyzedResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Social Media states
  const [socialQuery, setSocialQuery] = useState("");
  const [socialProvince, setSocialProvince] = useState("");
  const [socialResults, setSocialResults] = useState<SocialAnalyzedResult[]>([]);
  const [isSearchingSocial, setIsSearchingSocial] = useState(false);

  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  const extractContactInfo = (markdown: string | undefined) => {
    return extractContactInfoStatic(markdown);
  };

  const analyzeResults = (results: SearchResult[]): AnalyzedResult[] => {
    return results.map((r) => {
      const noWebsite = isDirectoryOrSocial(r.url);
      const businessName = r.title?.replace(/\s*[-|–].*$/, "").trim() || "Sem nome";
      const contacts = extractContactInfo(r.markdown);
      return { ...r, hasWebsite: !noWebsite, businessName, contacts };
    }).sort((a, b) => {
      if (!a.hasWebsite && b.hasWebsite) return -1;
      if (a.hasWebsite && !b.hasWebsite) return 1;
      return 0;
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setAnalyzedResults([]);

    try {
      const province = searchProvince && searchProvince !== "all" ? searchProvince : "";
      const locationPart = province ? `${province} Angola` : "Angola";

      const queries = [
        `${searchQuery} ${locationPart} contacto telefone`,
        `${searchQuery} ${locationPart} site:facebook.com OR site:instagram.com`,
        `${searchQuery} ${locationPart} google maps endereço`,
      ];

      const searchPromises = queries.map((q) =>
        firecrawlApi.search(q, { limit: 15, lang: "pt", country: "ao" })
      );

      const responses = await Promise.allSettled(searchPromises);

      const allResults: SearchResult[] = [];
      const seenUrls = new Set<string>();

      for (const res of responses) {
        if (res.status === "fulfilled" && res.value.success && res.value.data) {
          for (const item of res.value.data) {
            if (!seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              allResults.push(item);
            }
          }
        }
      }

      if (allResults.length > 0) {
        const analyzed = analyzeResults(allResults);
        setAnalyzedResults(analyzed);

        const withoutSite = analyzed.filter((r) => !r.hasWebsite).length;
        toast.success(
          `${allResults.length} resultados — ${withoutSite} sem website próprio`
        );

        await supabase.from("prospection_logs").insert({
          query: queries[0],
          results_count: allResults.length,
          status: "completed",
        });
      } else {
        toast.error("Nenhum resultado encontrado. Tente outros termos.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erro ao pesquisar. Verifique a ligação.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSocialSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialQuery.trim()) return;

    setIsSearchingSocial(true);
    setSocialResults([]);

    try {
      const province = socialProvince && socialProvince !== "all" ? socialProvince : "";
      const locationPart = province ? `${province} Angola` : "Angola";

      // Search specifically for social media presence
      const queries = [
        `${socialQuery} ${locationPart} instagram facebook`,
        `${socialQuery} ${locationPart} site:instagram.com`,
        `${socialQuery} ${locationPart} site:facebook.com`,
        `${socialQuery} ${locationPart} redes sociais contacto`,
      ];

      const searchPromises = queries.map((q) =>
        firecrawlApi.search(q, { limit: 10, lang: "pt", country: "ao", scrapeOptions: { formats: ["markdown"] } })
      );

      const responses = await Promise.allSettled(searchPromises);

      const allResults: SearchResult[] = [];
      const seenUrls = new Set<string>();

      for (const res of responses) {
        if (res.status === "fulfilled" && res.value.success && res.value.data) {
          for (const item of res.value.data) {
            if (!seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              allResults.push(item);
            }
          }
        }
      }

      if (allResults.length > 0) {
        const analyzed = analyzeSocialPresence(allResults);
        setSocialResults(analyzed);

        const highOpp = analyzed.filter(r => r.socialScore >= 70).length;
        toast.success(`${analyzed.length} empresas analisadas — ${highOpp} com alta oportunidade de Social Media`);

        await supabase.from("prospection_logs").insert({
          query: `[SOCIAL] ${queries[0]}`,
          results_count: analyzed.length,
          status: "completed",
        });
      } else {
        toast.error("Nenhum resultado encontrado. Tente outros termos.");
      }
    } catch (error) {
      console.error("Social search error:", error);
      toast.error("Erro ao pesquisar. Verifique a ligação.");
    } finally {
      setIsSearchingSocial(false);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeUrl.trim()) return;

    setIsScraping(true);
    setScrapeResult(null);

    try {
      const response = await firecrawlApi.scrape(scrapeUrl, {
        formats: ["markdown", "links"],
        onlyMainContent: true,
      });

      if (response.success) {
        const result = response.data || response;
        setScrapeResult({
          markdown: result.data?.markdown || result.markdown,
          links: result.data?.links || result.links,
          metadata: result.data?.metadata || result.metadata,
        });
        toast.success("Website extraído com sucesso");
      } else {
        toast.error(response.error || "Erro ao extrair dados");
      }
    } catch (error) {
      console.error("Scrape error:", error);
      toast.error("Erro ao extrair. Verifique o URL.");
    } finally {
      setIsScraping(false);
    }
  };

  const saveAsLead = async (result: AnalyzedResult) => {
    setSavingUrl(result.url);
    try {
      const insertData: any = {
        name: result.businessName,
        company: result.businessName,
        website: result.hasWebsite ? result.url : null,
        notes: result.hasWebsite
          ? result.description
          : `Sem website próprio. Encontrado via: ${result.url}\n\n${result.description || ""}`,
        source: "firecrawl_prospection",
        service_type: "website",
        email: result.contacts.emails[0] || null,
        phone: result.contacts.phones[0] || null,
      };

      const { error } = await supabase.from("leads").insert(insertData);
      if (error) {
        toast.error("Erro ao guardar lead");
      } else {
        toast.success("Lead guardado como potencial cliente de website!");
      }
    } catch {
      toast.error("Erro ao guardar lead");
    } finally {
      setSavingUrl(null);
    }
  };

  const saveAsSocialLead = async (result: SocialAnalyzedResult) => {
    setSavingUrl(result.url);
    try {
      const platforms = result.socialProfiles.map(p => p.platform).join(", ");
      const indicators: string[] = [];
      if (result.socialIndicators.lowFollowers) indicators.push("Poucos seguidores");
      if (result.socialIndicators.irregularPosts) indicators.push("Publicações irregulares");
      if (result.socialIndicators.noProfessionalBio) indicators.push("Sem bio profissional");
      if (result.socialIndicators.noWebsiteLink) indicators.push("Sem link de website");

      const insertData: any = {
        name: result.businessName,
        company: result.businessName,
        website: result.socialProfiles.find(p => p.platform !== "Instagram" && p.platform !== "Facebook")?.url || null,
        notes: `🎯 Oportunidade Social Media (Score: ${result.socialScore}/100)\n\n` +
               `📊 Indicadores: ${indicators.join(", ") || "N/A"}\n` +
               `📱 Plataformas: ${platforms || "Nenhuma encontrada"}\n` +
               `${result.socialProfiles.map(p => `${p.platform}: ${p.url}`).join("\n")}\n\n` +
               `${result.description || ""}`,
        source: "firecrawl_social_prospection",
        service_type: "social_media",
        email: result.contacts.emails[0] || null,
        phone: result.contacts.phones[0] || null,
        social_instagram: result.socialProfiles.find(p => p.platform === "Instagram")?.url || null,
        social_facebook: result.socialProfiles.find(p => p.platform === "Facebook")?.url || null,
        social_tiktok: result.socialProfiles.find(p => p.platform === "TikTok")?.url || null,
        social_linkedin: result.socialProfiles.find(p => p.platform === "LinkedIn")?.url || null,
      };

      const { error } = await supabase.from("leads").insert(insertData);
      if (error) {
        toast.error("Erro ao guardar lead");
      } else {
        toast.success("Lead guardado como potencial cliente de Social Media!");
      }
    } catch {
      toast.error("Erro ao guardar lead");
    } finally {
      setSavingUrl(null);
    }
  };

  const noWebsiteCount = analyzedResults.filter((r) => !r.hasWebsite).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prospecção</h1>
        <p className="text-muted-foreground">
          Encontre empresas angolanas — potenciais clientes para Website e Social Media
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">
            <Search className="mr-2 h-4 w-4" />
            Websites
          </TabsTrigger>
          <TabsTrigger value="social">
            <Instagram className="mr-2 h-4 w-4" />
            Social Media
          </TabsTrigger>
          <TabsTrigger value="scrape">
            <Globe className="mr-2 h-4 w-4" />
            Analisar
          </TabsTrigger>
        </TabsList>

        {/* Website Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pesquisar Empresas Sem Website</CardTitle>
              <CardDescription>
                Pesquise por tipo de negócio e localização. Resultados em directórios e redes sociais indicam empresas sem site próprio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Tipo de Negócio</Label>
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ex: restaurante, clínica, salão de beleza..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Província</Label>
                    <Select value={searchProvince} onValueChange={setSearchProvince}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {PROVINCES_ANGOLA.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A pesquisar...</>
                  ) : (
                    <><Search className="mr-2 h-4 w-4" />Pesquisar</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {analyzedResults.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">{analyzedResults.length} resultados</span>
              {noWebsiteCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />{noWebsiteCount} sem website
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />{analyzedResults.length - noWebsiteCount} com website
              </Badge>
            </div>
          )}

          {analyzedResults.length > 0 && (
            <div className="space-y-3">
              {analyzedResults.map((result, i) => (
                <Card key={i} className={!result.hasWebsite ? "border-destructive/50 bg-destructive/5" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate">{result.businessName}</h4>
                          {!result.hasWebsite ? (
                            <Badge variant="destructive" className="text-xs gap-1 shrink-0">
                              <AlertTriangle className="h-3 w-3" />Sem Website
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                              <CheckCircle2 className="h-3 w-3" />Tem Website
                            </Badge>
                          )}
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.url}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {result.contacts.emails.slice(0, 2).map((email) => (
                            <Badge key={email} variant="outline" className="text-xs">
                              <Mail className="mr-1 h-3 w-3" />{email}
                            </Badge>
                          ))}
                          {result.contacts.phones.slice(0, 2).map((phone) => (
                            <Badge key={phone} variant="outline" className="text-xs">
                              <Phone className="mr-1 h-3 w-3" />{phone}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant={!result.hasWebsite ? "default" : "outline"} size="sm" onClick={() => saveAsLead(result)} disabled={savingUrl === result.url} className="shrink-0">
                        {savingUrl === result.url ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="mr-1 h-4 w-4" />Guardar</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Instagram className="h-5 w-5" />
                Prospecção de Social Media
              </CardTitle>
              <CardDescription>
                Encontre empresas com presença fraca nas redes sociais. O sistema analisa métricas como número de plataformas, actividade e profissionalismo do perfil para identificar oportunidades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSocialSearch} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Tipo de Negócio</Label>
                    <Input
                      value={socialQuery}
                      onChange={(e) => setSocialQuery(e.target.value)}
                      placeholder="Ex: restaurante, loja, ginásio, hotel..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Província</Label>
                    <Select value={socialProvince} onValueChange={setSocialProvince}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {PROVINCES_ANGOLA.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={isSearchingSocial}>
                  {isSearchingSocial ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A analisar redes sociais...</>
                  ) : (
                    <><TrendingUp className="mr-2 h-4 w-4" />Analisar Presença Social</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Social Results Summary */}
          {socialResults.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{socialResults.filter(r => r.socialScore >= 70).length}</div>
                  <p className="text-xs text-green-700 dark:text-green-400">Alta Oportunidade</p>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{socialResults.filter(r => r.socialScore >= 40 && r.socialScore < 70).length}</div>
                  <p className="text-xs text-amber-700 dark:text-amber-400">Média Oportunidade</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-muted-foreground">{socialResults.filter(r => r.socialScore < 40).length}</div>
                  <p className="text-xs text-muted-foreground">Baixa Oportunidade</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Social Results */}
          {socialResults.length > 0 && (
            <div className="space-y-3">
              {socialResults.map((result, i) => (
                <Card key={i} className={result.socialScore >= 70 ? "border-green-300 dark:border-green-700" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{result.businessName}</h4>
                          <Badge className={`text-xs gap-1 ${getScoreColor(result.socialScore)}`}>
                            <BarChart3 className="h-3 w-3" />
                            {result.socialScore}/100 — {getScoreLabel(result.socialScore)}
                          </Badge>
                        </div>

                        {/* Social Metrics */}
                        <div className="flex flex-wrap gap-1.5">
                          {result.socialIndicators.hasInstagram && (
                            <Badge variant="outline" className="text-xs">📸 Instagram</Badge>
                          )}
                          {result.socialIndicators.hasFacebook && (
                            <Badge variant="outline" className="text-xs">👤 Facebook</Badge>
                          )}
                          {result.socialIndicators.hasTiktok && (
                            <Badge variant="outline" className="text-xs">🎵 TikTok</Badge>
                          )}
                          {result.socialIndicators.hasLinkedin && (
                            <Badge variant="outline" className="text-xs">💼 LinkedIn</Badge>
                          )}
                        </div>

                        {/* Indicators */}
                        <div className="flex flex-wrap gap-1.5">
                          {result.socialIndicators.lowFollowers && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Users className="h-3 w-3" />Poucos seguidores
                            </Badge>
                          )}
                          {result.socialIndicators.irregularPosts && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              📅 Posts irregulares
                            </Badge>
                          )}
                          {result.socialIndicators.noProfessionalBio && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              ❌ Sem bio profissional
                            </Badge>
                          )}
                          {result.socialIndicators.noWebsiteLink && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              🔗 Sem website
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>

                        <div className="flex flex-wrap gap-2">
                          {result.contacts.emails.slice(0, 2).map((email) => (
                            <Badge key={email} variant="outline" className="text-xs">
                              <Mail className="mr-1 h-3 w-3" />{email}
                            </Badge>
                          ))}
                          {result.contacts.phones.slice(0, 2).map((phone) => (
                            <Badge key={phone} variant="outline" className="text-xs">
                              <Phone className="mr-1 h-3 w-3" />{phone}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant={result.socialScore >= 70 ? "default" : "outline"}
                        size="sm"
                        onClick={() => saveAsSocialLead(result)}
                        disabled={savingUrl === result.url}
                        className="shrink-0"
                      >
                        {savingUrl === result.url ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><UserPlus className="mr-1 h-4 w-4" />Guardar</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Scrape Tab */}
        <TabsContent value="scrape" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analisar Website Existente</CardTitle>
              <CardDescription>
                Verifique a qualidade de um website existente e extraia contactos para oferecer melhorias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScrape} className="space-y-4">
                <div className="space-y-2">
                  <Label>URL do Website</Label>
                  <Input
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    placeholder="https://exemplo.co.ao"
                    required
                  />
                </div>
                <Button type="submit" disabled={isScraping}>
                  {isScraping ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A analisar...</>
                  ) : (
                    <><Globe className="mr-2 h-4 w-4" />Analisar</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {scrapeResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {scrapeResult.metadata?.title || "Resultado da Análise"}
                </CardTitle>
                {scrapeResult.metadata?.sourceURL && (
                  <CardDescription>{scrapeResult.metadata.sourceURL}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const contacts = extractContactInfo(scrapeResult.markdown);
                  return (
                    <>
                      {(contacts.emails.length > 0 || contacts.phones.length > 0) && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Contactos Encontrados</h4>
                          <div className="flex flex-wrap gap-2">
                            {contacts.emails.map((email) => (
                              <Badge key={email} variant="secondary">
                                <Mail className="mr-1 h-3 w-3" />{email}
                              </Badge>
                            ))}
                            {contacts.phones.map((phone) => (
                              <Badge key={phone} variant="secondary">
                                <Phone className="mr-1 h-3 w-3" />{phone}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {scrapeResult.markdown && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Conteúdo Extraído</h4>
                          <div className="max-h-60 overflow-y-auto rounded-md border bg-muted/50 p-3">
                            <pre className="whitespace-pre-wrap text-xs">
                              {scrapeResult.markdown.slice(0, 3000)}
                              {scrapeResult.markdown.length > 3000 && "..."}
                            </pre>
                          </div>
                        </div>
                      )}

                      {scrapeResult.links && scrapeResult.links.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">
                            Links ({scrapeResult.links.length})
                          </h4>
                          <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/50 p-3 space-y-1">
                            {scrapeResult.links.slice(0, 20).map((link, i) => (
                              <a
                                key={i}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-primary hover:underline truncate"
                              >
                                {link}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Prospection;
