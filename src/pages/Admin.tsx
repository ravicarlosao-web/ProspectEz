import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Users, Search, Save, RefreshCw } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";

type UserWithQuota = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  daily_limit: number;
  used_today: number;
  last_reset_date: string;
};

const Admin = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedLimits, setEditedLimits] = useState<Record<string, number>>({});
  const [editedRoles, setEditedRoles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Acesso restrito a administradores");
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchUsers = async () => {
    setLoading(true);

    // Get profiles
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    // Get roles
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    // Get quotas
    const { data: quotas } = await supabase.from("search_quotas").select("*");

    if (!profiles) { setLoading(false); return; }

    const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
    const quotaMap = new Map((quotas || []).map((q: any) => [q.user_id, q]));

    // We need emails - get from auth via a workaround: use profiles + roles
    // Since we can't query auth.users, we'll show user_id and full_name
    const merged: UserWithQuota[] = profiles.map(p => {
      const quota = quotaMap.get(p.user_id) as any;
      return {
        user_id: p.user_id,
        email: "", // Will be populated if available
        full_name: p.full_name || "Sem nome",
        role: roleMap.get(p.user_id) || "vendedor",
        daily_limit: quota?.daily_limit ?? 50,
        used_today: quota?.used_today ?? 0,
        last_reset_date: quota?.last_reset_date ?? new Date().toISOString().split("T")[0],
      };
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const saveUserChanges = async (userId: string) => {
    setSaving(userId);

    const newLimit = editedLimits[userId];
    const newRole = editedRoles[userId];

    try {
      // Update quota limit if changed
      if (newLimit !== undefined) {
        const { error } = await supabase
          .from("search_quotas" as any)
          .upsert({ user_id: userId, daily_limit: newLimit } as any, { onConflict: "user_id" });
        if (error) throw error;
      }

      // Update role if changed
      if (newRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole as any })
          .eq("user_id", userId);
        if (error) throw error;
      }

      toast.success("Alterações guardadas!");
      setEditedLimits(prev => { const n = { ...prev }; delete n[userId]; return n; });
      setEditedRoles(prev => { const n = { ...prev }; delete n[userId]; return n; });
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao guardar alterações");
    } finally {
      setSaving(null);
    }
  };

  const resetUserUsage = async (userId: string) => {
    const { error } = await supabase
      .from("search_quotas" as any)
      .update({ used_today: 0, last_reset_date: new Date().toISOString().split("T")[0] } as any)
      .eq("user_id", userId);
    if (error) {
      toast.error("Erro ao resetar");
      return;
    }
    toast.success("Utilização resetada!");
    fetchUsers();
  };

  if (adminLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    gestor: "Gestor",
    vendedor: "Vendedor",
  };

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "destructive" as const;
    if (role === "gestor") return "default" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
          <p className="text-muted-foreground">Gestão de utilizadores e limites de pesquisa</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Utilizadores</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pesquisas Hoje</CardTitle>
            <Search className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.reduce((s, u) => s + u.used_today, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
            <Shield className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.filter(u => u.role === "admin").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Utilizadores & Quotas de Pesquisa</CardTitle>
          <CardDescription>Defina o limite diário de pesquisas para cada vendedor</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-center">Usado Hoje</TableHead>
                  <TableHead className="text-center">Limite Diário</TableHead>
                  <TableHead className="text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => {
                  const currentLimit = editedLimits[u.user_id] ?? u.daily_limit;
                  const currentRole = editedRoles[u.user_id] ?? u.role;
                  const hasChanges = editedLimits[u.user_id] !== undefined || editedRoles[u.user_id] !== undefined;
                  const usagePercent = u.daily_limit > 0 ? (u.used_today / u.daily_limit) * 100 : 0;

                  return (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}…</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentRole}
                          onValueChange={v => setEditedRoles(prev => ({ ...prev, [u.user_id]: v }))}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="gestor">Gestor</SelectItem>
                            <SelectItem value="vendedor">Vendedor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-semibold ${usagePercent >= 90 ? "text-destructive" : usagePercent >= 70 ? "text-accent" : ""}`}>
                            {u.used_today}
                          </span>
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${usagePercent >= 90 ? "bg-destructive" : usagePercent >= 70 ? "bg-accent" : "bg-primary"}`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={0}
                          max={1000}
                          value={currentLimit}
                          onChange={e => setEditedLimits(prev => ({ ...prev, [u.user_id]: parseInt(e.target.value) || 0 }))}
                          className="w-20 mx-auto text-center"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetUserUsage(u.user_id)}
                            title="Resetar utilização de hoje"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          {hasChanges && (
                            <Button
                              size="sm"
                              onClick={() => saveUserChanges(u.user_id)}
                              disabled={saving === u.user_id}
                            >
                              <Save className="mr-1 h-3 w-3" />
                              {saving === u.user_id ? "..." : "Guardar"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
