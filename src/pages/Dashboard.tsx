import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, UserCheck, Handshake, Trophy, AlertTriangle, TrendingUp, Clock, Target } from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

const FUNNEL_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e", "#ef4444"];
const SERVICE_COLORS: Record<string, string> = {
  social_media: "#8b5cf6",
  website: "#3b82f6",
  ambos: "#22c55e",
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  social_media: "Social Media",
  website: "Website",
  ambos: "Ambos",
};

type Lead = {
  id: string;
  name: string;
  company: string | null;
  status: string;
  service_type: string | null;
  created_at: string;
  updated_at: string;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, company, status, service_type, created_at, updated_at")
        .order("updated_at", { ascending: false });
      setLeads((data as Lead[]) || []);
      setLoading(false);
    };
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
        if (data?.full_name) setUserName(data.full_name.split(" ")[0]);
      }
    };
    fetchData();
    fetchProfile();
  }, [user]);

  const counts: Record<string, number> = {};
  const serviceCounts: Record<string, number> = {};
  leads.forEach((l) => {
    counts[l.status] = (counts[l.status] || 0) + 1;
    const st = l.service_type || "sem_tipo";
    serviceCounts[st] = (serviceCounts[st] || 0) + 1;
  });

  const total = leads.length;

  const statCards = [
    { label: "Total de Leads", value: total, icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-400" },
    { label: "Contactados", value: counts.contactado || 0, icon: UserCheck, iconBg: "bg-amber-500/10", iconColor: "text-amber-400" },
    { label: "Em Negociação", value: counts.em_negociacao || 0, icon: Handshake, iconBg: "bg-purple-500/10", iconColor: "text-purple-400" },
    { label: "Fechados", value: counts.fechado_ganho || 0, icon: Trophy, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400" },
  ];

  const conversionRate = total > 0 ? ((counts.fechado_ganho || 0) / total * 100) : 0;
  const lossRate = total > 0 ? ((counts.perdido || 0) / total * 100) : 0;

  // Weekly goal: 10 new leads
  const weeklyGoal = 10;
  const thisWeekLeads = leads.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;
  const weeklyProgress = Math.min((thisWeekLeads / weeklyGoal) * 100, 100);

  const funnelData = Object.entries(LEAD_STATUS_LABELS).map(([key, label], i) => ({
    name: label,
    value: counts[key] || 0,
    fill: FUNNEL_COLORS[i],
  }));

  const serviceData = Object.entries(serviceCounts)
    .filter(([k]) => k !== "sem_tipo")
    .map(([key, value]) => ({
      name: SERVICE_TYPE_LABELS[key] || key,
      value,
      fill: SERVICE_COLORS[key] || "#94a3b8",
    }));

  const noServiceCount = serviceCounts["sem_tipo"] || 0;
  if (noServiceCount > 0) {
    serviceData.push({ name: "Não definido", value: noServiceCount, fill: "#475569" });
  }

  const recentLeads = leads.slice(0, 8);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {userName || "Utilizador"}! 👋
        </h1>
        <p className="text-muted-foreground text-sm">Aqui está o resumo da sua prospecção</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="stat-card border-border/50 bg-card/80">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-bold mt-2">{loading ? "—" : s.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.iconBg}`}>
                  <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly goal + Conversion */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Meta Semanal</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-bold">{thisWeekLeads}</span>
              <span className="text-sm text-muted-foreground">/ {weeklyGoal} leads</span>
            </div>
            <Progress value={weeklyProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{weeklyProgress.toFixed(0)}% concluído</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium">Taxa de Conversão</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{loading ? "—" : `${conversionRate.toFixed(1)}%`}</p>
            <p className="text-xs text-muted-foreground mt-1">Leads fechados / total</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium">Taxa de Perda</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{loading ? "—" : `${lossRate.toFixed(1)}%`}</p>
            <p className="text-xs text-muted-foreground mt-1">Leads perdidos / total</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle className="mb-2 h-8 w-8" />
                <p className="text-sm">Sem leads ainda. Comece por adicionar clientes!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} stroke="hsl(215, 15%, 35%)" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(220, 22%, 10%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "#fff" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={FUNNEL_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leads por Tipo de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceData.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle className="mb-2 h-8 w-8" />
                <p className="text-sm">Nenhum lead com serviço definido.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    stroke="none"
                  >
                    {serviceData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(220, 22%, 10%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Actividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem actividade recente.</p>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/30 p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.company || "Sem empresa"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className={`text-xs ${LEAD_STATUS_COLORS[lead.status] || ""}`}>
                      {LEAD_STATUS_LABELS[lead.status] || lead.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatDate(lead.updated_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
