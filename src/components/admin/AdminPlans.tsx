import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type PlanConfig = {
  name: string;
  key: string;
  daily: number;
  weekly: number;
  monthly: number;
  priceKz: number;
  priceUsd: number;
};

type TokenPackage = {
  name: string;
  quantity: number;
  priceKz: number;
  priceUsd: number;
};

const DEFAULT_PLANS: PlanConfig[] = [
  { name: "Free", key: "free", daily: 3, weekly: 0, monthly: 3, priceKz: 0, priceUsd: 0 },
  { name: "Starter", key: "starter", daily: 5, weekly: 0, monthly: 30, priceKz: 5000, priceUsd: 5 },
  { name: "Pro", key: "pro", daily: 15, weekly: 0, monthly: 100, priceKz: 15000, priceUsd: 15 },
  { name: "Business", key: "business", daily: 30, weekly: 0, monthly: 300, priceKz: 40000, priceUsd: 40 },
];

const DEFAULT_PACKAGES: TokenPackage[] = [
  { name: "Mini", quantity: 10, priceKz: 2000, priceUsd: 2 },
  { name: "Médio", quantity: 50, priceKz: 8000, priceUsd: 8 },
  { name: "Grande", quantity: 200, priceKz: 25000, priceUsd: 25 },
];

export const AdminPlans = () => {
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
  const [packages, setPackages] = useState<TokenPackage[]>(DEFAULT_PACKAGES);
  const [saving, setSaving] = useState(false);
  const [applyFreeOpen, setApplyFreeOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("app_settings").select("key, value").in("key", ["plan_configs", "token_packages"]);
    if (data) {
      const planRow = data.find((r: any) => r.key === "plan_configs");
      const pkgRow = data.find((r: any) => r.key === "token_packages");
      if (planRow) try { setPlans(JSON.parse(planRow.value)); } catch {}
      if (pkgRow) try { setPackages(JSON.parse(pkgRow.value)); } catch {}
    }
  };

  const savePlans = async () => {
    setSaving(true);
    try {
      await supabase.from("app_settings").upsert(
        { key: "plan_configs", value: JSON.stringify(plans) },
        { onConflict: "key" }
      );
      await supabase.from("app_settings").upsert(
        { key: "token_packages", value: JSON.stringify(packages) },
        { onConflict: "key" }
      );
      toast.success("Configurações de planos guardadas!");
    } catch {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = (idx: number, field: keyof PlanConfig, value: any) => {
    setPlans(prev => prev.map((p, i) => i === idx ? { ...p, [field]: typeof p[field] === "number" ? (parseInt(value) || 0) : value } : p));
  };

  const updatePackage = (idx: number, field: keyof TokenPackage, value: any) => {
    setPackages(prev => prev.map((p, i) => i === idx ? { ...p, [field]: typeof p[field] === "number" ? (parseInt(value) || 0) : value } : p));
  };

  const applyFreeToAll = async () => {
    const freePlan = plans.find(p => p.key === "free");
    if (!freePlan) return;
    
    const { data: freeUsers } = await supabase.from("search_quotas").select("user_id").eq("plan_type", "free");
    if (freeUsers && freeUsers.length > 0) {
      for (const u of freeUsers) {
        await supabase.from("search_quotas").update({
          daily_limit: freePlan.daily,
          monthly_limit: freePlan.monthly,
          weekly_limit: freePlan.weekly,
        } as any).eq("user_id", u.user_id);
      }
      toast.success(`${freeUsers.length} utilizadores free actualizados!`);
    }
    setApplyFreeOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Plans */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Configuração de Planos</CardTitle>
            <CardDescription>Defina os limites e preços de cada plano</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setApplyFreeOpen(true)}>
              <Zap className="mr-1 h-4 w-4" /> Aplicar Free a Todos
            </Button>
            <Button onClick={savePlans} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "..." : "Guardar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead className="text-center">Diário</TableHead>
                <TableHead className="text-center">Semanal</TableHead>
                <TableHead className="text-center">Mensal</TableHead>
                <TableHead className="text-center">Preço (Kz)</TableHead>
                <TableHead className="text-center">Preço (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p, i) => (
                <TableRow key={p.key}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Input type="number" min={0} value={p.daily} onChange={e => updatePlan(i, "daily", e.target.value)} className="w-20 mx-auto text-center" /></TableCell>
                  <TableCell><Input type="number" min={0} value={p.weekly} onChange={e => updatePlan(i, "weekly", e.target.value)} className="w-20 mx-auto text-center" /></TableCell>
                  <TableCell><Input type="number" min={0} value={p.monthly} onChange={e => updatePlan(i, "monthly", e.target.value)} className="w-20 mx-auto text-center" /></TableCell>
                  <TableCell><Input type="number" min={0} value={p.priceKz} onChange={e => updatePlan(i, "priceKz", e.target.value)} className="w-24 mx-auto text-center" /></TableCell>
                  <TableCell><Input type="number" min={0} value={p.priceUsd} onChange={e => updatePlan(i, "priceUsd", e.target.value)} className="w-20 mx-auto text-center" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Token Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pacotes de Tokens Avulso</CardTitle>
          <CardDescription>Configure pacotes de tokens para compra individual</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead className="text-center">Preço (Kz)</TableHead>
                <TableHead className="text-center">Preço (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Input value={p.name} onChange={e => updatePackage(i, "name", e.target.value)} className="w-32" />
                  </TableCell>
                  <TableCell><Input type="number" min={1} value={p.quantity} onChange={e => updatePackage(i, "quantity", e.target.value)} className="w-20 mx-auto text-center" /></TableCell>
                  <TableCell><Input type="number" min={0} value={p.priceKz} onChange={e => updatePackage(i, "priceKz", e.target.value)} className="w-24 mx-auto text-center" /></TableCell>
                  <TableCell><Input type="number" min={0} value={p.priceUsd} onChange={e => updatePackage(i, "priceUsd", e.target.value)} className="w-20 mx-auto text-center" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={applyFreeOpen} onOpenChange={setApplyFreeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Plano Free</DialogTitle>
            <DialogDescription>Actualizar os limites de todos os utilizadores com plano Free para os valores actuais da configuração?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyFreeOpen(false)}>Cancelar</Button>
            <Button onClick={applyFreeToAll}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
