import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CreditCard, Upload, Check, Clock, XCircle, Zap, Loader2, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

type Plan = {
  key: string;
  name: string;
  tokens: number;
  priceKz: number;
  priceUsd: number;
  features: string[];
};

type Payment = {
  id: string;
  plan_key: string | null;
  package_key: string | null;
  amount_kz: number;
  amount_usd: number;
  payment_method: string;
  status: string;
  created_at: string;
  admin_notes: string | null;
};

const PLANS: Plan[] = [
  { key: "free", name: "Free", tokens: 3, priceKz: 0, priceUsd: 0, features: ["3 pesquisas/mês", "Acesso básico"] },
  { key: "starter", name: "Starter", tokens: 30, priceKz: 5000, priceUsd: 5, features: ["30 pesquisas/mês", "Suporte por email"] },
  { key: "pro", name: "Pro", tokens: 100, priceKz: 15000, priceUsd: 15, features: ["100 pesquisas/mês", "Suporte prioritário", "Templates ilimitados"] },
  { key: "business", name: "Business", tokens: 300, priceKz: 35000, priceUsd: 35, features: ["300 pesquisas/mês", "Suporte dedicado", "API access", "Multi-utilizadores"] },
];

type PaymentMethod = {
  value: string;
  label: string;
  details: string;
};

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { value: "transferencia", label: "Transferência Bancária", details: "IBAN: AO06 0040 0000 1234 5678 9012 3" },
  { value: "multicaixa", label: "Multicaixa Express", details: "Referência: 12345 | Entidade: 12345" },
];

const Finance = () => {
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quota, setQuota] = useState<{ used_this_month: number; monthly_limit: number; tokens_added_manually: number } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(DEFAULT_PAYMENT_METHODS);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch current quota/plan
    const { data: quotaData } = await supabase
      .from("search_quotas")
      .select("plan_type, used_this_month, monthly_limit, tokens_added_manually")
      .eq("user_id", user.id)
      .single();

    if (quotaData) {
      setCurrentPlan(quotaData.plan_type);
      setQuota({
        used_this_month: quotaData.used_this_month,
        monthly_limit: quotaData.monthly_limit,
        tokens_added_manually: quotaData.tokens_added_manually,
      });
    }

    // Fetch payment history
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (paymentsData) {
      setPayments(paymentsData);
    }

    // Fetch payment methods from settings
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "payment_methods")
      .single();

    if (settingsData?.value) {
      try {
        const methods = JSON.parse(settingsData.value);
        if (Array.isArray(methods) && methods.length > 0) {
          setPaymentMethods(methods);
        }
      } catch { /* keep defaults */ }
    }

    setIsLoading(false);
  };

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Apenas ficheiros PDF são aceites");
      return;
    }

    if (file.size > 1048576) {
      toast.error("O ficheiro deve ter no máximo 1MB");
      return;
    }

    setReceiptFile(file);
  };

  const handleSubmitPayment = async () => {
    if (!selectedPlan || !receiptFile) {
      toast.error("Por favor selecione um plano e envie o comprovativo");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Upload receipt to storage
      const fileName = `${user.id}/${Date.now()}_${receiptFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // Create payment record
      const { error: insertError } = await supabase.from("payments").insert({
        user_id: user.id,
        plan_key: selectedPlan.key,
        amount_kz: selectedPlan.priceKz,
        amount_usd: selectedPlan.priceUsd,
        payment_method: paymentMethod,
        status: "pendente",
        receipt_url: fileName,
      });

      if (insertError) throw insertError;

      toast.success("Pagamento submetido! Aguarde a aprovação do administrador.");
      setIsDialogOpen(false);
      setSelectedPlan(null);
      setReceiptFile(null);
      fetchData();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Erro ao submeter pagamento. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-emerald-500/15 text-emerald-400"><Check className="h-3 w-3 mr-1" /> Aprovado</Badge>;
      case "rejeitado":
        return <Badge className="bg-red-500/15 text-red-400"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-400"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
    }
  };

  const tokensRemaining = quota ? (quota.monthly_limit + quota.tokens_added_manually) - quota.used_this_month : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Gerencie o seu plano e pagamentos</p>
      </div>

      {/* Current Plan Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Plano Atual: {PLANS.find(p => p.key === currentPlan)?.name || "Free"}
              </CardTitle>
              <CardDescription className="mt-1">
                {tokensRemaining} tokens restantes este mês
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{quota?.used_this_month || 0}</div>
              <div className="text-xs text-muted-foreground">de {(quota?.monthly_limit || 0) + (quota?.tokens_added_manually || 0)} usados</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Plans Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Planos Disponíveis</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.key}
              className={`relative transition-all ${
                plan.key === currentPlan
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
            >
              {plan.key === currentPlan && (
                <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">
                  Atual
                </Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{plan.priceKz.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm">Kz/mês</span>
                </div>
                <p className="text-xs text-muted-foreground">≈ ${plan.priceUsd} USD</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.key === currentPlan ? "outline" : "default"}
                  disabled={plan.key === currentPlan || plan.key === "free"}
                  onClick={() => handleUpgrade(plan)}
                >
                  {plan.key === currentPlan ? "Plano Atual" : plan.key === "free" ? "Grátis" : "Atualizar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Histórico de Pagamentos</h2>
        {payments.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">Nenhum pagamento registado</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <Card key={payment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.plan_key ? `Plano ${PLANS.find(p => p.key === payment.plan_key)?.name || payment.plan_key}` : "Pacote de Tokens"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.created_at), "d 'de' MMMM, yyyy", { locale: pt })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{payment.amount_kz.toLocaleString()} Kz</p>
                      <p className="text-xs text-muted-foreground">${payment.amount_usd}</p>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
                {payment.admin_notes && payment.status === "rejeitado" && (
                  <div className="mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {payment.admin_notes}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar para {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              Complete o pagamento e envie o comprovativo para ativar o seu plano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Price Summary */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex justify-between items-center">
                <span>Total a pagar:</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">
                    {selectedPlan?.priceKz.toLocaleString()} Kz
                  </p>
                  <p className="text-xs text-muted-foreground">≈ ${selectedPlan?.priceUsd} USD</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>Método de Pagamento</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                {PAYMENT_METHODS.map((method) => (
                  <div key={method.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={method.value} id={method.value} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={method.value} className="cursor-pointer font-medium">
                        {method.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{method.details}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label>Comprovativo de Pagamento (PDF, max 1MB)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="receipt-upload"
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  {receiptFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm">{receiptFile.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Clique para carregar o comprovativo</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitPayment} disabled={!receiptFile || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A enviar...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Submeter Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Finance;
