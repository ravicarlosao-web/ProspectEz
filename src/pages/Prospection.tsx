import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabsContent as TabsContent } from "@/components/ui/animated-tabs-content";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Globe, Loader2, ExternalLink, Phone, Mail, UserPlus, AlertTriangle, CheckCircle2, Instagram, TrendingUp, BarChart3, Users, Filter, MapPin } from "lucide-react";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { supabase } from "@/integrations/supabase/client";
import { PROVINCES_ANGOLA, MUNICIPIOS_LUANDA } from "@/lib/constants";
import { TokenExhaustedDialog } from "@/components/TokenExhaustedDialog";

type SearchResult = {
  url: string;
  title: string;
  description: string;
  markdown?: string;
};

type AnalyzedResult = SearchResult & {
  hasWebsite: boolean;
  websiteUrl: string | null; // URL do website próprio se existir
  businessName: string;
  contacts: { emails: string[]; phones: string[] };
  sources: string[];
  alreadySaved: boolean;
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
  sources: string[];
  alreadySaved: boolean;
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
  "verangola.net", "angolist.com",
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

const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  google_maps: "Google Maps",
  facebook: "Facebook",
  instagram: "Instagram",
  verangola: "VerAngola",
  geral: "Google",
  directorio: "Directório",
};

// Normalize business name for dedup - remove suffixes like Lda, SA, etc.
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s*[-|–@].*$/, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\b(lda|limitada|sa|sarl|ep|srl|s\.a\.?|l\.da\.?|unipessoal)\b/gi, "")
    .replace(/[^a-záàâãéèêíïóôõúç\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Extract domain from URL for dedup
const extractDomain = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return hostname.replace(/^www\./, "").toLowerCase();
  } catch { return null; }
};

// Normalize phone to last 9 digits for comparison
const normalizePhone = (phone: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : null;
};

// Simple fuzzy match: check if two names overlap significantly
const fuzzyMatch = (a: string, b: string): boolean => {
  if (!a || !b || a.length < 3 || b.length < 3) return false;
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = na.split(" ").filter(w => w.length > 2);
  const wordsB = nb.split(" ").filter(w => w.length > 2);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const common = wordsA.filter(w => wordsB.includes(w)).length;
  const maxLen = Math.max(wordsA.length, wordsB.length);
  return common / maxLen >= 0.7;
};

type ExistingLeadData = {
  names: Set<string>;
  emails: Set<string>;
  phones: Set<string>;
  domains: Set<string>;
  rawNames: string[];
};

// Extract source from URL
const detectSource = (url: string): string => {
  const u = url.toLowerCase();
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("google.com/maps") || u.includes("goo.gl/maps") || u.includes("maps.google")) return "google_maps";
  if (u.includes("facebook.com")) return "facebook";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("verangola.net")) return "verangola";
  if (isDirectoryOrSocial(u)) return "directorio";
  return "geral";
};

// Enhanced contact extraction with broader patterns
const extractContactInfoStatic = (text: string | undefined) => {
  if (!text) return { emails: [], phones: [] };

  const emails = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/g) || [];

  // Multiple phone patterns for Angola — with context guard to reduce false positives
  const phonePatterns = [
    /(?:tel|tlm|phone|contacto|fone|whatsapp)?[\s:]*\+?244[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/gi,
    /(?:tel|tlm|phone|contacto|fone|whatsapp)?[\s:]*\b9[1-9]\d[\s.-]?\d{3}[\s.-]?\d{3}\b/gi,
    /(?:tel|tlm|phone|contacto|fone|whatsapp)?[\s:]*\b2[2-9]\d[\s.-]?\d{3}[\s.-]?\d{3}\b/gi,
  ];

  const phones: string[] = [];
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern) || [];
    // Clean matched string to just the number part
    const cleaned = matches.map(m => m.replace(/^[^\d+]*/,"").trim());
    phones.push(...cleaned);
  }

  return {
    emails: [...new Set(emails.filter(e => !e.includes("@example") && !e.includes("@sentry")))],
    phones: [...new Set(phones)],
  };
};

