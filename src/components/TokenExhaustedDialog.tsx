import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertTriangle, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";

interface TokenExhaustedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: "weekly" | "monthly";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-xl">
            {isWeekly ? "Limite Semanal Atingido" : "Limite Mensal Atingido"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isWeekly
              ? "Esgotou os seus resultados desta semana. Compre resultados avulsos para continuar a prospectar agora."
              : "Esgotou os seus resultados deste mês. Atualize o plano ou compre resultados avulsos."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
            Resultados Avulsos
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
                <p className="text-xs text-muted-foreground">{pkg.quantity} resultados</p>
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
            <p className="text-xs text-muted-foreground mt-0.5">Mais resultados semanais e mensais</p>
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
