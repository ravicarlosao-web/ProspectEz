import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DollarSign, Clock, Check, XCircle, FileText, Loader2, ExternalLink, Download, Search, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

type Payment = {
  id: string;
  user_id: string;
  plan_key: string | null;
  package_key: string | null;
  amount_kz: number;
  amount_usd: number;
  payment_method: string;
  status: string;
  receipt_url: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
};

const PLAN_TOKENS: Record<string, number> = {
  free: 3,
  starter: 30,
  pro: 100,
  business: 300,
};

export function AdminFinance() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    
    // First fetch payments
    const { data: paymentsData, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar pagamentos");
      setIsLoading(false);
      return;
    }

    // Then fetch profiles to get user info
    const userIds = [...new Set(paymentsData?.map(p => p.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enrichedPayments = (paymentsData || []).map(payment => ({
      ...payment,
      user_email: profilesMap.get(payment.user_id)?.email || "N/A",
      user_name: profilesMap.get(payment.user_id)?.full_name || "N/A",
    }));

    setPayments(enrichedPayments);
    setIsLoading(false);
  };

  const openPaymentDetails = async (payment: Payment) => {
    setSelectedPayment(payment);
    setAdminNotes(payment.admin_notes || "");
    setIsDetailsOpen(true);

    // Get signed URL for receipt
    if (payment.receipt_url) {
      const { data } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(payment.receipt_url, 3600);
      
      if (data) {
        setReceiptUrl(data.signedUrl);
      }
    }
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Update payment status
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: "aprovado",
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedPayment.id);

      if (paymentError) throw paymentError;

      // Update user quota if it's a plan upgrade
      if (selectedPayment.plan_key) {
        const newLimit = PLAN_TOKENS[selectedPayment.plan_key] || 3;
        
        const { error: quotaError } = await supabase
          .from("search_quotas")
          .update({
            plan_type: selectedPayment.plan_key,
            monthly_limit: newLimit,
            used_this_month: 0,
            last_monthly_reset: new Date().toISOString().split("T")[0],
          })
          .eq("user_id", selectedPayment.user_id);

        if (quotaError) throw quotaError;
      }

      // Log audit
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        target_user_id: selectedPayment.user_id,
        action: "payment_approved",
        details: {
          payment_id: selectedPayment.id,
          plan_key: selectedPayment.plan_key,
          amount_kz: selectedPayment.amount_kz,
        },
      });

      toast.success("Pagamento aprovado com sucesso!");
      setIsDetailsOpen(false);
      fetchPayments();
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Erro ao aprovar pagamento");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !adminNotes.trim()) {
      toast.error("Por favor adicione uma nota explicando o motivo da rejeição");
      return;
    }
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("payments")
        .update({
          status: "rejeitado",
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedPayment.id);

      if (error) throw error;

      // Log audit
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        target_user_id: selectedPayment.user_id,
        action: "payment_rejected",
        details: {
          payment_id: selectedPayment.id,
          reason: adminNotes,
        },
      });

      toast.success("Pagamento rejeitado");
      setIsDetailsOpen(false);
      fetchPayments();
    } catch (error) {
      console.error("Reject error:", error);
      toast.error("Erro ao rejeitar pagamento");
    } finally {
      setIsProcessing(false);
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

  const filteredPayments = payments.filter(p => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesSearch = !searchQuery || 
      p.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: payments.reduce((sum, p) => p.status === "aprovado" ? sum + p.amount_kz : sum, 0),
    pending: payments.filter(p => p.status === "pendente").length,
    approved: payments.filter(p => p.status === "aprovado").length,
    rejected: payments.filter(p => p.status === "rejeitado").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()} Kz</div>
            <p className="text-xs text-muted-foreground">Pagamentos aprovados</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Aguardam revisão</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <Check className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gestão de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por email ou nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aprovados</SelectItem>
                <SelectItem value="rejeitado">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payments Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.user_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{payment.plan_key || payment.package_key || "N/A"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.amount_kz.toLocaleString()} Kz</p>
                          <p className="text-xs text-muted-foreground">${payment.amount_usd}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{payment.payment_method}</TableCell>
                      <TableCell>
                        {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openPaymentDetails(payment)}>
                          <FileText className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
            <DialogDescription>
              Revise o comprovativo e aprove ou rejeite o pagamento.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 py-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Utilizador</Label>
                  <p className="font-medium">{selectedPayment.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayment.user_email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Plano Solicitado</Label>
                  <p className="font-medium capitalize">{selectedPayment.plan_key || "N/A"}</p>
                </div>
              </div>

              <Separator />

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <p className="text-lg font-bold text-primary">{selectedPayment.amount_kz.toLocaleString()} Kz</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Método</Label>
                  <p className="font-medium capitalize">{selectedPayment.payment_method}</p>
                </div>
              </div>

              <Separator />

              {/* Receipt */}
              {receiptUrl && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Comprovativo</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Abrir PDF
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={receiptUrl} download>
                        <Download className="h-4 w-4 mr-1" />
                        Descarregar
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label>Notas do Administrador</Label>
                <Textarea
                  placeholder="Adicione notas sobre este pagamento..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  disabled={selectedPayment.status !== "pendente"}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedPayment?.status === "pendente" ? (
              <>
                <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Rejeitar
                </Button>
                <Button onClick={handleApprove} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Aprovar
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
