import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Globe, Loader2, ExternalLink, Phone, Mail, UserPlus, AlertTriangle, CheckCircle2 } from "lucide-react";
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

const Prospection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProvince, setSearchProvince] = useState("");
  const [analyzedResults, setAnalyzedResults] = useState<AnalyzedResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  const extractContactInfo = (markdown: string | undefined) => {
    if (!markdown) return { emails: [], phones: [] };
    const emails = markdown.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
    const phones = markdown.match(/\+?244[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g) || [];
    return {
      emails: [...new Set(emails)],
      phones: [...new Set(phones)],
    };
  };

  const analyzeResults = (results: SearchResult[]): AnalyzedResult[] => {
    return results.map((r) => {
      const noWebsite = isDirectoryOrSocial(r.url);
      const businessName = r.title?.replace(/\s*[-|–].*$/, "").trim() || "Sem nome";
      const contacts = extractContactInfo(r.markdown);
      return { ...r, hasWebsite: !noWebsite, businessName, contacts };
    }).sort((a, b) => {
      // Prioritize businesses WITHOUT websites
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
      // Search for businesses in directories/social media (likely without own website)
      const query = `${searchQuery} ${locationPart} contacto telefone`;

      const response = await firecrawlApi.search(query, {
        limit: 10,
        lang: "pt",
        country: "ao",
      });

      if (response.success && response.data) {
        const analyzed = analyzeResults(response.data);
        setAnalyzedResults(analyzed);

        const withoutSite = analyzed.filter((r) => !r.hasWebsite).length;
        toast.success(
          `${response.data.length} resultados — ${withoutSite} sem website próprio`
        );

        await supabase.from("prospection_logs").insert({
          query,
          results_count: response.data.length,
          status: "completed",
        });
      } else {
        toast.error(response.error || "Erro na pesquisa");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erro ao pesquisar. Verifique a ligação.");
    } finally {
      setIsSearching(false);
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

  const noWebsiteCount = analyzedResults.filter((r) => !r.hasWebsite).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prospecção de Websites</h1>
        <p className="text-muted-foreground">
          Encontre empresas angolanas sem website — potenciais clientes para o serviço de criação de sites
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">
            <Search className="mr-2 h-4 w-4" />
            Encontrar Empresas
          </TabsTrigger>
          <TabsTrigger value="scrape">
            <Globe className="mr-2 h-4 w-4" />
            Analisar Website
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
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
                      placeholder="Ex: restaurante, clínica, salão de beleza, oficina..."
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

          {/* Results Summary */}
          {analyzedResults.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {analyzedResults.length} resultados
              </span>
              {noWebsiteCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {noWebsiteCount} sem website
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {analyzedResults.length - noWebsiteCount} com website
              </Badge>
            </div>
          )}

          {/* Search Results */}
          {analyzedResults.length > 0 && (
            <div className="space-y-3">
              {analyzedResults.map((result, i) => (
                <Card
                  key={i}
                  className={!result.hasWebsite ? "border-destructive/50 bg-destructive/5" : ""}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate">{result.businessName}</h4>
                          {!result.hasWebsite ? (
                            <Badge variant="destructive" className="text-xs gap-1 shrink-0">
                              <AlertTriangle className="h-3 w-3" />
                              Sem Website
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                              <CheckCircle2 className="h-3 w-3" />
                              Tem Website
                            </Badge>
                          )}
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.description}
                        </p>
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
                      <Button
                        variant={!result.hasWebsite ? "default" : "outline"}
                        size="sm"
                        onClick={() => saveAsLead(result)}
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
