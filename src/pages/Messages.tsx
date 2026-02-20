import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Copy, MessageSquare, Globe, Instagram, TrendingUp } from "lucide-react";
import { MESSAGE_CATEGORIES } from "@/lib/constants";

type Template = {
  id: string;
  title: string;
  content: string;
  category: string;
};

const DEFAULT_TEMPLATES: Omit<Template, "id">[] = [
  {
    title: "Mensagem Inicial",
    category: "inicial",
    content: `Olá {{NomeCliente}},\n\nO meu nome é [Seu Nome] e faço parte da equipa da [Agência]. Reparámos que a {{Empresa}} tem um excelente potencial para crescer nas redes sociais.\n\nGostaria de agendar uma breve conversa para apresentar as nossas soluções de {{ServiçoInteressado}}.\n\nCumprimentos!`,
  },
  {
    title: "Follow-up 1",
    category: "follow_up_1",
    content: `Olá {{NomeCliente}},\n\nEstou a escrever para dar seguimento à nossa última conversa sobre {{ServiçoInteressado}} para a {{Empresa}}.\n\nTem disponibilidade esta semana para conversarmos?\n\nCumprimentos!`,
  },
  {
    title: "Proposta de Reunião",
    category: "reuniao",
    content: `Olá {{NomeCliente}},\n\nGostaria de propor uma reunião para apresentar uma proposta personalizada de {{ServiçoInteressado}} para a {{Empresa}}.\n\nSugestão: {{DataContato}} às 10h.\n\nConfirma a sua disponibilidade?\n\nCumprimentos!`,
  },
];

const SOCIAL_MEDIA_TEMPLATES: Omit<Template, "id">[] = [
  {
    title: "📊 Análise de Redes Sociais",
    category: "social_analise",
    content: `Olá {{NomeCliente}},\n\nO meu nome é [Seu Nome] da [Agência]. Fizemos uma análise rápida da presença digital da {{Empresa}} e identificámos oportunidades importantes:\n\n📉 A vossa página tem potencial para alcançar muito mais pessoas\n📱 Com uma estratégia consistente, negócios semelhantes em Angola aumentaram o engajamento em até 300%\n🎯 O vosso público-alvo está activo nas redes sociais\n\nGostaria de partilhar um relatório gratuito com recomendações personalizadas?\n\nCumprimentos!`,
  },
  {
    title: "🚀 Crescimento nas Redes",
    category: "social_crescimento",
    content: `Olá {{NomeCliente}},\n\nReparei que a {{Empresa}} tem presença nas redes sociais mas ainda pode crescer muito mais!\n\n📊 Métricas que podemos melhorar:\n• Frequência de publicações (ideal: 3-5 por semana)\n• Qualidade visual do conteúdo\n• Interacção com o público\n• Estratégia de hashtags angolanas\n\n💡 Empresas que investem em gestão profissional de redes sociais em Angola têm visto um aumento médio de 150% no alcance.\n\nPodemos agendar uma conversa de 15 minutos?\n\nCumprimentos!`,
  },
  {
    title: "📸 Conteúdo Profissional",
    category: "social_conteudo",
    content: `Olá {{NomeCliente}},\n\nA {{Empresa}} tem muito para mostrar ao mundo! 🌍\n\nNotámos que o vosso conteúdo nas redes sociais pode beneficiar de:\n\n✅ Design profissional e consistente\n✅ Calendário editorial organizado\n✅ Vídeos curtos (Reels/TikTok) — formato com mais alcance em Angola\n✅ Stories diários para manter o público envolvido\n\n📈 Resultado esperado: Mais visibilidade, mais clientes, mais vendas.\n\nQuer saber como podemos transformar as redes sociais da {{Empresa}}?\n\nCumprimentos!`,
  },
  {
    title: "💰 ROI de Social Media",
    category: "social_roi",
    content: `Olá {{NomeCliente}},\n\nSabia que investir em Social Media é uma das formas mais rentáveis de marketing para empresas em Angola?\n\n📊 Alguns números:\n• 70% dos angolanos activos online usam Instagram e Facebook\n• Negócios com gestão profissional de redes sociais geram 2-3x mais leads\n• O custo por lead em Social Media é até 60% menor que publicidade tradicional\n\nPara a {{Empresa}}, estimamos que uma estratégia bem executada poderia:\n🎯 Aumentar o alcance em 200%+\n🎯 Gerar 50+ contactos novos por mês\n🎯 Fortalecer a marca no mercado angolano\n\nPosso apresentar uma proposta sem compromisso?\n\nCumprimentos!`,
  },
  {
    title: "⚡ Sem Presença Digital",
    category: "social_sem_presenca",
    content: `Olá {{NomeCliente}},\n\nO meu nome é [Seu Nome] da [Agência]. Reparámos que a {{Empresa}} ainda não tem uma presença forte nas redes sociais.\n\n🔍 Num mundo cada vez mais digital, os vossos potenciais clientes estão a procurar serviços como os vossos no Instagram e Facebook todos os dias.\n\n❌ Sem presença: Esses clientes vão para a concorrência\n✅ Com presença: A {{Empresa}} aparece primeiro\n\nOferecemos um pacote especial para empresas que estão a começar:\n📱 Criação de perfis profissionais\n📸 Conteúdo visual de qualidade\n📅 Gestão mensal completa\n\nVamos conversar sobre isto?\n\nCumprimentos!`,
  },
];

