import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, ArrowUpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";

interface TokenExhaustedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: "weekly" | "monthly" | "free_plan";
}

export function TokenExhaustedDialog({ open, onOpenChange, type = "weekly" }: TokenExhaustedDialogProps) {
  const navigate = useNavigate();
  const { packages } = usePlanConfigs();

  const handleBuyTokens = () => {
    onOpenChange(false);
    navigate("/financeiro");
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/financeiro");
  };

  const isWeekly = type === "weekly";
  const isFree = type === "free_plan";

  // ── FREE PLAN: upgrade-only dialog ──────────────────────────────────────────
  if (isFree) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <ArrowUpCircle className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              Pesquisa Gratuita Utilizada
            </DialogTitle>
            <DialogDescription className="text-center">
              O plano gratuito inclui apenas <strong>1 pesquisa</strong>. Já utilizou a sua pesquisa de avaliação.
              Para continuar a prospectar, atualize para um plano pago.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <button
              onClick={handleUpgrade}
              className="w-full p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-center"
            >
              <ArrowUpCircle className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="font-semibold text-sm">Atualizar Plano Agora</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aceda a pesquisas ilimitadas e muito mais</p>
            </button>
          </div>

          <DialogFooter>
            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Agora não
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── PAID PLAN: weekly / monthly token dialog ─────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-xl">
            {isWeekly ? "Tokens Semanais Esgotados" : "Tokens Mensais Esgotados"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isWeekly
              ? "Esgotou os seus tokens desta semana. Cada pesquisa ou 'Ver Mais' consome 1 token. Compre tokens avulsos para continuar agora."
              : "Esgotou os seus tokens deste mês. Atualize o plano ou compre tokens avulsos para continuar a prospectar."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
            Tokens Avulsos
          </p>
          <div className="grid grid-cols-3 gap-2">
            {packages.map(pkg => (
              <button
                key={pkg.name}
                onClick={handleBuyTokens}
                className="p-3 rounded-xl border bg-muted/30 hover:border-primary hover:bg-primary/5 transition-all text-center space-y-1 cursor-pointer"
              >
                <Package className="h-4 w-4 mx-auto text-primary" />
                <p className="font-semibold text-sm">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">{pkg.quantity} tokens</p>
                <Badge variant="outline" className="text-xs px-1.5">
                  {pkg.priceKz.toLocaleString()} Kz
                </Badge>
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <button
            onClick={handleUpgrade}
            className="w-full p-3 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all text-center"
          >
            <p className="font-medium text-sm">Atualizar Plano</p>
            <p className="text-xs text-muted-foreground mt-0.5">Mais tokens semanais e mensais incluídos</p>
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
