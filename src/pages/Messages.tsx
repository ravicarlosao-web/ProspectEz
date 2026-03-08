import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, MessageSquare, Globe, Instagram, TrendingUp, Inbox } from "lucide-react";
import { MESSAGE_CATEGORIES } from "@/lib/constants";

type Template = {
  id: string;
  title: string;
  content: string;
  category: string;
};

const Messages = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from("message_templates").select("*").order("created_at");
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada!");
  };

  const generalTemplates = templates.filter(t => !t.category.startsWith("social_"));
  const socialTemplates = templates.filter(t => t.category.startsWith("social_"));

  const getCategoryLabel = (cat: string) =>
    MESSAGE_CATEGORIES.find(c => c.value === cat)?.label || cat;

  const getTemplateIcon = (category: string) => {
    if (category.startsWith("social_")) return <Instagram className="h-4 w-4 text-pink-400" />;
    return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  };

  const EmptyState = ({ message }: { message: string }) => (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="py-16 text-center">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm">{message}</p>
        <p className="text-muted-foreground/50 text-xs mt-1">Os templates são geridos pelo administrador</p>
      </CardContent>
    </Card>
  );

  const TemplateCard = ({ t }: { t: Template }) => (
    <Card className={`flex flex-col bg-card/80 stat-card ${t.category.startsWith("social_") ? "border-pink-500/15" : "border-border/50"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm">{t.title}</CardTitle>
            <CardDescription className="mt-1 text-xs">{getCategoryLabel(t.category)}</CardDescription>
          </div>
          {getTemplateIcon(t.category)}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed">
          {t.content}
        </pre>
      </CardContent>
      <div className="border-t border-border/30 p-4">
        <Button variant="outline" size="sm" className="w-full border-border/50" onClick={() => copyToClipboard(t.content)}>
          <Copy className="mr-2 h-3.5 w-3.5" />Copiar Mensagem
        </Button>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensagens & Templates</h1>
        <p className="text-sm text-muted-foreground">Biblioteca de mensagens para prospecção</p>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="bg-muted/50 border border-border/30">
          <TabsTrigger value="geral">
            <Globe className="mr-2 h-4 w-4" />
            Geral & Website
            {generalTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{generalTemplates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="social">
            <Instagram className="mr-2 h-4 w-4" />
            Social Media
            {socialTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{socialTemplates.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          {generalTemplates.length === 0 ? (
            <EmptyState message="Nenhum template geral disponível" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {generalTemplates.map(t => <TemplateCard key={t.id} t={t} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="social">
          {socialTemplates.length > 0 && (
            <Card className="mb-4 border-pink-500/20 bg-pink-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-pink-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">Templates com Métricas de Social Media</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estas mensagens usam dados e métricas do mercado angolano para convencer potenciais clientes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {socialTemplates.length === 0 ? (
            <EmptyState message="Nenhum template de social media disponível" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {socialTemplates.map(t => <TemplateCard key={t.id} t={t} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Messages;
