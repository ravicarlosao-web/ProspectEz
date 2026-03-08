import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import { Users, UserCheck, Handshake, Trophy, AlertTriangle, TrendingUp, Clock, Target, Bell, CalendarDays, MapPin } from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/constants";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
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
  province: string | null;
  created_at: string;
  updated_at: string;
  next_contact_date: string | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
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
        .select("id, name, company, status, service_type, province, created_at, updated_at, next_contact_date")
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

  // Follow-up alerts
  const today = new Date().toDateString();
  const overdueLeads = leads.filter(l => l.next_contact_date && new Date(l.next_contact_date) < new Date(today));
  const todayLeads = leads.filter(l => l.next_contact_date && new Date(l.next_contact_date).toDateString() === today);
  const upcomingLeads = leads.filter(l => {
    if (!l.next_contact_date) return false;
    const d = new Date(l.next_contact_date);
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return d > now && d <= threeDays;
  });

  const statCards = [
    { label: "Total de Leads", value: total, icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-400" },
    { label: "Contactados", value: counts.contactado || 0, icon: UserCheck, iconBg: "bg-amber-500/10", iconColor: "text-amber-400" },
    { label: "Em Negociação", value: counts.em_negociacao || 0, icon: Handshake, iconBg: "bg-purple-500/10", iconColor: "text-purple-400" },
    { label: "Fechados", value: counts.fechado_ganho || 0, icon: Trophy, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400" },
  ];

  const conversionRate = total > 0 ? ((counts.fechado_ganho || 0) / total * 100) : 0;
  const lossRate = total > 0 ? ((counts.perdido || 0) / total * 100) : 0;


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

  // Monthly evolution data (last 6 months)
  const monthlyData = (() => {
    const months: { month: string; novos: number; fechados: number; perdidos: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-AO", { month: "short", year: "2-digit" });
      const inMonth = leads.filter(l => l.created_at.startsWith(monthKey));
      months.push({
        month: label,
        novos: inMonth.length,
        fechados: inMonth.filter(l => l.status === "fechado_ganho").length,
        perdidos: inMonth.filter(l => l.status === "perdido").length,
      });
    }
    return months;
  })();

  // Province data
  const provinceData = (() => {
    const provinceCounts: Record<string, number> = {};
    leads.forEach(l => {
      const p = l.province || "Não definida";
      provinceCounts[p] = (provinceCounts[p] || 0) + 1;
    });
    return Object.entries(provinceCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  })();

  const recentLeads = leads.slice(0, 8);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const hasFollowUpAlerts = overdueLeads.length > 0 || todayLeads.length > 0 || upcomingLeads.length > 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {userName || "Utilizador"}! 👋
        </h1>
        <p className="text-muted-foreground text-sm">Aqui está o resumo da sua prospecção</p>
      </motion.div>

      {/* Follow-up Alerts */}
      {hasFollowUpAlerts && !loading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                Lembretes de Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueLeads.length > 0 && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {overdueLeads.length} follow-up{overdueLeads.length > 1 ? "s" : ""} atrasado{overdueLeads.length > 1 ? "s" : ""}
                  </p>
                  <div className="mt-2 space-y-1">
                    {overdueLeads.slice(0, 5).map(l => (
                      <p key={l.id} className="text-xs text-destructive/80">
                        • {l.name} {l.company ? `(${l.company})` : ""} — {format(new Date(l.next_contact_date!), "dd/MM/yyyy")}
                      </p>
                    ))}
                    {overdueLeads.length > 5 && <p className="text-xs text-destructive/60">... e mais {overdueLeads.length - 5}</p>}
                  </div>
                </div>
              )}
              {todayLeads.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-sm font-medium text-amber-400 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {todayLeads.length} follow-up{todayLeads.length > 1 ? "s" : ""} para hoje
                  </p>
                  <div className="mt-2 space-y-1">
                    {todayLeads.slice(0, 5).map(l => (
                      <p key={l.id} className="text-xs text-amber-400/80">
                        • {l.name} {l.company ? `(${l.company})` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {upcomingLeads.length > 0 && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-sm font-medium text-blue-400 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {upcomingLeads.length} follow-up{upcomingLeads.length > 1 ? "s" : ""} nos próximos 3 dias
                  </p>
                  <div className="mt-2 space-y-1">
                    {upcomingLeads.slice(0, 5).map(l => (
                      <p key={l.id} className="text-xs text-blue-400/80">
                        • {l.name} {l.company ? `(${l.company})` : ""} — {format(new Date(l.next_contact_date!), "dd/MM")}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <Card className="stat-card border-border/50 bg-card/80">
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
          </motion.div>
        ))}
      </div>

      {/* Weekly goal + Conversion */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
            title: "Taxa de Conversão",
            content: (
              <>
                <p className="text-2xl font-bold text-emerald-400">{loading ? "—" : `${conversionRate.toFixed(1)}%`}</p>
                <p className="text-xs text-muted-foreground mt-1">Leads fechados / total</p>
              </>
            ),
          },
          {
            icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
            title: "Taxa de Perda",
            content: (
              <>
                <p className="text-2xl font-bold text-red-400">{loading ? "—" : `${lossRate.toFixed(1)}%`}</p>
                <p className="text-xs text-muted-foreground mt-1">Leads perdidos / total</p>
              </>
            ),
          },
        ].map((item, i) => (
          <motion.div key={item.title} custom={i} initial="hidden" animate="visible" variants={scaleIn}>
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  {item.icon}
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                {item.content}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            title: "Funil de Conversão",
            content: total === 0 && !loading ? (
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
            ),
          },
          {
            title: "Leads por Tipo de Serviço",
            content: serviceData.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle className="mb-2 h-8 w-8" />
                <p className="text-sm">Nenhum lead com serviço definido.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={serviceData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} stroke="none">
                    {serviceData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(220, 22%, 10%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ),
          },
        ].map((chart, i) => (
          <motion.div key={chart.title} custom={i} initial="hidden" animate="visible" variants={scaleIn}>
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{chart.title}</CardTitle>
              </CardHeader>
              <CardContent>{chart.content}</CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Monthly Evolution + Province charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div custom={0} initial="hidden" animate="visible" variants={scaleIn}>
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Evolução Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {total === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertTriangle className="mb-2 h-8 w-8" />
                  <p className="text-sm">Sem dados para mostrar.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 18%)" />
                    <XAxis dataKey="month" stroke="hsl(215, 15%, 45%)" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="hsl(215, 15%, 35%)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(220, 22%, 10%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "#fff" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="novos" name="Novos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="fechados" name="Fechados" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="perdidos" name="Perdidos" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div custom={1} initial="hidden" animate="visible" variants={scaleIn}>
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Leads por Província
              </CardTitle>
            </CardHeader>
            <CardContent>
              {provinceData.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertTriangle className="mb-2 h-8 w-8" />
                  <p className="text-sm">Sem dados de província.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={provinceData} layout="vertical">
                    <XAxis type="number" allowDecimals={false} stroke="hsl(215, 15%, 35%)" fontSize={11} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(220, 22%, 10%)", border: "1px solid hsl(220, 18%, 18%)", borderRadius: "8px", color: "#fff" }} />
                    <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]} barSize={20} fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>


      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
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
                {recentLeads.map((lead, i) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.05, duration: 0.3 }}
                    className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/30 p-3 transition-colors hover:bg-muted/50"
                  >
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
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;
