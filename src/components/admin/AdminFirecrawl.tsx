import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Flame, TrendingUp, Users, RefreshCw, Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserQuota = {
  user_id: string;
  plan_type: string;
  used_today: number;
  used_this_week: number;
  used_this_month: number;
  monthly_limit: number;
  daily_limit: number;
  tokens_added_manually: number;
  is_active: boolean;
  full_name: string;
  email: string;
};

type DailyUsage = { date: string; count: number };

const PLAN_COLORS: Record<string, string> = {
  free: "hsl(var(--muted-foreground))",
  starter: "hsl(var(--primary))",
  pro: "hsl(var(--accent-foreground))",
  business: "hsl(var(--destructive))",
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))", "#f59e0b"];

export const AdminFirecrawl = () => {
  const [users, setUsers] = useState<UserQuota[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [stats, setStats] = useState({
    totalSearchesToday: 0,
    totalSearchesMonth: 0,
    totalTokensAvailable: 0,
    totalTokensUsed: 0,
    activeUsers: 0,
    avgUsagePercent: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const [quotasRes, profilesRes, logsRes] = await Promise.all([
      supabase.from("search_quotas").select("*"),
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("prospection_logs").select("created_at, user_id").gte("created_at", monthAgo),
    ]);

    const quotas = quotasRes.data || [];
    const profiles = profilesRes.data || [];
    const logs = logsRes.data || [];
    const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

    // Merge users
    const merged: UserQuota[] = quotas.map((q: any) => {
      const p = profileMap.get(q.user_id);
      return {
        ...q,
        full_name: p?.full_name || "—",
        email: p?.email || "",
      };
    });
    setUsers(merged);

    // Stats
    const totalSearchesToday = quotas.reduce((s: number, q: any) => s + (q.used_today || 0), 0);
    const totalSearchesMonth = quotas.reduce((s: number, q: any) => s + (q.used_this_month || 0), 0);
    const totalTokensAvailable = quotas.reduce((s: number, q: any) => s + (q.monthly_limit || 0) + (q.tokens_added_manually || 0), 0);
    const activeUsers = quotas.filter((q: any) => q.used_this_month > 0).length;
    const avgUsagePercent = totalTokensAvailable > 0
      ? Math.round((totalSearchesMonth / totalTokensAvailable) * 100)
      : 0;

    setStats({
      totalSearchesToday,
      totalSearchesMonth,
      totalTokensAvailable,
      totalTokensUsed: totalSearchesMonth,
      activeUsers,
      avgUsagePercent,
    });

    // Daily usage chart (last 30 days)
    const dayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split("T")[0];
      dayMap.set(d, 0);
    }
    for (const log of logs) {
      const d = log.created_at.split("T")[0];
      if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) || 0) + 1);
    }
    setDailyUsage(Array.from(dayMap, ([date, count]) => ({ date: date.slice(5), count })));

    setLoading(false);
  };

  // Plan distribution for pie chart
  const planDistribution = () => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      counts[u.plan_type] = (counts[u.plan_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  // Filtered users
  const filteredUsers = users
    .filter(u => {
      if (planFilter !== "all" && u.plan_type !== planFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      }
      return true;
    })
    .sort((a, b) => b.used_this_month - a.used_this_month);

  const getUsagePercent = (u: UserQuota) => {
    const total = u.monthly_limit + u.tokens_added_manually;
    if (total <= 0) return 0;
    return Math.round((u.used_this_month / total) * 100);
  };

  const getUsageBadge = (percent: number) => {
    if (percent >= 100) return <Badge variant="destructive">Esgotado</Badge>;
    if (percent >= 80) return <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">Alto</Badge>;
    if (percent >= 50) return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Médio</Badge>;
    return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Normal</Badge>;
  };

  const exportCSV = () => {
    const header = "Nome,Email,Plano,Usado Hoje,Usado Mês,Limite Mensal,Tokens Bónus,% Utilização\n";
    const rows = filteredUsers.map(u =>
      `"${u.full_name}","${u.email}","${u.plan_type}",${u.used_today},${u.used_this_month},${u.monthly_limit},${u.tokens_added_manually},${getUsagePercent(u)}%`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `firecrawl-tokens-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: "Pesquisas Hoje", value: stats.totalSearchesToday, icon: Search, color: "text-primary" },
    { label: "Pesquisas Este Mês", value: stats.totalSearchesMonth, icon: TrendingUp, color: "text-accent-foreground" },
    { label: "Tokens Disponíveis", value: stats.totalTokensAvailable, icon: Flame, color: "text-orange-500" },
    { label: "Utilizadores Activos", value: stats.activeUsers, icon: Users, color: "text-emerald-500" },
    { label: "Taxa de Utilização", value: `${stats.avgUsagePercent}%`, icon: TrendingUp, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Consumo Diário de Tokens (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Pesquisas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution()}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {planDistribution().map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Token Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Controlo de Tokens por Utilizador
            </CardTitle>
            <CardDescription>Monitorize o consumo de tokens Firecrawl de cada utilizador</CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome ou email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead className="text-center">Plano</TableHead>
                  <TableHead className="text-center">Hoje</TableHead>
                  <TableHead className="text-center">Semana</TableHead>
                  <TableHead className="text-center">Mês</TableHead>
                  <TableHead className="text-center">Limite</TableHead>
                  <TableHead className="text-center">Bónus</TableHead>
                  <TableHead className="text-center">Uso</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum utilizador encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const percent = getUsagePercent(u);
                    const total = u.monthly_limit + u.tokens_added_manually;
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <p className="font-medium text-sm">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="capitalize">{u.plan_type}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">{u.used_today}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{u.used_this_week}</TableCell>
                        <TableCell className="text-center font-mono text-sm font-semibold">{u.used_this_month}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{u.monthly_limit}</TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {u.tokens_added_manually > 0 ? (
                            <span className="text-emerald-500">+{u.tokens_added_manually}</span>
                          ) : "0"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  percent >= 100 ? "bg-destructive" :
                                  percent >= 80 ? "bg-orange-500" :
                                  percent >= 50 ? "bg-yellow-500" :
                                  "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{u.used_this_month}/{total}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{getUsageBadge(percent)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground text-right">
            {filteredUsers.length} utilizador{filteredUsers.length !== 1 ? "es" : ""} • Última atualização: {new Date().toLocaleTimeString("pt-AO")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
