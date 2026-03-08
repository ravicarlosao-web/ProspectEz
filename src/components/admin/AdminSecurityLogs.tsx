import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, ShieldX, Lock, AlertTriangle, Search, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

type SecurityLog = {
  id: string;
  event_type: string;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const eventConfig: Record<string, { label: string; color: string; icon: typeof ShieldAlert }> = {
  login_failed: { label: "Login Falhado", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: ShieldAlert },
  account_locked: { label: "Conta Bloqueada", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Lock },
  login_while_locked: { label: "Tentativa Bloqueada", color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldX },
  password_reset_request: { label: "Recuperação Senha", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: AlertTriangle },
};

export function AdminSecurityLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("security_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs((data as SecurityLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter((log) => {
    const matchesSearch = !search || 
      log.email?.toLowerCase().includes(search.toLowerCase()) ||
      log.ip_address?.includes(search);
    const matchesEvent = eventFilter === "all" || log.event_type === eventFilter;
    return matchesSearch && matchesEvent;
  });

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter(l => l.created_at.slice(0, 10) === today);
  const failedToday = todayLogs.filter(l => l.event_type === "login_failed").length;
  const lockedToday = todayLogs.filter(l => l.event_type === "account_locked").length;
  const uniqueIPs = new Set(todayLogs.map(l => l.ip_address)).size;
  const uniqueEmails = new Set(logs.filter(l => l.event_type === "account_locked").map(l => l.email)).size;

  const exportCSV = () => {
    const header = "Data,Evento,Email,IP,User Agent,Detalhes\n";
    const rows = filtered.map(l =>
      `"${format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss")}","${eventConfig[l.event_type]?.label || l.event_type}","${l.email || ""}","${l.ip_address || ""}","${(l.user_agent || "").slice(0, 100)}","${JSON.stringify(l.details || {})}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `security-logs-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Logs de Segurança</h2>
          <p className="text-sm text-muted-foreground">Tentativas de login falhadas e acessos suspeitos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Falhas Hoje</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-foreground">{failedToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Bloqueios Hoje</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{lockedToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">IPs Únicos (Hoje)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-foreground">{uniqueIPs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Contas Bloqueadas</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-foreground">{uniqueEmails}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por email ou IP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            <SelectItem value="login_failed">Login Falhado</SelectItem>
            <SelectItem value="account_locked">Conta Bloqueada</SelectItem>
            <SelectItem value="login_while_locked">Tentativa Bloqueada</SelectItem>
            <SelectItem value="password_reset_request">Recuperação Senha</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Data/Hora</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</TableCell></TableRow>
                ) : (
                  filtered.map((log) => {
                    const config = eventConfig[log.event_type] || { label: log.event_type, color: "bg-muted text-muted-foreground", icon: ShieldAlert };
                    const Icon = config.icon;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${config.color} gap-1`}>
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{log.email || "—"}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{log.ip_address || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.details && Object.keys(log.details).length > 0
                            ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(", ")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground text-center">A mostrar {filtered.length} de {logs.length} registos</p>
    </div>
  );
}
