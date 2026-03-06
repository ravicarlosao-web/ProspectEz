import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  change_role: "Alterar Papel",
  change_plan: "Alterar Plano",
  add_tokens: "Adicionar Tokens",
  reset_tokens: "Resetar Tokens",
  suspend_user: "Suspender",
  activate_user: "Activar",
  reset_all_monthly: "Reset Mensal Global",
};

export const AdminAudit = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction, filterDate]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name");
    if (data) setProfiles(new Map(data.map((p: any) => [p.user_id, p.full_name])));
  };

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from("admin_audit_log" as any).select("*", { count: "exact" });

    if (filterAction !== "all") query = query.eq("action", filterAction);
    if (filterDate) query = query.gte("created_at", filterDate).lt("created_at", filterDate + "T23:59:59");

    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setLogs((data as any[]) || []);
    setTotal((count as number) || 0);
    setLoading(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const actionBadge = (action: string) => {
    const variants: Record<string, any> = {
      suspend_user: "destructive",
      activate_user: "default",
      reset_all_monthly: "destructive",
    };
    return <Badge variant={variants[action] || "secondary"}>{ACTION_LABELS[action] || action}</Badge>;
  };

  const formatDetails = (details: any) => {
    if (!details || typeof details !== "object") return "—";
    const parts: string[] = [];
    if (details.from && details.to) parts.push(`${details.from} → ${details.to}`);
    if (details.amount) parts.push(`+${details.amount} tokens`);
    if (details.type) parts.push(details.type);
    if (details.reason) parts.push(details.reason);
    return parts.join(", ") || "—";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Acção" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas acções</SelectItem>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(0); }} className="w-[160px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Auditoria Admin ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Utilizador Afectado</TableHead>
                    <TableHead>Acção</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm font-medium">{profiles.get(l.admin_id) || l.admin_id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{l.target_user_id === "all" ? "Todos" : (profiles.get(l.target_user_id) || l.target_user_id?.slice(0, 8))}</TableCell>
                      <TableCell>{actionBadge(l.action)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{formatDetails(l.details)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-AO")}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registo de auditoria</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
