import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Search, Phone, Mail, Globe, Building2, MapPin, FileText, Calendar, MessageCircle, Copy } from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, SERVICE_TYPE_LABELS, PROVINCES_ANGOLA, MESSAGE_CATEGORIES } from "@/lib/constants";

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
    content: `Olá {{NomeCliente}},\n\nGostaria de propor uma reunião para apresentar uma proposta personalizada de {{ServiçoInteressado}} para a {{Empresa}}.\n\nConfirma a sua disponibilidade?\n\nCumprimentos!`,
  },
];

type Lead = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  province: string | null;
  city: string | null;
  website: string | null;
  status: string;
  service_type: string | null;
  notes: string | null;
  source: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_tiktok: string | null;
  created_at: string;
};

const Clients = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sellerName, setSellerName] = useState("");
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "+244 ", province: "", city: "",
    website: "", service_type: "", notes: "",
  });

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      if (data?.full_name) setSellerName(data.full_name);
    }
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from("message_templates").select("*").order("created_at");
    setTemplates((data as Template[]) || []);
  };

  const fetchLeads = async () => {
    let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
    if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
    const { data } = await query;
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [search, statusFilter]);
  useEffect(() => { fetchTemplates(); fetchProfile(); }, []);

  const fillTemplate = (content: string, lead: Lead) => {
    return content
      .replace(/\{\{NomeCliente\}\}/g, lead.name || "")
      .replace(/\{\{Empresa\}\}/g, lead.company || "")
      .replace(/\{\{ServiçoInteressado\}\}/g, SERVICE_TYPE_LABELS[lead.service_type || ""] || "Website")
      .replace(/\{\{DataContato\}\}/g, new Date().toLocaleDateString("pt-AO"))
      .replace(/\[Seu Nome\]/g, sellerName || "[Seu Nome]");
  };

  const copyForWhatsApp = (content: string, lead: Lead) => {
    const filled = fillTemplate(content, lead);
    navigator.clipboard.writeText(filled);
    toast.success("Mensagem copiada! Cole no WhatsApp.");
  };

  const updateLeadStatus = async (lead: Lead, newStatus: string) => {
    const { error } = await supabase.from("leads").update({ status: newStatus as any }).eq("id", lead.id);
    if (error) { console.error("Erro ao atualizar status:", error); return; }
    setSelectedLead({ ...lead, status: newStatus });
    fetchLeads();
  };

  const openWhatsApp = async (content: string, lead: Lead) => {
    const filled = fillTemplate(content, lead);
    const phone = (lead.phone || "").replace(/\s+/g, "").replace(/^\+/, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(filled)}`;
    window.open(url, "_blank");
    // Auto-update status to "contactado" if currently "novo"
    if (lead.status === "novo") {
      await updateLeadStatus(lead, "contactado");
      toast.success("Status atualizado para Contactado!");
    }
  };


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const insertData: any = {
      name: form.name,
      company: form.company || null,
      email: form.email || null,
      phone: form.phone || null,
      province: form.province || null,
      city: form.city || null,
      website: form.website || null,
      service_type: form.service_type || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("leads").insert(insertData);
    if (error) { toast.error("Erro ao criar lead"); return; }
    toast.success("Lead criado com sucesso!");
    setDialogOpen(false);
    setForm({ name: "", company: "", email: "", phone: "+244 ", province: "", city: "", website: "", service_type: "", notes: "" });
    fetchLeads();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-AO", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes & Leads</h1>
          <p className="text-muted-foreground">Gestão de potenciais clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Lead</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>Criar Novo Lead</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Província</Label>
                  <Select value={form.province} onValueChange={v => setForm({...form, province: v})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {PROVINCES_ANGOLA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://" />
                </div>
                <div className="space-y-2">
                  <Label>Serviço</Label>
                  <Select value={form.service_type} onValueChange={v => setForm({...form, service_type: v})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
              </div>
              <Button type="submit" className="w-full">Criar Lead</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedLead.name}
                  <Badge variant="secondary" className={LEAD_STATUS_COLORS[selectedLead.status] || ""}>
                    {LEAD_STATUS_LABELS[selectedLead.status] || selectedLead.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedLead.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLead.company}</span>
                  </div>
                )}
                {selectedLead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">{selectedLead.phone}</a>
                  </div>
                )}
                {selectedLead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
                  </div>
                )}
                {selectedLead.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{selectedLead.website}</a>
                  </div>
                )}
                {(selectedLead.province || selectedLead.city) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{[selectedLead.city, selectedLead.province].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {selectedLead.service_type && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Serviço: {SERVICE_TYPE_LABELS[selectedLead.service_type] || selectedLead.service_type}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Criado em {formatDate(selectedLead.created_at)}</span>
                </div>

                {/* Social links */}
                {(selectedLead.social_facebook || selectedLead.social_instagram || selectedLead.social_linkedin || selectedLead.social_tiktok) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Redes Sociais</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedLead.social_facebook && <Badge variant="outline"><a href={selectedLead.social_facebook} target="_blank" rel="noopener noreferrer">Facebook</a></Badge>}
                        {selectedLead.social_instagram && <Badge variant="outline"><a href={selectedLead.social_instagram} target="_blank" rel="noopener noreferrer">Instagram</a></Badge>}
                        {selectedLead.social_linkedin && <Badge variant="outline"><a href={selectedLead.social_linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></Badge>}
                        {selectedLead.social_tiktok && <Badge variant="outline"><a href={selectedLead.social_tiktok} target="_blank" rel="noopener noreferrer">TikTok</a></Badge>}
                      </div>
                    </div>
                  </>
                )}

                {selectedLead.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Notas</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedLead.notes}</p>
                    </div>
                  </>
                )}

                {selectedLead.source && (
                  <div className="text-xs text-muted-foreground">
                    Origem: {selectedLead.source}
                  </div>
                )}

                {/* WhatsApp Templates */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Enviar Mensagem via WhatsApp
                  </h4>
                  {(templates.length > 0 ? templates : DEFAULT_TEMPLATES.map((t, i) => ({ ...t, id: `default-${i}` }))).map(t => (
                    <div key={t.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {MESSAGE_CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                        </Badge>
                      </div>
                      <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed max-h-24 overflow-y-auto">
                        {fillTemplate(t.content, selectedLead)}
                      </pre>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => copyForWhatsApp(t.content, selectedLead)}>
                          <Copy className="mr-1.5 h-3 w-3" />Copiar
                        </Button>
                        {selectedLead.phone && (
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => openWhatsApp(t.content, selectedLead)}>
                            <MessageCircle className="mr-1.5 h-3 w-3" />WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Pesquisar leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead className="hidden lg:table-cell">Contacto</TableHead>
                <TableHead className="hidden lg:table-cell">Província</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {loading ? "A carregar..." : "Sem leads encontrados"}
                </TableCell></TableRow>
              ) : leads.map(lead => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedLead(lead)}
                >
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{lead.company || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex gap-2 text-muted-foreground">
                      {lead.phone && <Phone className="h-3.5 w-3.5" />}
                      {lead.email && <Mail className="h-3.5 w-3.5" />}
                      {lead.website && <Globe className="h-3.5 w-3.5" />}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{lead.province || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={LEAD_STATUS_COLORS[lead.status] || ""}>
                      {LEAD_STATUS_LABELS[lead.status] || lead.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;
