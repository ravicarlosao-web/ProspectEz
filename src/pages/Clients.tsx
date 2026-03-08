import { useEffect, useState, useCallback } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Phone, Mail, Globe, Building2, MapPin, FileText, Calendar as CalendarIcon,
  MessageCircle, Copy, Trash2, ChevronLeft, ChevronRight, Filter, X, CalendarDays, Bell, Pencil, Save
} from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, SERVICE_TYPE_LABELS, PROVINCES_ANGOLA, MESSAGE_CATEGORIES } from "@/lib/constants";
import { LeadImportExport } from "@/components/LeadImportExport";
import { ClientsSkeleton } from "@/components/PageSkeleton";

type Template = {
  id: string;
  title: string;
  content: string;
  category: string;
};

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
  next_contact_date: string | null;
};

const PAGE_SIZE = 20;

const Clients = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sellerName, setSellerName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "+244 ", province: "", city: "",
    website: "", service_type: "", notes: "",
    social_facebook: "", social_instagram: "", social_linkedin: "", social_tiktok: "",
  });

  const activeFilterCount = [serviceFilter !== "all", websiteFilter !== "all"].filter(Boolean).length;

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

  const fetchStatusCounts = useCallback(async () => {
    const statuses = ["novo", "contactado", "em_negociacao", "fechado_ganho", "perdido"];
    const promises = statuses.map(s =>
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", s as any)
    );
    const results = await Promise.all(promises);
    const counts: Record<string, number> = {};
    statuses.forEach((s, i) => {
      counts[s] = results[i].count ?? 0;
    });
    setStatusCounts(counts);
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase.from("leads").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
    if (serviceFilter !== "all") query = query.eq("service_type", serviceFilter as any);
    if (websiteFilter === "with") query = query.not("website", "is", null).neq("website", "" as any);
    if (websiteFilter === "without") query = query.or("website.is.null,website.eq.");
    if (search) {
      const sanitized = search.replace(/[%_\\]/g, '\\$&');
      query = query.or(`name.ilike.%${sanitized}%,company.ilike.%${sanitized}%,email.ilike.%${sanitized}%,notes.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`);
    }
    const { data, count } = await query;
    setLeads((data as Lead[]) || []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, statusFilter, serviceFilter, websiteFilter]);

  useEffect(() => { setPage(0); }, [search, statusFilter, serviceFilter, websiteFilter]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchStatusCounts(); }, [fetchStatusCounts]);
  useEffect(() => {
    fetchTemplates();
    fetchProfile();
    const fetchAgency = async () => {
      const { data } = await supabase.from("app_settings" as any).select("value").eq("key", "agency_name").single();
      if (data) setAgencyName((data as any).value || "");
    };
    fetchAgency();
  }, []);

  const fillTemplate = (content: string, lead: Lead) => {
    return content
      .replace(/\{\{NomeCliente\}\}/g, lead.name || "")
      .replace(/\{\{Empresa\}\}/g, lead.company || "")
      .replace(/\{\{Email\}\}/g, lead.email || "")
      .replace(/\{\{Telefone\}\}/g, lead.phone || "")
      .replace(/\{\{Provincia\}\}/g, lead.province || "")
      .replace(/\{\{Cidade\}\}/g, lead.city || "")
      .replace(/\{\{Website\}\}/g, lead.website || "")
      .replace(/\{\{ServiçoInteressado\}\}/g, SERVICE_TYPE_LABELS[lead.service_type || ""] || "Website")
      .replace(/\{\{DataContato\}\}/g, new Date().toLocaleDateString("pt-AO"))
      .replace(/\[Seu Nome\]/g, sellerName || "[Seu Nome]")
      .replace(/\[Agência\]/g, agencyName);
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
    fetchStatusCounts();
  };

  const updateFollowUpDate = async (lead: Lead, date: Date | undefined) => {
    const dateStr = date ? format(date, "yyyy-MM-dd") : null;
    const { error } = await supabase.from("leads").update({ next_contact_date: dateStr } as any).eq("id", lead.id);
    if (error) { toast.error("Erro ao agendar follow-up"); return; }
    setSelectedLead({ ...lead, next_contact_date: dateStr });
    setFollowUpDate(date);
    fetchLeads();
    toast.success(date ? `Follow-up agendado para ${format(date, "dd/MM/yyyy")}` : "Follow-up removido");
  };

  const openWhatsApp = async (content: string, lead: Lead) => {
    const filled = fillTemplate(content, lead);
    const phone = (lead.phone || "").replace(/\s+/g, "").replace(/^\+/, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(filled)}`;
    window.open(url, "_blank");
    if (lead.status === "novo") {
      await updateLeadStatus(lead, "contactado");
      toast.success("Status atualizado para Contactado!");
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteLeadId) return;
    const { error } = await supabase.from("leads").delete().eq("id", deleteLeadId);
    if (error) { toast.error("Erro ao eliminar lead"); return; }
    toast.success("Lead eliminado!");
    setDeleteLeadId(null);
    setSelectedLead(null);
    fetchLeads();
    fetchStatusCounts();
  };

  const handleDeleteAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("leads").delete().eq("user_id", user.id);
    if (error) { toast.error("Erro ao eliminar leads"); return; }
    toast.success("Todos os leads foram eliminados!");
    setDeleteAllOpen(false);
    setPage(0);
    fetchLeads();
    fetchStatusCounts();
  };

  const startEdit = (lead: Lead) => {
    setEditForm({
      name: lead.name || "",
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      province: lead.province || "",
      city: lead.city || "",
      website: lead.website || "",
      service_type: lead.service_type || "",
      notes: lead.notes || "",
      source: lead.source || "",
      social_facebook: lead.social_facebook || "",
      social_instagram: lead.social_instagram || "",
      social_linkedin: lead.social_linkedin || "",
      social_tiktok: lead.social_tiktok || "",
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedLead) return;
    const { error } = await supabase.from("leads").update({
      name: editForm.name,
      company: editForm.company || null,
      email: editForm.email || null,
      phone: editForm.phone || null,
      province: editForm.province || null,
      city: editForm.city || null,
      website: editForm.website || null,
      service_type: (editForm.service_type || null) as "social_media" | "website" | "ambos" | null,
      notes: editForm.notes || null,
      source: editForm.source || null,
      social_facebook: editForm.social_facebook || null,
      social_instagram: editForm.social_instagram || null,
      social_linkedin: editForm.social_linkedin || null,
      social_tiktok: editForm.social_tiktok || null,
    }).eq("id", selectedLead.id);
    if (error) { toast.error("Erro ao guardar alterações"); return; }
    toast.success("Lead actualizado com sucesso!");
    setEditMode(false);
    setSelectedLead({ ...selectedLead, ...editForm, company: editForm.company || null, email: editForm.email || null, phone: editForm.phone || null, province: editForm.province || null, city: editForm.city || null, website: editForm.website || null, service_type: editForm.service_type || null, notes: editForm.notes || null, source: editForm.source || null, social_facebook: editForm.social_facebook || null, social_instagram: editForm.social_instagram || null, social_linkedin: editForm.social_linkedin || null, social_tiktok: editForm.social_tiktok || null });
    fetchLeads();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
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
      social_facebook: form.social_facebook || null,
      social_instagram: form.social_instagram || null,
      social_linkedin: form.social_linkedin || null,
      social_tiktok: form.social_tiktok || null,
      user_id: currentUser?.id,
    };
    const { error } = await supabase.from("leads").insert(insertData);
    if (error) { toast.error("Erro ao criar lead"); return; }
    toast.success("Lead criado com sucesso!");
    setDialogOpen(false);
    setForm({ name: "", company: "", email: "", phone: "+244 ", province: "", city: "", website: "", service_type: "", notes: "", social_facebook: "", social_instagram: "", social_linkedin: "", social_tiktok: "" });
    fetchLeads();
    fetchStatusCounts();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-AO", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date(new Date().toDateString());
  };

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr).toDateString() === new Date().toDateString();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const statusCards = [
    { label: "Novos", count: statusCounts.novo ?? 0, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Contactados", count: statusCounts.contactado ?? 0, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Em Negociação", count: statusCounts.em_negociacao ?? 0, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Fechados", count: statusCounts.fechado_ganho ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  const clearFilters = () => {
    setServiceFilter("all");
    setWebsiteFilter("all");
    setSearch("");
    setStatusFilter("all");
  };

  if (loading && leads.length === 0) return <ClientsSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes & Leads</h1>
          <p className="text-sm text-muted-foreground">Gestão de potenciais clientes</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <LeadImportExport onImportComplete={() => { fetchLeads(); fetchStatusCounts(); }} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="sm:size-default"><Plus className="mr-2 h-4 w-4" />Novo Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader><DialogTitle>Criar Novo Lead</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Empresa</Label>
                  <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Província</Label>
                  <Select value={form.province} onValueChange={v => setForm({...form, province: v})}>
                    <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {PROVINCES_ANGOLA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cidade</Label>
                  <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Website</Label>
                  <Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://" className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Serviço</Label>
                  <Select value={form.service_type} onValueChange={v => setForm({...form, service_type: v})}>
                    <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Redes Sociais</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Facebook</Label>
                  <Input value={form.social_facebook} onChange={e => setForm({...form, social_facebook: e.target.value})} placeholder="facebook.com/..." className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Instagram</Label>
                  <Input value={form.social_instagram} onChange={e => setForm({...form, social_instagram: e.target.value})} placeholder="@username" className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">LinkedIn</Label>
                  <Input value={form.social_linkedin} onChange={e => setForm({...form, social_linkedin: e.target.value})} placeholder="linkedin.com/in/..." className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">TikTok</Label>
                  <Input value={form.social_tiktok} onChange={e => setForm({...form, social_tiktok: e.target.value})} placeholder="@username" className="bg-muted/50 border-border/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="bg-muted/50 border-border/50" />
              </div>
              <Button type="submit" className="w-full">Criar Lead</Button>
            </form>
          </DialogContent>
          </Dialog>
          {totalCount > 0 && (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 sm:size-default" onClick={() => setDeleteAllOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Limpar Todos</span><span className="sm:hidden">Limpar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Status count cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statusCards.map((s) => (
          <Card key={s.label} className="border-border/50 bg-card/80 stat-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => {
        if (!open) { setSelectedLead(null); setFollowUpDate(undefined); setEditMode(false); }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {selectedLead && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{editMode ? "Editar Lead" : selectedLead.name}</DialogTitle>
                  {!editMode && (
                    <Button variant="outline" size="sm" onClick={() => startEdit(selectedLead)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
                    </Button>
                  )}
                </div>
              </DialogHeader>

              {editMode ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome *</Label>
                      <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required className="bg-muted/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Empresa</Label>
                      <Input value={editForm.company} onChange={e => setEditForm({...editForm, company: e.target.value})} className="bg-muted/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                      <Input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="bg-muted/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Telefone</Label>
                      <Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="bg-muted/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Província</Label>
                      <Select value={editForm.province} onValueChange={v => setEditForm({...editForm, province: v})}>
                        <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {PROVINCES_ANGOLA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cidade</Label>
                      <Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="bg-muted/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Website</Label>
                      <Input value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})} placeholder="https://" className="bg-muted/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Serviço</Label>
                      <Select value={editForm.service_type} onValueChange={v => setEditForm({...editForm, service_type: v})}>
                        <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Redes Sociais</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Facebook</Label>
                      <Input value={editForm.social_facebook} onChange={e => setEditForm({...editForm, social_facebook: e.target.value})} placeholder="https://facebook.com/..." className="bg-muted/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Instagram</Label>
                      <Input value={editForm.social_instagram} onChange={e => setEditForm({...editForm, social_instagram: e.target.value})} placeholder="https://instagram.com/..." className="bg-muted/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">LinkedIn</Label>
                      <Input value={editForm.social_linkedin} onChange={e => setEditForm({...editForm, social_linkedin: e.target.value})} placeholder="https://linkedin.com/..." className="bg-muted/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">TikTok</Label>
                      <Input value={editForm.social_tiktok} onChange={e => setEditForm({...editForm, social_tiktok: e.target.value})} placeholder="https://tiktok.com/..." className="bg-muted/50 border-border/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notas</Label>
                    <Textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} rows={3} className="bg-muted/50 border-border/50" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setEditMode(false)}>Cancelar</Button>
                    <Button className="flex-1" onClick={handleSaveEdit} disabled={!editForm.name?.trim()}>
                      <Save className="mr-1.5 h-3.5 w-3.5" />Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado do Funil</Label>
                <Select value={selectedLead.status} onValueChange={(v) => { updateLeadStatus(selectedLead, v); toast.success(`Status alterado para ${LEAD_STATUS_LABELS[v]}`); }}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${LEAD_STATUS_COLORS[selectedLead.status]?.split(" ")[0] || "bg-gray-200"}`} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${LEAD_STATUS_COLORS[k]?.split(" ")[0] || ""}`} />
                          {v}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  <CalendarIcon className="h-4 w-4" />
                  <span>Criado em {formatDate(selectedLead.created_at)}</span>
                </div>

                {/* Follow-up scheduler */}
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Agendamento de Follow-up
                  </h4>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn(
                          "justify-start text-left font-normal flex-1",
                          !selectedLead.next_contact_date && "text-muted-foreground",
                          isOverdue(selectedLead.next_contact_date) && "border-destructive/50 text-destructive",
                          isToday(selectedLead.next_contact_date) && "border-amber-500/50 text-amber-400"
                        )}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {selectedLead.next_contact_date
                            ? format(new Date(selectedLead.next_contact_date), "dd/MM/yyyy")
                            : "Agendar follow-up"}
                          {isOverdue(selectedLead.next_contact_date) && (
                            <Badge variant="destructive" className="ml-2 text-xs">Atrasado</Badge>
                          )}
                          {isToday(selectedLead.next_contact_date) && (
                            <Badge className="ml-2 text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">Hoje</Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedLead.next_contact_date ? new Date(selectedLead.next_contact_date) : undefined}
                          onSelect={(d) => updateFollowUpDate(selectedLead, d)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {selectedLead.next_contact_date && (
                      <Button variant="ghost" size="sm" onClick={() => updateFollowUpDate(selectedLead, undefined)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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

                {/* WhatsApp Templates with dynamic preview */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Enviar Mensagem via WhatsApp
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Os campos <code className="bg-muted px-1 rounded">{"{{NomeCliente}}"}</code>, <code className="bg-muted px-1 rounded">{"{{Empresa}}"}</code>, etc. são substituídos automaticamente.
                  </p>
                  {templates.map(t => (
                    <div key={t.id} className="rounded-md border border-border/50 p-3 space-y-2">
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
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setDeleteLeadId(selectedLead.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />Eliminar Lead
                </Button>
              </div>
              </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Pesquisar por nome, empresa, email, notas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50 border-border/50" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={showAdvancedFilters ? "secondary" : "outline"}
              size="sm"
              className="border-border/50"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge className="ml-2 text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>

          {/* Advanced filters */}
          {showAdvancedFilters && (
            <div className="flex flex-wrap gap-3 pt-3 border-t border-border/30 mt-3">
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[180px] bg-muted/50 border-border/50">
                  <SelectValue placeholder="Tipo de serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviços</SelectItem>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
                <SelectTrigger className="w-[180px] bg-muted/50 border-border/50">
                  <SelectValue placeholder="Website" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Com website</SelectItem>
                  <SelectItem value="without">Sem website</SelectItem>
                </SelectContent>
              </Select>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="mr-1 h-3 w-3" />Limpar filtros
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground uppercase tracking-wider">Nome</TableHead>
                <TableHead className="hidden md:table-cell text-xs text-muted-foreground uppercase tracking-wider">Empresa</TableHead>
                <TableHead className="hidden lg:table-cell text-xs text-muted-foreground uppercase tracking-wider">Contacto</TableHead>
                <TableHead className="hidden lg:table-cell text-xs text-muted-foreground uppercase tracking-wider">Província</TableHead>
                <TableHead className="text-xs text-muted-foreground uppercase tracking-wider">Estado</TableHead>
                <TableHead className="hidden md:table-cell text-xs text-muted-foreground uppercase tracking-wider">Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {loading ? "A carregar..." : "Sem leads encontrados"}
                </TableCell></TableRow>
              ) : leads.map(lead => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer border-border/20 hover:bg-muted/30 transition-colors"
                  onClick={() => {
                    setSelectedLead(lead);
                    setFollowUpDate(lead.next_contact_date ? new Date(lead.next_contact_date) : undefined);
                  }}
                >
                  <TableCell className="font-medium text-sm">{lead.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{lead.company || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex gap-2 text-muted-foreground">
                      {lead.phone && <Phone className="h-3.5 w-3.5" />}
                      {lead.email && <Mail className="h-3.5 w-3.5" />}
                      {lead.website && <Globe className="h-3.5 w-3.5" />}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{lead.province || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={LEAD_STATUS_COLORS[lead.status] || ""}>
                      {LEAD_STATUS_LABELS[lead.status] || lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {lead.next_contact_date ? (
                      <div className="flex items-center gap-1">
                        {isOverdue(lead.next_contact_date) && <Bell className="h-3 w-3 text-destructive" />}
                        {isToday(lead.next_contact_date) && <Bell className="h-3 w-3 text-amber-400" />}
                        <span className={cn(
                          "text-xs",
                          isOverdue(lead.next_contact_date) && "text-destructive font-medium",
                          isToday(lead.next_contact_date) && "text-amber-400 font-medium",
                          !isOverdue(lead.next_contact_date) && !isToday(lead.next_contact_date) && "text-muted-foreground"
                        )}>
                          {format(new Date(lead.next_contact_date), "dd/MM")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próximo<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete single lead */}
      <AlertDialog open={!!deleteLeadId} onOpenChange={open => !open && setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Lead</AlertDialogTitle>
            <AlertDialogDescription>Tem a certeza que deseja eliminar este lead? Esta acção não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all leads */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Todos os Leads</AlertDialogTitle>
            <AlertDialogDescription>Tem a certeza que deseja eliminar TODOS os seus leads ({totalCount})? Esta acção não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar Todos</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
