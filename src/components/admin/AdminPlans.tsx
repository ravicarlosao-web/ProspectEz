import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Zap, Plus, Trash2, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  type PlanConfig,
  type TokenPackage,
  type PaymentMethodConfig,
  DEFAULT_PLANS,
  DEFAULT_PACKAGES,
  DEFAULT_PAYMENT_METHODS,
} from "@/hooks/usePlanConfigs";

export const AdminPlans = () => {
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
  const [packages, setPackages] = useState<TokenPackage[]>(DEFAULT_PACKAGES);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(DEFAULT_PAYMENT_METHODS);
  const [saving, setSaving] = useState(false);
  const [applyFreeOpen, setApplyFreeOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("app_settings").select("key, value").in("key", ["plan_configs", "token_packages", "payment_methods"]);
    if (data) {
      const planRow = data.find((r: any) => r.key === "plan_configs");
      const pkgRow = data.find((r: any) => r.key === "token_packages");
      const pmRow = data.find((r: any) => r.key === "payment_methods");
      if (planRow) try { setPlans(JSON.parse(planRow.value)); } catch {}
      if (pkgRow) try { setPackages(JSON.parse(pkgRow.value)); } catch {}
      if (pmRow) try { setPaymentMethods(JSON.parse(pmRow.value)); } catch {}
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
      await supabase.from("app_settings").upsert(
        { key: "payment_methods", value: JSON.stringify(paymentMethods) },
        { onConflict: "key" }
      );

      // Propagate new limits to all existing users on each plan
      for (const plan of plans) {
        const { data: usersOnPlan } = await supabase
          .from("search_quotas")
          .select("user_id")
          .eq("plan_type", plan.key);

        if (usersOnPlan && usersOnPlan.length > 0) {
          for (const u of usersOnPlan) {
            await supabase.from("search_quotas").update({
              daily_limit: plan.daily,
              weekly_limit: plan.weekly,
              monthly_limit: plan.monthly,
            }).eq("user_id", u.user_id);
          }
        }
      }

      toast.success("Configurações guardadas e aplicadas a todos os utilizadores!");
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

  const updatePaymentMethod = (idx: number, field: keyof PaymentMethodConfig, value: string) => {
    setPaymentMethods(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const addPaymentMethod = () => {
    setPaymentMethods(prev => [...prev, { value: `metodo_${prev.length + 1}`, label: "", details: "" }]);
  };

  const removePaymentMethod = (idx: number) => {
    setPaymentMethods(prev => prev.filter((_, i) => i !== idx));
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
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Configuração de Planos</CardTitle>
            <CardDescription>Defina os limites e preços de cada plano</CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setApplyFreeOpen(true)}>
              <Zap className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Aplicar Free a Todos</span><span className="sm:hidden">Free</span>
            </Button>
            <Button size="sm" onClick={savePlans} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "..." : "Guardar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[600px]">
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
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[450px]">
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

      {/* Payment Methods */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Métodos de Pagamento
            </CardTitle>
            <CardDescription>Configure os dados bancários e referências que os clientes verão ao pagar</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 self-start" onClick={addPaymentMethod}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.map((method, i) => (
            <div key={i} className="flex flex-col sm:flex-row items-start gap-3 p-3 sm:p-4 rounded-lg border bg-muted/30">
              <div className="flex-1 w-full grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Identificador</label>
                  <Input
                    value={method.value}
                    onChange={e => updatePaymentMethod(i, "value", e.target.value)}
                    placeholder="ex: transferencia"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Nome visível</label>
                  <Input
                    value={method.label}
                    onChange={e => updatePaymentMethod(i, "label", e.target.value)}
                    placeholder="ex: Transferência Bancária"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Dados / Referência</label>
                  <Input
                    value={method.details}
                    onChange={e => updatePaymentMethod(i, "details", e.target.value)}
                    placeholder="ex: IBAN: AO06..."
                  />
                </div>
              </div>
              <Button variant="ghost" size="icon" className="mt-5 text-muted-foreground hover:text-destructive" onClick={() => removePaymentMethod(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {paymentMethods.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhum método configurado. Adicione pelo menos um.</p>
          )}
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
