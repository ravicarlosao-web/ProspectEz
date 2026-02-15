import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Handshake, Trophy, AlertTriangle } from "lucide-react";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const FUNNEL_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e", "#ef4444"];

const Dashboard = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase.from("leads").select("status");
      if (data) {
        const c: Record<string, number> = {};
        data.forEach((l) => { c[l.status] = (c[l.status] || 0) + 1; });
        setCounts(c);
      }
      setLoading(false);
    };
    fetchCounts();
  }, []);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const statCards = [
    { label: "Total de Leads", value: total, icon: Users, color: "text-blue-500" },
    { label: "Contactados", value: counts.contactado || 0, icon: UserCheck, color: "text-amber-500" },
    { label: "Em Negociação", value: counts.em_negociacao || 0, icon: Handshake, color: "text-purple-500" },
    { label: "Fechados", value: counts.fechado_ganho || 0, icon: Trophy, color: "text-green-500" },
  ];

  const funnelData = Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => ({
    name: label,
    value: counts[key] || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel Principal</h1>
        <p className="text-muted-foreground">Visão geral da prospecção de clientes</p>
      </div>

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
              <BarChart data={funnelData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {funnelData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