const Messages = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "inicial" });

  const fetchTemplates = async () => {
    const { data } = await supabase.from("message_templates").select("*").order("created_at");
    setTemplates((data as Template[]) || []);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("message_templates").insert(form);
    if (error) { toast.error("Erro ao criar template"); return; }
    toast.success("Template criado!");
    setDialogOpen(false);
    setForm({ title: "", content: "", category: "inicial" });
    fetchTemplates();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada!");
  };

  const allTemplates = templates.length > 0 ? templates : DEFAULT_TEMPLATES.map((t, i) => ({ ...t, id: `default-${i}` }));
  const socialTemplates = SOCIAL_MEDIA_TEMPLATES.map((t, i) => ({ ...t, id: `social-${i}` }));

  const getTemplateIcon = (category: string) => {
    if (category.startsWith("social_")) return <Instagram className="h-4 w-4 text-pink-500" />;
    return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mensagens & Templates</h1>
          <p className="text-muted-foreground">Biblioteca de mensagens para prospecção</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Template</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Criar Template</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESSAGE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={8} required
                  placeholder="Use {{NomeCliente}}, {{Empresa}}, {{ServiçoInteressado}}, {{DataContato}}" />
              </div>
              <Button type="submit" className="w-full">Criar Template</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">
            <Globe className="mr-2 h-4 w-4" />
            Geral & Website
          </TabsTrigger>
          <TabsTrigger value="social">
            <Instagram className="mr-2 h-4 w-4" />
            Social Media
            <Badge variant="secondary" className="ml-2 text-xs">{socialTemplates.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allTemplates.map(t => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{t.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {MESSAGE_CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                      </CardDescription>
                    </div>
                    {getTemplateIcon(t.category)}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
                    {t.content}
                  </pre>
                </CardContent>
                <div className="border-t p-4">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => copyToClipboard(t.content)}>
                    <Copy className="mr-2 h-3.5 w-3.5" />Copiar Mensagem
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="social">
          {/* Social Media Info Banner */}
          <Card className="mb-4 border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 dark:border-pink-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-pink-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">Templates com Métricas de Social Media</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estas mensagens usam dados e métricas do mercado angolano para convencer potenciais clientes. 
                    Inclua números reais após analisar as redes do cliente na página de Prospecção.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {socialTemplates.map(t => (
              <Card key={t.id} className="flex flex-col border-pink-100 dark:border-pink-900/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{t.title}</CardTitle>
                      <CardDescription className="mt-1">Social Media</CardDescription>
                    </div>
                    <Instagram className="h-4 w-4 text-pink-500" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
                    {t.content}
                  </pre>
                </CardContent>
                <div className="border-t p-4">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => copyToClipboard(t.content)}>
                    <Copy className="mr-2 h-3.5 w-3.5" />Copiar Mensagem
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Messages;
