import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, RefreshCw, Edit, UserX, UserCheck, Plus, Minus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

type UserRow = {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  plan_type: string;
  weekly_limit: number;
  used_this_week: number;
  monthly_limit: number;
  used_this_month: number;
  tokens_added_manually: number;
  is_active: boolean;
  is_suspended: boolean;
  suspension_reason: string;
  registered_at: string;
  last_login_at: string;
};

export const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const { plans, getPlanByKey } = usePlanConfigs();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterState, setFilterState] = useState("all");

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    role: "",
    plan_type: "",
    weekly_limit: 0,
    monthly_limit: 0,
    tokens_bonus: 0,
    tokens_remove: 0,
    is_suspended: false,
    suspension_reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const [profilesRes, rolesRes, quotasRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, phone, registered_at, last_login_at, is_suspended, suspension_reason"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("search_quotas").select("*"),
    ]);

    const profiles = profilesRes.data || [];
    const roleMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));
    const quotaMap = new Map((quotasRes.data || []).map((q: any) => [q.user_id, q]));

    const merged: UserRow[] = profiles.map((p: any) => {
      const q = quotaMap.get(p.user_id) as any;
      return {
        user_id: p.user_id,
        full_name: p.full_name || "Sem nome",
        email: p.email || "",
        phone: (p as any).phone || "",
        role: roleMap.get(p.user_id) || "vendedor",
        plan_type: q?.plan_type || "free",
        weekly_limit: q?.weekly_limit ?? 10,
        used_this_week: q?.used_this_week ?? 0,
        monthly_limit: q?.monthly_limit ?? 10,
        used_this_month: q?.used_this_month ?? 0,
        tokens_added_manually: q?.tokens_added_manually ?? 0,
        is_active: q?.is_active ?? true,
        is_suspended: p.is_suspended ?? false,
        suspension_reason: p.suspension_reason || "",
        registered_at: p.registered_at || "",
        last_login_at: p.last_login_at || "",
      };
    });

    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Realtime subscription for new profiles
  useEffect(() => {
    const channel = supabase
      .channel("admin-profiles")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => {
        fetchUsers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchUsers]);

  // Filter logic
  useEffect(() => {
    let result = users;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(u => u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    if (filterRole !== "all") result = result.filter(u => u.role === filterRole);
    if (filterPlan !== "all") result = result.filter(u => u.plan_type === filterPlan);
    if (filterState === "active") result = result.filter(u => !u.is_suspended);
    if (filterState === "suspended") result = result.filter(u => u.is_suspended);
    setFiltered(result);
  }, [users, searchTerm, filterRole, filterPlan, filterState]);

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditForm({
      role: u.role,
      plan_type: u.plan_type,
      weekly_limit: u.weekly_limit,
      monthly_limit: u.monthly_limit,
      tokens_bonus: 0,
      tokens_remove: 0,
      is_suspended: u.is_suspended,
      suspension_reason: u.suspension_reason,
    });
  };

  const handlePlanChange = (plan: string) => {
    const config = getPlanByKey(plan) || getPlanByKey("free")!;
    setEditForm(f => ({ ...f, plan_type: plan, weekly_limit: config.weekly, monthly_limit: config.monthly }));
  };

  const logAudit = async (action: string, targetUserId: string, details: any) => {
    if (!currentUser) return;
    await supabase.from("admin_audit_log" as any).insert({
      admin_id: currentUser.id,
      target_user_id: targetUserId,
      action,
      details,
    } as any);
  };

  const saveChanges = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      // Update role
      if (editForm.role !== editUser.role) {
        await supabase.from("user_roles").update({ role: editForm.role as any }).eq("user_id", editUser.user_id);
        await logAudit("change_role", editUser.user_id, { from: editUser.role, to: editForm.role });
      }

      // Update quota
      const quotaUpdate: any = {
        plan_type: editForm.plan_type,
        weekly_limit: editForm.weekly_limit,
        monthly_limit: editForm.monthly_limit,
      };
      if (editForm.tokens_bonus > 0) {
        quotaUpdate.tokens_added_manually = (editUser.tokens_added_manually || 0) + editForm.tokens_bonus;
        await logAudit("add_tokens", editUser.user_id, { amount: editForm.tokens_bonus });
      }
      if (editForm.tokens_remove > 0) {
        const currentTokens = quotaUpdate.tokens_added_manually ?? (editUser.tokens_added_manually || 0);
        quotaUpdate.tokens_added_manually = Math.max(0, currentTokens - editForm.tokens_remove);
        await logAudit("remove_tokens", editUser.user_id, { amount: editForm.tokens_remove });
      }
      if (editForm.plan_type !== editUser.plan_type) {
        await logAudit("change_plan", editUser.user_id, { from: editUser.plan_type, to: editForm.plan_type });
      }
      await supabase.from("search_quotas").update(quotaUpdate).eq("user_id", editUser.user_id);

      // Update suspension
      if (editForm.is_suspended !== editUser.is_suspended) {
        await supabase.from("profiles").update({
          is_suspended: editForm.is_suspended,
          suspension_reason: editForm.is_suspended ? editForm.suspension_reason : null,
        } as any).eq("user_id", editUser.user_id);
        await logAudit(editForm.is_suspended ? "suspend_user" : "activate_user", editUser.user_id, {
          reason: editForm.suspension_reason,
        });
      }

      toast.success("Alterações guardadas!");
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const resetMonthlyTokens = async (userId: string) => {
    await supabase.from("search_quotas").update({ used_this_month: 0, used_this_week: 0, last_monthly_reset: new Date().toISOString().split("T")[0] } as any).eq("user_id", userId);
    await logAudit("reset_tokens", userId, { type: "monthly" });
    toast.success("Tokens semanais e mensais resetados!");
    fetchUsers();
  };

  const resetAllMonthly = async () => {
    const { error } = await supabase
      .from("search_quotas")
      .update({ used_this_month: 0, used_this_week: 0, last_monthly_reset: new Date().toISOString().split("T")[0] } as any);
    if (error) {
      toast.error("Erro ao resetar tokens. Tente novamente.");
      console.error("resetAllMonthly error:", error.message);
      return;
    }
    await logAudit("reset_all_monthly", "all", {});
    toast.success("Todos os tokens mensais e semanais foram resetados!");
    setResetAllOpen(false);
    fetchUsers();
  };

  const roleBadge = (role: string) => {
    if (role === "admin") return <Badge variant="destructive">Admin</Badge>;
    if (role === "gestor") return <Badge variant="default">Gestor</Badge>;
    return <Badge variant="secondary">Utilizador</Badge>;
  };

  const planBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: "bg-muted text-muted-foreground",
      starter: "bg-accent/20 text-accent-foreground",
      pro: "bg-primary/20 text-primary",
      business: "bg-secondary/20 text-secondary",
    };
    return <Badge className={colors[plan] || ""}>{PLAN_LABELS[plan] || plan}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2 flex-wrap">
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Papel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos papéis</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="vendedor">Utilizador</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Plano" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos planos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setResetAllOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Resetar Todos (Mês)</span><span className="sm:hidden">Reset</span>
            </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Utilizadores ({filtered.length})</CardTitle>
          <CardDescription>Gestão completa de utilizadores, planos e quotas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome / Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-center">Semana</TableHead>
                    <TableHead className="text-center">Mês</TableHead>
                    <TableHead>Registo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => {
                    const weeklyPct = u.weekly_limit > 0 ? (u.used_this_week / u.weekly_limit) * 100 : 0;
                    const totalMonthly = u.monthly_limit + u.tokens_added_manually;
                    const monthlyPct = totalMonthly > 0 ? (u.used_this_month / totalMonthly) * 100 : 0;

                    return (
                      <TableRow key={u.user_id} className={u.is_suspended ? "opacity-60" : ""}>
                        <TableCell>
                          <p className="font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email || u.user_id.slice(0, 8) + "…"}</p>
                          {u.phone && <p className="text-xs text-muted-foreground/70">{u.phone}</p>}
                        </TableCell>
                        <TableCell>{roleBadge(u.role)}</TableCell>
                        <TableCell>{planBadge(u.plan_type)}</TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <span className="text-sm font-medium">{u.used_this_week}/{u.weekly_limit}</span>
                            <Progress value={Math.min(weeklyPct, 100)} className="h-1.5 w-16 mx-auto" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <span className="text-sm font-medium">{u.used_this_month}/{totalMonthly}</span>
                            <Progress value={Math.min(monthlyPct, 100)} className="h-1.5 w-16 mx-auto" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {u.registered_at ? new Date(u.registered_at).toLocaleDateString("pt-AO") : "—"}
                        </TableCell>
                        <TableCell>
                          {u.is_suspended ? (
                            <Badge variant="destructive" className="gap-1"><UserX className="h-3 w-3" /> Suspenso</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-secondary text-secondary"><UserCheck className="h-3 w-3" /> Activo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                              <Edit className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setDeleteUser(u)} disabled={u.user_id === currentUser?.id}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Drawer */}
      <Sheet open={!!editUser} onOpenChange={open => !open && setEditUser(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {editUser && (
            <>
              <SheetHeader>
                <SheetTitle>Editar Utilizador</SheetTitle>
                <SheetDescription>{editUser.full_name} — {editUser.email || editUser.user_id.slice(0, 12)}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Role */}
                <div className="space-y-2">
                  <Label>Papel</Label>
                  <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="vendedor">Utilizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Plan */}
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select value={editForm.plan_type} onValueChange={handlePlanChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {plans.map(p => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.name} ({p.monthly}/mês)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Limite Semanal (resultados)</Label>
                    <Input type="number" min={0} value={editForm.weekly_limit} onChange={e => setEditForm(f => ({ ...f, weekly_limit: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Limite Mensal (resultados)</Label>
                    <Input type="number" min={0} value={editForm.monthly_limit} onChange={e => setEditForm(f => ({ ...f, monthly_limit: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>

                {/* Bonus tokens */}
                <div className="space-y-2">
                  <Label>Tokens Bónus (actual: {editUser.tokens_added_manually})</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Adicionar</span>
                      <div className="flex items-center gap-1">
                        <Plus className="h-4 w-4 text-emerald-500 shrink-0" />
                        <Input type="number" min={0} value={editForm.tokens_bonus} onChange={e => setEditForm(f => ({ ...f, tokens_bonus: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Revogar</span>
                      <div className="flex items-center gap-1">
                        <Minus className="h-4 w-4 text-destructive shrink-0" />
                        <Input type="number" min={0} max={editUser.tokens_added_manually} value={editForm.tokens_remove} onChange={e => setEditForm(f => ({ ...f, tokens_remove: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suspension */}
                <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
                  <div className="flex items-center justify-between">
                    <Label>Suspender Utilizador</Label>
                    <Switch checked={editForm.is_suspended} onCheckedChange={v => setEditForm(f => ({ ...f, is_suspended: v }))} />
                  </div>
                  {editForm.is_suspended && (
                    <div className="space-y-2">
                      <Label className="text-sm">Motivo da Suspensão</Label>
                      <Textarea value={editForm.suspension_reason} onChange={e => setEditForm(f => ({ ...f, suspension_reason: e.target.value }))} placeholder="Razão da suspensão..." />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => resetMonthlyTokens(editUser.user_id)}>
                    <RefreshCw className="mr-1 h-3 w-3" /> Resetar Semana/Mês
                  </Button>
                </div>

                <Button className="w-full" onClick={saveChanges} disabled={saving}>
                  {saving ? "A guardar..." : "Guardar Alterações"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reset All Dialog */}
      <Dialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Todos os Tokens Mensais</DialogTitle>
            <DialogDescription>Esta acção irá zerar os tokens mensais e semanais de TODOS os utilizadores. Tem a certeza?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetAllOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={resetAllMonthly}>Confirmar Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={open => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Utilizador</DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja remover <strong>{deleteUser?.full_name}</strong> ({deleteUser?.email})? 
              Isto irá eliminar o perfil, papel e quota do utilizador. Esta acção é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (!deleteUser) return;
              try {
                const { error } = await supabase.rpc("admin_delete_user" as any, {
                  p_user_id: deleteUser.user_id,
                });
                if (error) throw error;
                await logAudit("delete_user", deleteUser.user_id, { email: deleteUser.email, name: deleteUser.full_name });
                toast.success(`Utilizador ${deleteUser.full_name} removido permanentemente!`);
                setDeleteUser(null);
                fetchUsers();
              } catch (err: any) {
                console.error("Delete user error:", err);
                toast.error("Erro ao remover utilizador: " + (err?.message || "tente novamente"));
              }
            }}>Confirmar Remoção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
