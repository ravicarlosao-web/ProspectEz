import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MessageSquare, Instagram, Search } from "lucide-react";
import { MESSAGE_CATEGORIES } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Template = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  created_by: string | null;
};

const emptyForm = { title: "", content: "", category: "inicial" };

export function AdminTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar templates");
    } else {
      setTemplates((data as Template[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setForm({ title: t.title, content: t.content, category: t.category });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      const { error } = await supabase
        .from("message_templates")
        .update({ title: form.title, content: form.content, category: form.category })
        .eq("id", editingTemplate.id);
      if (error) { toast.error("Erro ao actualizar template"); return; }
      toast.success("Template actualizado!");
    } else {
      const { error } = await supabase
        .from("message_templates")
        .insert({ title: form.title, content: form.content, category: form.category });
      if (error) { toast.error("Erro ao criar template"); return; }
      toast.success("Template criado!");
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingTemplate(null);
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("message_templates").delete().eq("id", deleteId);
    if (error) { toast.error("Erro ao eliminar template"); return; }
    toast.success("Template eliminado!");
    setDeleteId(null);
    fetchTemplates();
  };

  const filtered = templates.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryLabel = (cat: string) =>
    MESSAGE_CATEGORIES.find(c => c.value === cat)?.label || cat;

  const getCategoryIcon = (cat: string) =>
    cat.startsWith("social_")
      ? <Instagram className="h-3.5 w-3.5 text-pink-400" />
      : <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Gestão de Templates</h2>
          <p className="text-sm text-muted-foreground">Criar, editar e remover templates de mensagens</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />Novo Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar templates..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 bg-muted/50 border-border/50"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="outline" className="border-border/50 text-muted-foreground">
          {templates.length} templates no total
        </Badge>
        <Badge variant="outline" className="border-pink-500/30 text-pink-400">
          {templates.filter(t => t.category.startsWith("social_")).length} social media
        </Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchQuery ? "Nenhum template encontrado para esta pesquisa" : "Nenhum template criado ainda"}
            </p>
            {!searchQuery && (
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />Criar Primeiro Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => (
            <Card key={t.id} className="flex flex-col border-border/50 bg-card/80 stat-card group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(t.category)}
                      <CardTitle className="text-sm truncate">{t.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-1 text-xs">
                      {getCategoryLabel(t.category)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed line-clamp-6">
                  {t.content}
                </pre>
              </CardContent>
              <div className="border-t border-border/30 px-4 py-2.5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/50">
                  {new Date(t.created_at).toLocaleDateString("pt-PT")}
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary" onClick={() => openEdit(t)}>
                  <Pencil className="mr-1.5 h-3 w-3" />Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Criar Template"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Título</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
                className="bg-muted/50 border-border/50"
                placeholder="Ex: Mensagem de Boas-vindas"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESSAGE_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Conteúdo</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={10}
                required
                placeholder="Use {{NomeCliente}}, {{Empresa}}, {{ServiçoInteressado}}, {{DataContato}}"
                className="bg-muted/50 border-border/50 text-sm font-mono"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingTemplate ? "Guardar Alterações" : "Criar Template"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este template? Esta acção não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
