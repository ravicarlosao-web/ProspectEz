import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Copy, MessageSquare } from "lucide-react";
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
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
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
    </div>
  );
};

export default Messages;