// ============================================================
// CORRECÇÃO PRINCIPAL: detectar se empresa tem website próprio
// Verifica TODOS os resultados agrupados e o texto/markdown,
// não apenas o URL do resultado principal.
// ============================================================
const detectHasOwnWebsite = (
  results: SearchResult[]
): { hasWebsite: boolean; websiteUrl: string | null } => {
  // 1. Algum dos resultados agrupados tem URL de website próprio?
  const ownSiteResult = results.find(r => !isDirectoryOrSocial(r.url));
  if (ownSiteResult) {
    return { hasWebsite: true, websiteUrl: ownSiteResult.url };
  }

  // 2. O texto/markdown menciona um domínio próprio (.co.ao, .com, .ao, www.)?
  const allText = results
    .map(r => `${r.markdown || ""} ${r.description || ""}`)
    .join(" ");

  // Extrair URLs mencionadas no conteúdo que não sejam redes sociais/directórios
  const urlMentions = allText.match(/https?:\/\/[^\s"')>]+/g) || [];
  const ownUrlMention = urlMentions.find(u => !isDirectoryOrSocial(u));
  if (ownUrlMention) {
    return { hasWebsite: true, websiteUrl: ownUrlMention };
  }

  // 3. Menciona domínio sem protocolo (ex: "www.empresa.co.ao")
  const domainMention = allText.match(/\bwww\.[a-z0-9.-]+\.(co\.ao|com|ao|net|org)\b/gi);
  if (domainMention) {
    return { hasWebsite: true, websiteUrl: `https://${domainMention[0]}` };
  }

  return { hasWebsite: false, websiteUrl: null };
};

const analyzeSocialPresence = (
  results: SearchResult[],
  dedupCheck: (name: string, contacts: { emails: string[]; phones: string[] }, url?: string) => boolean
): SocialAnalyzedResult[] => {
  const businessMap = new Map<string, {
    results: SearchResult[];
    profiles: { platform: string; url: string }[];
    sources: Set<string>;
  }>();

  for (const r of results) {
    const rawName = r.title?.replace(/\s*[-|–@].*$/, "").replace(/\(.*?\)/g, "").trim() || "Sem nome";
    const normalizedName = normalizeName(rawName);

    if (!normalizedName || normalizedName.length < 2) continue;

    let key = normalizedName;
    for (const existingKey of businessMap.keys()) {
      if (fuzzyMatch(rawName, existingKey) || fuzzyMatch(normalizedName, existingKey)) {
        key = existingKey;
        break;
      }
    }

    if (!businessMap.has(key)) {
      businessMap.set(key, { results: [], profiles: [], sources: new Set() });
    }
    const entry = businessMap.get(key)!;
    entry.results.push(r);
    entry.sources.add(detectSource(r.url));

    for (const platform of SOCIAL_PLATFORMS) {
      if (r.url.toLowerCase().includes(platform.domain)) {
        if (!entry.profiles.some(p => p.platform === platform.name)) {
          entry.profiles.push({ platform: platform.name, url: r.url });
        }
      }
    }
  }

  const analyzed: SocialAnalyzedResult[] = [];

  for (const [, entry] of businessMap) {
    const mainResult = entry.results[0];
    const allText = entry.results.map(r => `${r.markdown || ""} ${r.description || ""}`).join(" ");
    const combinedText = allText.toLowerCase();

    // Usar detectHasOwnWebsite para o indicador noWebsiteLink
    const { hasWebsite: hasOwnWebsite } = detectHasOwnWebsite(entry.results);

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
      noWebsiteLink: !hasOwnWebsite,
    };

    let score = 0;
    const platformCount = [indicators.hasInstagram, indicators.hasFacebook, indicators.hasTiktok, indicators.hasLinkedin].filter(Boolean).length;
    if (platformCount <= 1) score += 30;
    else if (platformCount === 2) score += 15;
    if (indicators.lowFollowers) score += 25;
    if (indicators.irregularPosts) score += 20;
    if (indicators.noProfessionalBio) score += 15;
    if (indicators.noWebsiteLink) score += 10;

    const contacts = extractContactInfoStatic(allText);
    const alreadySaved = dedupCheck(
      mainResult.title?.replace(/\s*[-|–@].*$/, "").replace(/\(.*?\)/g, "").trim() || "Sem nome",
      contacts
    );

    analyzed.push({
      ...mainResult,
      businessName: mainResult.title?.replace(/\s*[-|–@].*$/, "").replace(/\(.*?\)/g, "").trim() || "Sem nome",
      contacts,
      socialScore: Math.min(score, 100),
      socialIndicators: indicators,
      socialProfiles: entry.profiles,
      sources: [...entry.sources],
      alreadySaved,
    });
  }

  return analyzed.sort((a, b) => {
    if (a.alreadySaved !== b.alreadySaved) return a.alreadySaved ? 1 : -1;
    return b.socialScore - a.socialScore;
  });
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

const RESULTS_PER_PAGE = 10;

const Prospection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProvince, setSearchProvince] = useState("");
  const [searchMunicipio, setSearchMunicipio] = useState("");
  // All fetched results (raw pool), visible results limited by page
  const [allAnalyzedResults, setAllAnalyzedResults] = useState<AnalyzedResult[]>([]);
  const [visibleCount, setVisibleCount] = useState(RESULTS_PER_PAGE);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [socialQuery, setSocialQuery] = useState("");
  const [socialProvince, setSocialProvince] = useState("");
  const [socialMunicipio, setSocialMunicipio] = useState("");
  const [socialPostRegularity, setSocialPostRegularity] = useState("");
  const [socialEngagementRate, setSocialEngagementRate] = useState("");
  const [allSocialResults, setAllSocialResults] = useState<SocialAnalyzedResult[]>([]);
  const [socialVisibleCount, setSocialVisibleCount] = useState(RESULTS_PER_PAGE);
  const [isSearchingSocial, setIsSearchingSocial] = useState(false);
  const [isLoadingMoreSocial, setIsLoadingMoreSocial] = useState(false);

  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  const [savingUrls, setSavingUrls] = useState<Set<string>>(new Set());
  const [existingLeads, setExistingLeads] = useState<ExistingLeadData>({
    names: new Set(),
    emails: new Set(),
    phones: new Set(),
    domains: new Set(),
    rawNames: [],
  });
  const [searchProgress, setSearchProgress] = useState("");
  const [showTokenExhausted, setShowTokenExhausted] = useState(false);
  const [exhaustedType, setexhaustedType] = useState<"weekly" | "monthly">("weekly");

  // Derived slices for rendering
  const analyzedResults = allAnalyzedResults.slice(0, visibleCount);
  const socialResults = allSocialResults.slice(0, socialVisibleCount);

  const loadExistingLeads = useCallback(async () => {
    const { data } = await supabase
      .from("leads")
      .select("name, company, email, phone, website, social_facebook, social_instagram");
    if (data) {
      const names = new Set<string>();
      const emails = new Set<string>();
      const phones = new Set<string>();
      const domains = new Set<string>();
      const rawNames: string[] = [];
      for (const lead of data) {
        if (lead.name) { names.add(normalizeName(lead.name)); rawNames.push(lead.name); }
        if (lead.company) { names.add(normalizeName(lead.company)); rawNames.push(lead.company); }
        if (lead.email) emails.add(lead.email.toLowerCase().trim());
        const normPhone = normalizePhone(lead.phone);
        if (normPhone) phones.add(normPhone);
        const domain = extractDomain(lead.website);
        if (domain && !DIRECTORY_DOMAINS.some(d => domain.includes(d))) domains.add(domain);
      }
      setExistingLeads({ names, emails, phones, domains, rawNames });
    }
  }, []);

  useEffect(() => {
    loadExistingLeads();
  }, [loadExistingLeads]);

  const isAlreadySaved = useCallback(
    (name: string, contacts: { emails: string[]; phones: string[] }, url?: string): boolean => {
      const normalized = normalizeName(name);
      if (existingLeads.names.has(normalized)) return true;
      if (contacts.emails.some(e => existingLeads.emails.has(e.toLowerCase().trim()))) return true;
      if (contacts.phones.some(p => {
        const np = normalizePhone(p);
        return np ? existingLeads.phones.has(np) : false;
      })) return true;
      if (url) {
        const domain = extractDomain(url);
        if (domain && !DIRECTORY_DOMAINS.some(d => domain.includes(d)) && existingLeads.domains.has(domain)) return true;
      }
      if (existingLeads.rawNames.some(rn => fuzzyMatch(name, rn))) return true;
      return false;
    },
    [existingLeads]
  );

  const findExistingKey = (
    businessMap: Map<string, { results: SearchResult[]; sources: Set<string> }>,
    normalized: string,
    rawName: string
  ): string | null => {
    if (businessMap.has(normalized)) return normalized;
    for (const key of businessMap.keys()) {
      if (fuzzyMatch(rawName, key) || fuzzyMatch(normalized, key)) return key;
    }
    return null;
  };

  const analyzeResults = useCallback(
    (results: SearchResult[]): AnalyzedResult[] => {
      const businessMap = new Map<string, {
        results: SearchResult[];
        sources: Set<string>;
      }>();

      for (const r of results) {
        const rawName = r.title?.replace(/\s*[-|–].*$/, "").replace(/\(.*?\)/g, "").trim() || "Sem nome";
        const normalized = normalizeName(rawName);
        if (!normalized || normalized.length < 2) continue;

        const existingKey = findExistingKey(businessMap, normalized, rawName);
        const key = existingKey || normalized;

        if (!businessMap.has(key)) {
          businessMap.set(key, { results: [], sources: new Set() });
        }
        const entry = businessMap.get(key)!;
        entry.results.push(r);
        entry.sources.add(detectSource(r.url));
      }

      const analyzed: AnalyzedResult[] = [];

      for (const [, entry] of businessMap) {
        const mainResult = entry.results[0];
        const allText = entry.results
          .map(r => `${r.markdown || ""} ${r.description || ""}`)
          .join(" ");

        // ============================================================
        // CORRECÇÃO APLICADA: usar detectHasOwnWebsite que verifica
        // TODOS os resultados agrupados + texto/markdown, não apenas
        // o URL do resultado principal.
        // ============================================================
        const { hasWebsite, websiteUrl } = detectHasOwnWebsite(entry.results);

        const contacts = extractContactInfoStatic(allText);
        const businessName =
          mainResult.title?.replace(/\s*[-|–].*$/, "").trim() || "Sem nome";

        // Para dedup de domínio, usar o websiteUrl próprio se existir
        const alreadySaved = isAlreadySaved(
          businessName,
          contacts,
          websiteUrl ?? undefined
        );

        analyzed.push({
          ...mainResult,
          hasWebsite,
          websiteUrl,
          businessName,
          contacts,
          sources: [...entry.sources],
          alreadySaved,
        });
      }

      return analyzed.sort((a, b) => {
        if (a.alreadySaved !== b.alreadySaved) return a.alreadySaved ? 1 : -1;
        if (!a.hasWebsite && b.hasWebsite) return -1;
        if (a.hasWebsite && !b.hasWebsite) return 1;
        return b.sources.length - a.sources.length;
      });
    },
    [isAlreadySaved]
  );

  // ==================== QUOTA HELPERS ====================
  const consumeResults = async (count: number): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: quota, error: fetchError } = await supabase
      .from("search_quotas")
      .select("used_this_week, weekly_limit, used_this_month, monthly_limit, tokens_added_manually")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !quota) return false;

    const weeklyMax = (quota.weekly_limit || 0) + (quota.tokens_added_manually || 0);
    const monthlyMax = (quota.monthly_limit || 0) + (quota.tokens_added_manually || 0);

    // Only enforce weekly limit when it's actually configured (> 0)
    if (weeklyMax > 0 && quota.used_this_week + count > weeklyMax) {
      setexhaustedType("weekly");
      setShowTokenExhausted(true);
      return false;
    }

    // Only enforce monthly limit when it's actually configured (> 0)
    if (monthlyMax > 0 && quota.used_this_month + count > monthlyMax) {
      setexhaustedType("monthly");
      setShowTokenExhausted(true);
      return false;
    }

    const { error: updateError } = await supabase
      .from("search_quotas")
      .update({
        used_this_week: quota.used_this_week + count,
        used_this_month: quota.used_this_month + count,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Quota update failed:", updateError.message);
      return false;
    }

    return true;
  };

  // ==================== WEBSITE SEARCH ====================
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Consume 10 results for this search
    const ok = await consumeResults(RESULTS_PER_PAGE);
    if (!ok) return;

    setIsSearching(true);
    setAllAnalyzedResults([]);
    setVisibleCount(RESULTS_PER_PAGE);

    try {
      const province = searchProvince && searchProvince !== "all" ? searchProvince : "";
      const municipio = searchMunicipio && searchMunicipio !== "all" ? searchMunicipio : "";
      const locationParts = [];
      if (municipio) locationParts.push(municipio);
      if (province) locationParts.push(province);
      const locationPart = locationParts.length > 0 ? `${locationParts.join(" ")} Angola` : "Angola";
      const q = searchQuery.trim();

      setSearchProgress("A pesquisar empresas...");
      const queries = [
        { q: `${q} ${locationPart} site:linkedin.com/company`, source: "linkedin" },
        { q: `${q} ${locationPart} site:instagram.com empresa conta perfil`, source: "instagram" },
        { q: `${q} ${locationPart} site:facebook.com página empresa sobre contacto`, source: "facebook" },
        { q: `${q} ${locationPart} google maps contacto endereço telefone`, source: "google_maps" },
        { q: `${q} ${locationPart} empresa website oficial contacto telefone email`, source: "geral" },
        { q: `${q} ${locationPart} site:*.co.ao OR site:*.ao empresa`, source: "geral" },
        { q: `${q} ${locationPart} site:verangola.net empresa`, source: "verangola" },
        { q: `${q} Angola directório empresas lista negócio`, source: "directorio" },
      ];

      const allResults: SearchResult[] = [];
      const seenUrls = new Set<string>();

      for (let i = 0; i < queries.length; i += 3) {
        const batch = queries.slice(i, i + 3);
        setSearchProgress(`A pesquisar em ${batch.map(b => SOURCE_LABELS[b.source]).join(", ")}...`);

        const batchPromises = batch.map(({ q: bq }) =>
          firecrawlApi.search(bq, { limit: 15, lang: "pt", country: "ao" })
        );

        const responses = await Promise.allSettled(batchPromises);

        for (const res of responses) {
          if (res.status === "fulfilled" && res.value.success && res.value.data) {
            for (const item of res.value.data) {
              const normalizedUrl = item.url?.toLowerCase().replace(/\/$/, "");
              if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
                seenUrls.add(normalizedUrl);
                allResults.push(item);
              }
            }
          }
        }
      }

      setSearchProgress("");

      if (allResults.length > 0) {
        // Hard cap: deliver exactly RESULTS_PER_PAGE (10) results, no more
        const analyzed = analyzeResults(allResults).slice(0, RESULTS_PER_PAGE);
        setAllAnalyzedResults(analyzed);
        setVisibleCount(RESULTS_PER_PAGE);

        const withoutSite = analyzed.filter(r => !r.hasWebsite && !r.alreadySaved).length;
        const alreadySaved = analyzed.filter(r => r.alreadySaved).length;
        const { data: { user: u2 } } = await supabase.auth.getUser();
        toast.success(
          `${analyzed.length} empresas encontradas${withoutSite > 0 ? ` — ${withoutSite} sem website` : ""}${alreadySaved > 0 ? `, ${alreadySaved} já guardadas` : ""}`
        );

        await supabase.from("prospection_logs").insert({
          query: `[MULTI] ${q} ${locationPart}`,
          results_count: analyzed.length,
          status: "completed",
          user_id: u2?.id,
        });
      } else {
        toast.error("Nenhum resultado encontrado. Tente outros termos.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erro ao pesquisar. Verifique a ligação.");
    } finally {
      setIsSearching(false);
      setSearchProgress("");
    }
  };

  // "Ver Mais" for website results — consumes 10 more results from weekly quota
  const handleLoadMoreResults = async () => {
    setIsLoadingMore(true);
    const ok = await consumeResults(RESULTS_PER_PAGE);
    if (ok) {
      setVisibleCount(prev => prev + RESULTS_PER_PAGE);
    }
    setIsLoadingMore(false);
  };

  // ==================== SOCIAL MEDIA SEARCH ====================
  const handleSocialSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialQuery.trim()) return;

    const ok = await consumeResults(RESULTS_PER_PAGE);
    if (!ok) return;

    setIsSearchingSocial(true);
    setAllSocialResults([]);
    setSocialVisibleCount(RESULTS_PER_PAGE);

    try {
      const province = socialProvince && socialProvince !== "all" ? socialProvince : "";
      const municipio = socialMunicipio && socialMunicipio !== "all" ? socialMunicipio : "";
      const locationParts: string[] = [];
      if (municipio) locationParts.push(municipio);
      if (province) locationParts.push(province);
      if (!province && !municipio) locationParts.push("Angola");
      else locationParts.push("Angola");
      const locationPart = locationParts.join(" ");
      const q = socialQuery.trim();
      const regularityTerms = socialPostRegularity === "1_week" ? "sem postar última semana inativo" :
                              socialPostRegularity === "2_weeks" ? "sem postar duas semanas inativo" : "";
      const engagementTerms = socialEngagementRate === "low" ? "poucos likes baixo engajamento" :
                              socialEngagementRate === "medium" ? "engajamento moderado" : "";

      setSearchProgress("A analisar redes sociais...");

      const extraTerms = [regularityTerms, engagementTerms].filter(Boolean).join(" ");
      const queries = [
        { q: `${q} ${locationPart} ${extraTerms} site:instagram.com`, source: "instagram" },
        { q: `${q} ${locationPart} ${extraTerms} site:facebook.com`, source: "facebook" },
        { q: `${q} ${locationPart} site:linkedin.com/company`, source: "linkedin" },
        { q: `${q} ${locationPart} ${extraTerms} site:tiktok.com`, source: "tiktok" },
        { q: `${q} ${locationPart} site:verangola.net`, source: "verangola" },
        { q: `${q} ${locationPart} redes sociais empresa contacto ${extraTerms}`, source: "geral" },
        { q: `${q} ${locationPart} instagram facebook seguidores página ${extraTerms}`, source: "geral" },
      ];

      const allResults: SearchResult[] = [];
      const seenUrls = new Set<string>();

      for (let i = 0; i < queries.length; i += 3) {
        const batch = queries.slice(i, i + 3);
        setSearchProgress(`A pesquisar em ${batch.map(b => SOURCE_LABELS[b.source] || b.source).join(", ")}...`);

        const batchPromises = batch.map(({ q: bq }) =>
          firecrawlApi.search(bq, {
            limit: 15,
            lang: "pt",
            country: "ao",
            scrapeOptions: { formats: ["markdown"] },
          })
        );

        const responses = await Promise.allSettled(batchPromises);

        for (const res of responses) {
          if (res.status === "fulfilled" && res.value.success && res.value.data) {
            for (const item of res.value.data) {
              const normalizedUrl = item.url?.toLowerCase().replace(/\/$/, "");
              if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
                seenUrls.add(normalizedUrl);
                allResults.push(item);
              }
            }
          }
        }
      }

      setSearchProgress("");

      if (allResults.length > 0) {
        let analyzed = analyzeSocialPresence(allResults, isAlreadySaved);

        if (socialPostRegularity && socialPostRegularity !== "all") {
          analyzed = analyzed.filter(r => r.socialIndicators.irregularPosts);
        }

        if (socialEngagementRate && socialEngagementRate !== "all") {
          if (socialEngagementRate === "low") {
            analyzed = analyzed.filter(r => r.socialIndicators.lowFollowers || r.socialIndicators.irregularPosts);
          } else if (socialEngagementRate === "medium") {
            analyzed = analyzed.filter(r => !r.socialIndicators.lowFollowers && r.socialScore >= 30 && r.socialScore <= 60);
          } else if (socialEngagementRate === "high") {
            analyzed = analyzed.filter(r => !r.socialIndicators.lowFollowers && r.socialScore < 30);
          }
        }

        // Hard cap: deliver exactly RESULTS_PER_PAGE (10) results, no more
        const capped = analyzed.slice(0, RESULTS_PER_PAGE);
        setAllSocialResults(capped);
        setSocialVisibleCount(RESULTS_PER_PAGE);

        const highOpp = capped.filter(r => r.socialScore >= 70 && !r.alreadySaved).length;
        const alreadySaved = capped.filter(r => r.alreadySaved).length;
        const { data: { user: u3 } } = await supabase.auth.getUser();
        toast.success(
          `${capped.length} empresas encontradas${highOpp > 0 ? ` — ${highOpp} alta oportunidade` : ""}${alreadySaved > 0 ? `, ${alreadySaved} já guardadas` : ""}`
        );

        await supabase.from("prospection_logs").insert({
          query: `[SOCIAL-MULTI] ${q} ${locationPart}`,
          results_count: capped.length,
          status: "completed",
          user_id: u3?.id,
        });
      } else {
        toast.error("Nenhum resultado encontrado. Tente outros termos.");
      }
    } catch (error) {
      console.error("Social search error:", error);
      toast.error("Erro ao pesquisar. Verifique a ligação.");
    } finally {
      setIsSearchingSocial(false);
      setSearchProgress("");
    }
  };

  // "Ver Mais" for social results — consumes 10 more results from weekly quota
  const handleLoadMoreSocial = async () => {
    setIsLoadingMoreSocial(true);
    const ok = await consumeResults(RESULTS_PER_PAGE);
    if (ok) {
      setSocialVisibleCount(prev => prev + RESULTS_PER_PAGE);
    }
    setIsLoadingMoreSocial(false);
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
    // CORRECÇÃO: usar Set para suportar múltiplos saves simultâneos
    setSavingUrls(prev => new Set(prev).add(result.url));
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const insertData: any = {
        name: result.businessName,
        company: result.businessName,
        // Usar websiteUrl próprio se existir, caso contrário null
        website: result.websiteUrl ?? null,
        notes: result.hasWebsite
          ? result.description
          : `Sem website próprio. Encontrado via: ${result.sources.map(s => SOURCE_LABELS[s] || s).join(", ")}\n\n${result.description || ""}`,
        source: "firecrawl_prospection",
        service_type: "website" as const,
        email: result.contacts.emails[0] || null,
        phone: result.contacts.phones[0] || null,
        user_id: currentUser?.id,
      };

      const { error } = await supabase.from("leads").insert(insertData);
      if (error) {
        toast.error("Erro ao guardar lead");
      } else {
        toast.success("Lead guardado!");
        await loadExistingLeads();
        setAllAnalyzedResults(prev =>
          prev.map(r => r.url === result.url ? { ...r, alreadySaved: true } : r)
        );
      }
    } catch {
      toast.error("Erro ao guardar lead");
    } finally {
      setSavingUrls(prev => {
        const next = new Set(prev);
        next.delete(result.url);
        return next;
      });
    }
  };

  const saveAsSocialLead = async (result: SocialAnalyzedResult) => {
    setSavingUrls(prev => new Set(prev).add(result.url));
    try {
      const platforms = result.socialProfiles.map(p => p.platform).join(", ");
      const indicators: string[] = [];
      if (result.socialIndicators.lowFollowers) indicators.push("Poucos seguidores");
      if (result.socialIndicators.irregularPosts) indicators.push("Publicações irregulares");
      if (result.socialIndicators.noProfessionalBio) indicators.push("Sem bio profissional");
      if (result.socialIndicators.noWebsiteLink) indicators.push("Sem link de website");

      const { data: { user: currentUser2 } } = await supabase.auth.getUser();
      const insertData: any = {
        name: result.businessName,
        company: result.businessName,
        website: null,
        notes:
          `🎯 Oportunidade Social Media (Score: ${result.socialScore}/100)\n\n` +
          `📊 Indicadores: ${indicators.join(", ") || "N/A"}\n` +
          `📱 Plataformas: ${platforms || "Nenhuma encontrada"}\n` +
          `🔍 Fontes: ${result.sources.map(s => SOURCE_LABELS[s] || s).join(", ")}\n` +
          `${result.socialProfiles.map(p => `${p.platform}: ${p.url}`).join("\n")}\n\n` +
          `${result.description || ""}`,
        source: "firecrawl_social_prospection",
        service_type: "social_media" as const,
        email: result.contacts.emails[0] || null,
        phone: result.contacts.phones[0] || null,
        social_instagram: result.socialProfiles.find(p => p.platform === "Instagram")?.url || null,
        social_facebook: result.socialProfiles.find(p => p.platform === "Facebook")?.url || null,
        social_tiktok: result.socialProfiles.find(p => p.platform === "TikTok")?.url || null,
        social_linkedin: result.socialProfiles.find(p => p.platform === "LinkedIn")?.url || null,
        user_id: currentUser2?.id,
      };

      const { error } = await supabase.from("leads").insert(insertData);
      if (error) {
        toast.error("Erro ao guardar lead");
      } else {
        toast.success("Lead guardado como potencial cliente de Social Media!");
        await loadExistingLeads();
        setAllSocialResults(prev =>
          prev.map(r => r.url === result.url ? { ...r, alreadySaved: true } : r)
        );
      }
    } catch {
      toast.error("Erro ao guardar lead");
    } finally {
      setSavingUrls(prev => {
        const next = new Set(prev);
        next.delete(result.url);
        return next;
      });
    }
  };

  const noWebsiteCount = analyzedResults.filter(r => !r.hasWebsite && !r.alreadySaved).length;
  const savedCount = analyzedResults.filter(r => r.alreadySaved).length;
  const hasMoreResults = visibleCount < allAnalyzedResults.length;
  const hasMoreSocial = socialVisibleCount < allSocialResults.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prospecção</h1>
        <p className="text-muted-foreground">
          Pesquisa multi-fonte: LinkedIn, Google Maps, Facebook, Instagram, VerAngola
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex">
          <TabsTrigger value="search" className="flex-1 sm:flex-none text-xs sm:text-sm">
            <Search className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Websites</span>
            <span className="sm:hidden">Web</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex-1 sm:flex-none text-xs sm:text-sm">
            <Instagram className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Social Media</span>
            <span className="sm:hidden">Social</span>
          </TabsTrigger>
          <TabsTrigger value="scrape" className="flex-1 sm:flex-none text-xs sm:text-sm">
            <Globe className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Analisar</span>
            <span className="sm:hidden">Analisar</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== WEBSITE TAB ==================== */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Pesquisa Multi-Fonte — Malha Fina
              </CardTitle>
              <CardDescription>
                Pesquisa em 7 fontes simultâneas: LinkedIn, Google Maps, Facebook, Instagram, VerAngola, Google e directórios angolanos. Empresas já guardadas são filtradas automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className={`space-y-2 ${searchProvince === "Luanda" ? "sm:col-span-1" : "sm:col-span-2"}`}>
                    <Label>Tipo de Negócio</Label>
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ex: restaurante, clínica, salão de beleza, hotel..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Província</Label>
                    <Select
                      value={searchProvince}
                      onValueChange={(v) => {
                        setSearchProvince(v);
                        if (v !== "Luanda") setSearchMunicipio("");
                      }}
                    >
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
                  {searchProvince === "Luanda" && (
                    <div className="space-y-2">
                      <Label>Município</Label>
                      <Select value={searchMunicipio} onValueChange={setSearchMunicipio}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {MUNICIPIOS_LUANDA.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={isSearching} className="w-full sm:w-auto overflow-hidden">
                  {isSearching ? (
                    <span className="flex items-center min-w-0">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                      <span className="truncate min-w-0">{searchProgress || "A pesquisar..."}</span>
                    </span>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Pesquisar em Todas as Fontes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {analyzedResults.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="text-muted-foreground font-medium">{analyzedResults.length} empresas</span>
              {noWebsiteCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />{noWebsiteCount} sem website
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />{analyzedResults.length - noWebsiteCount - savedCount} com website
              </Badge>
              {savedCount > 0 && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  ✅ {savedCount} já guardadas
                </Badge>
              )}
            </div>
          )}

          {analyzedResults.length > 0 && (
            <div className="space-y-3">
              {analyzedResults.map((result, _idx) => (
                <Card
                  key={result.url}
                  className={
                    result.alreadySaved
                      ? "opacity-50 border-muted"
                      : !result.hasWebsite
                      ? "border-destructive/50 bg-destructive/5"
                      : ""
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate">{result.businessName}</h4>
                          {result.alreadySaved ? (
                            <Badge variant="outline" className="text-xs gap-1 shrink-0 text-muted-foreground">
                              ✅ Já guardado
                            </Badge>
                          ) : !result.hasWebsite ? (
                            <Badge variant="destructive" className="text-xs gap-1 shrink-0">
                              <AlertTriangle className="h-3 w-3" />Sem Website
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                              <CheckCircle2 className="h-3 w-3" />Tem Website
                            </Badge>
                          )}
                          <a
                            href={result.websiteUrl ?? result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            aria-label={`Abrir ${result.businessName} numa nova aba`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {result.sources.map(s => (
                            <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                              <MapPin className="mr-0.5 h-2.5 w-2.5" />
                              {SOURCE_LABELS[s] || s}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
                        <div className="flex flex-wrap gap-2 pt-1 min-w-0">
                          {result.contacts.emails.slice(0, 2).map((email) => (
                            <Badge key={email} variant="outline" className="text-xs max-w-full min-w-0">
                              <Mail className="mr-1 h-3 w-3 shrink-0" />
                              <span className="truncate min-w-0">{email}</span>
                            </Badge>
                          ))}
                          {result.contacts.phones.slice(0, 2).map((phone) => (
                            <Badge key={phone} variant="outline" className="text-xs max-w-full min-w-0">
                              <Phone className="mr-1 h-3 w-3 shrink-0" />
                              <span className="truncate min-w-0">{phone}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {!result.alreadySaved && (
                        <Button
                          variant={!result.hasWebsite ? "default" : "outline"}
                          size="sm"
                          onClick={() => saveAsLead(result)}
                          disabled={savingUrls.has(result.url)}
                          className="w-full sm:w-auto"
                        >
                          {savingUrls.has(result.url) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="mr-1 h-4 w-4" />Guardar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {hasMoreResults && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMoreResults}
                disabled={isLoadingMore}
                data-testid="button-ver-mais-websites"
              >
                {isLoadingMore ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A carregar...</>
                ) : (
                  <>Ver mais 10 resultados (desconta da quota semanal)</>
                )}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ==================== SOCIAL MEDIA TAB ==================== */}
        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Instagram className="h-5 w-5" />
                Prospecção Social Media — Multi-Fonte
              </CardTitle>
              <CardDescription>
                Pesquisa em Instagram, Facebook, LinkedIn, TikTok, VerAngola e Google Maps. Analisa métricas de presença digital para identificar as melhores oportunidades de Social Media. Leads já guardados são excluídos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSocialSearch} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
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
                    <Select
                      value={socialProvince}
                      onValueChange={(v) => {
                        setSocialProvince(v);
                        if (v !== "Luanda") setSocialMunicipio("");
                      }}
                    >
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

                {socialProvince === "Luanda" && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Município de Luanda
                    </Label>
                    <Select value={socialMunicipio} onValueChange={setSocialMunicipio}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os municípios" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os municípios</SelectItem>
                        {MUNICIPIOS_LUANDA.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      📅 Regularidade de Postagens
                    </Label>
                    <Select value={socialPostRegularity} onValueChange={setSocialPostRegularity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer</SelectItem>
                        <SelectItem value="1_week">+1 semana sem postar</SelectItem>
                        <SelectItem value="2_weeks">+2 semanas sem postar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Taxa de Engajamento
                    </Label>
                    <Select value={socialEngagementRate} onValueChange={setSocialEngagementRate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer</SelectItem>
                        <SelectItem value="low">Baixa ({"<"}1% engajamento)</SelectItem>
                        <SelectItem value="medium">Média (1-3% engajamento)</SelectItem>
                        <SelectItem value="high">Alta ({">"}3% engajamento)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={isSearchingSocial} className="w-full sm:w-auto overflow-hidden">
                  {isSearchingSocial ? (
                    <span className="flex items-center min-w-0">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                      <span className="truncate min-w-0">{searchProgress || "A analisar..."}</span>
                    </span>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Analisar em Todas as Fontes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {socialResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {socialResults.filter(r => r.socialScore >= 70 && !r.alreadySaved).length}
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-400">Alta Oportunidade</p>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {socialResults.filter(r => r.socialScore >= 40 && r.socialScore < 70 && !r.alreadySaved).length}
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400">Média Oportunidade</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {socialResults.filter(r => r.socialScore < 40 && !r.alreadySaved).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Baixa Oportunidade</p>
                </CardContent>
              </Card>
              {socialResults.some(r => r.alreadySaved) && (
                <Card className="border-muted">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-muted-foreground">
                      {socialResults.filter(r => r.alreadySaved).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Já Guardados</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {socialResults.length > 0 && (
            <div className="space-y-3">
              {socialResults.map((result) => (
                <Card
                  key={result.url}
                  className={
                    result.alreadySaved
                      ? "opacity-50 border-muted"
                      : result.socialScore >= 70
                      ? "border-green-300 dark:border-green-700"
                      : ""
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h4 className="font-medium truncate max-w-full">{result.businessName}</h4>
                          {result.alreadySaved ? (
                            <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                              ✅ Já guardado
                            </Badge>
                          ) : (
                            <Badge className={`text-xs gap-1 ${getScoreColor(result.socialScore)}`}>
                              <BarChart3 className="h-3 w-3" />
                              {result.socialScore}/100 — {getScoreLabel(result.socialScore)}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {result.sources.map(s => (
                            <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                              <MapPin className="mr-0.5 h-2.5 w-2.5" />
                              {SOURCE_LABELS[s] || s}
                            </Badge>
                          ))}
                        </div>

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

                        {!result.alreadySaved && (
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
                        )}

                        <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>

                        <div className="flex flex-wrap gap-2 min-w-0">
                          {result.contacts.emails.slice(0, 2).map((email) => (
                            <Badge key={email} variant="outline" className="text-xs max-w-full min-w-0">
                              <Mail className="mr-1 h-3 w-3 shrink-0" />
                              <span className="truncate min-w-0">{email}</span>
                            </Badge>
                          ))}
                          {result.contacts.phones.slice(0, 2).map((phone) => (
                            <Badge key={phone} variant="outline" className="text-xs max-w-full min-w-0">
                              <Phone className="mr-1 h-3 w-3 shrink-0" />
                              <span className="truncate min-w-0">{phone}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {!result.alreadySaved && (
                        <Button
                          variant={result.socialScore >= 70 ? "default" : "outline"}
                          size="sm"
                          onClick={() => saveAsSocialLead(result)}
                          disabled={savingUrls.has(result.url)}
                          className="w-full sm:w-auto"
                        >
                          {savingUrls.has(result.url) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="mr-1 h-4 w-4" />Guardar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {hasMoreSocial && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMoreSocial}
                disabled={isLoadingMoreSocial}
                data-testid="button-ver-mais-social"
              >
                {isLoadingMoreSocial ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A carregar...</>
                ) : (
                  <>Ver mais 10 resultados (desconta da quota semanal)</>
                )}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ==================== SCRAPE TAB ==================== */}
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
                  const contacts = extractContactInfoStatic(scrapeResult.markdown);
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
      <TokenExhaustedDialog open={showTokenExhausted} onOpenChange={setShowTokenExhausted} type={exhaustedType} />
    </div>
  );
};

export default Prospection;