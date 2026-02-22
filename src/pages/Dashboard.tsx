import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Handshake, Trophy, AlertTriangle, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, SERVICE_TYPE_LABELS } from "@/lib/constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  FunnelChart, Funnel, LabelList,
} from "recharts";

const FUNNEL_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e", "#ef4444"];
const SERVICE_COLORS: Record<string, string> = {
  social_media: "#8b5cf6",
  website: "#3b82f6",
  ambos: "#22c55e",
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, company, status, service_type, created_at, updated_at")
        .order("updated_at", { ascending: false });
      setLeads((data as Lead[]) || []);
      setLoading(false);
    };
    fetchLeads();
  }, []);

  const counts: Record<string, number> = {};
  const serviceCounts: Record<string, number> = {};
  leads.forEach((l) => {
    counts[l.status] = (counts[l.status] || 0) + 1;
    const st = l.service_type || "sem_tipo";
    serviceCounts[st] = (serviceCounts[st] || 0) + 1;
  });

  const total = leads.length;

  const statCards = [
    { label: "Total de Leads", value: total, icon: Users, color: "text-blue-500" },
    { label: "Contactados", value: counts.contactado || 0, icon: UserCheck, color: "text-amber-500" },
    { label: "Em Negociação", value: counts.em_negociacao || 0, icon: Handshake, color: "text-purple-500" },
    { label: "Fechados", value: counts.fechado_ganho || 0, icon: Trophy, color: "text-green-500" },
  ];

  const conversionRate = total > 0 ? ((counts.fechado_ganho || 0) / total * 100).toFixed(1) : "0";
  const lossRate = total > 0 ? ((counts.perdido || 0) / total * 100).toFixed(1) : "0";

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
    serviceData.push({ name: "Não definido", value: noServiceCount, fill: "#94a3b8" });
  }

  // Recent activity — last 10 updated leads
  const recentLeads = leads.slice(0, 8);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel Principal</h1>
        <p className="text-muted-foreground">Visão geral da prospecção de clientes</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "—" : s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion metrics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{loading ? "—" : `${conversionRate}%`}</div>
            <p className="text-xs text-muted-foreground mt-1">Leads fechados / total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Perda</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{loading ? "—" : `${lossRate}%`}</div>
            <p className="text-xs text-muted-foreground mt-1">Leads perdidos / total</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Funnel chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle className="mb-2 h-8 w-8" />
                <p>Sem leads ainda. Comece por adicionar clientes!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [value, "Leads"]} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={FUNNEL_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Service type pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads por Tipo de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceData.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle className="mb-2 h-8 w-8" />
                <p>Nenhum lead com serviço definido.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {serviceData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, "Leads"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Actividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem actividade recente.</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
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
