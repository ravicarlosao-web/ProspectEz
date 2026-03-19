import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertTriangle } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";

interface TokenExhaustedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TokenExhaustedDialog({ open, onOpenChange }: TokenExhaustedDialogProps) {
  const navigate = useNavigate();
  const { plans } = usePlanConfigs();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/financeiro");
  };

  // Show the two middle paid plans (skip free and business)
  const paidPlans = plans.filter(p => p.key !== "free").slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-xl">Tokens Esgotados</DialogTitle>
          <DialogDescription className="text-center">
            O seu limite de pesquisas deste mês foi atingido. Atualize o seu plano para continuar a prospectar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-xl bg-muted/50 border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <img src={logoImg} alt="ProspectEz" className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Precisa de mais pesquisas?</p>
                <p className="text-sm text-muted-foreground">
                  Atualize para um plano com mais tokens mensais
                </p>
              </div>
            </div>
            
            <div className={`grid gap-2 text-center text-sm ${paidPlans.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {paidPlans.map(p => (
                <div key={p.key} className="p-2 rounded-lg bg-background border">
                  <p className="font-semibold text-primary">{p.name}</p>
                  <p className="text-muted-foreground">{p.monthly} tokens/mês</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={handleUpgrade}>
            <CreditCard className="h-4 w-4 mr-2" />
            Atualizar Plano
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
