import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Shield, UserX, UserPlus, FileText, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type DailySearch = { date: string; count: number };

export const AdminOverview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    searchesMonth: 0,
    suspendedUsers: 0,
    newThisWeek: 0,
    totalLeads: 0,
  });
  const [dailySearches, setDailySearches] = useState<DailySearch[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const [profilesRes, quotasRes, leadsRes, logsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, registered_at, is_suspended"),
      supabase.from("search_quotas").select("user_id, used_today, used_this_month"),
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("prospection_logs").select("created_at, user_id").gte("created_at", monthAgo),
    ]);

    const profiles = profilesRes.data || [];
    const quotas = quotasRes.data || [];
    const quotaMap = new Map(quotas.map((q: any) => [q.user_id, q]));

    // Stats
    const totalUsers = profiles.length;
    const activeToday = quotas.filter((q: any) => q.used_today > 0).length;
    const searchesMonth = quotas.reduce((s: number, q: any) => s + (q.used_this_month || 0), 0);
    const suspendedUsers = profiles.filter((p: any) => p.is_suspended).length;
    const newThisWeek = profiles.filter((p: any) => p.registered_at && p.registered_at >= weekAgo).length;
    const totalLeads = leadsRes.count || 0;

    setStats({ totalUsers, activeToday, searchesMonth, suspendedUsers, newThisWeek, totalLeads });

    // Daily searches (last 30 days)
    const logs = logsRes.data || [];
    const dayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split("T")[0];
      dayMap.set(d, 0);
    }
    for (const log of logs) {
      const d = log.created_at.split("T")[0];
      if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) || 0) + 1);
    }
    setDailySearches(Array.from(dayMap, ([date, count]) => ({ date: date.slice(5), count })));

    // Top 5 users by monthly searches
    const sorted = [...quotas].sort((a: any, b: any) => (b.used_this_month || 0) - (a.used_this_month || 0)).slice(0, 5);
    setTopUsers(sorted.map((q: any) => {
      const p = profiles.find((pr: any) => pr.user_id === q.user_id);
      return { name: p?.full_name || "—", email: p?.email || "", used: q.used_this_month || 0 };
    }));

    // Recent 5 users
    const sortedProfiles = [...profiles].sort((a: any, b: any) =>
      new Date(b.registered_at || 0).getTime() - new Date(a.registered_at || 0).getTime()
    ).slice(0, 5);
    setRecentUsers(sortedProfiles.map((p: any) => ({
      name: p.full_name || "—",
      email: p.email || "",
      date: p.registered_at ? new Date(p.registered_at).toLocaleDateString("pt-AO") : "—",
    })));

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Utilizadores", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Activos Hoje", value: stats.activeToday, icon: TrendingUp, color: "text-secondary" },
    { label: "Pesquisas Este Mês", value: stats.searchesMonth, icon: Search, color: "text-accent" },
    { label: "Suspensos", value: stats.suspendedUsers, icon: UserX, color: "text-destructive" },
    { label: "Novos Esta Semana", value: stats.newThisWeek, icon: UserPlus, color: "text-info" },
    { label: "Total Leads", value: stats.totalLeads, icon: FileText, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pesquisas por Dia (Últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySearches}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Utilizadores Mais Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Pesquisas (Mês)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{u.used}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimos Registos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm">{u.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
