import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

const PAGE_SIZE = 20;

export const AdminLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, filterUser, filterStatus, filterDate]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name");
    if (data) setProfiles(new Map(data.map((p: any) => [p.user_id, p.full_name])));
  };

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from("prospection_logs").select("*", { count: "exact" });

    if (filterUser) {
      // Find matching user_ids
      const matchingIds = Array.from(profiles.entries())
        .filter(([_, name]) => name.toLowerCase().includes(filterUser.toLowerCase()))
        .map(([id]) => id);
      if (matchingIds.length > 0) query = query.in("user_id", matchingIds);
      else { setLogs([]); setTotal(0); setLoading(false); return; }
    }
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterDate) query = query.gte("created_at", filterDate).lt("created_at", filterDate + "T23:59:59");

    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setLogs(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const exportCSV = () => {
    const header = "Utilizador,Query,Resultados,Status,Data\n";
    const rows = logs.map(l => {
      const name = profiles.get(l.user_id || "") || l.user_id || "—";
      return `"${name}","${l.query}",${l.results_count || 0},${l.status},${l.created_at}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-prospeccao-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar por utilizador..." value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(0); }} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Completo</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(0); }} className="w-[160px]" />
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logs de Prospecção ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto"><Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilizador</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-center">Resultados</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm font-medium">{profiles.get(l.user_id || "") || "—"}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">{l.query}</TableCell>
                      <TableCell className="text-center">{l.results_count ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === "completed" ? "default" : "destructive"}>
                          {l.status === "completed" ? "Completo" : l.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("pt-AO")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>

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
