import { ShieldX, LogOut, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { StarfieldBackground } from "@/components/StarfieldBackground";

export function SuspendedScreen() {
  const { suspensionReason, signOut, user } = useAuth();

  const handleAppeal = () => {
    const subject = encodeURIComponent("Recurso de Suspensão - ProspectEz");
    const body = encodeURIComponent(
      `Olá,\n\nGostaria de recorrer da suspensão da minha conta.\n\nEmail da conta: ${user?.email || ""}\nMotivo apresentado: ${suspensionReason || "Não especificado"}\n\nJustificação:\n[Escreva aqui a sua justificação]\n\nCumprimentos`
    );
    window.open(`mailto:suporte@prospectez.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <StarfieldBackground />
      <Card className="relative z-10 w-full max-w-md border-destructive/30 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Conta Suspensa</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            A sua conta foi suspensa e o acesso às funcionalidades está restrito.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Reason */}
          <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">
              Motivo da Suspensão
            </p>
            <p className="text-sm text-foreground">
              {suspensionReason || "Não foi especificado um motivo. Contacte o suporte para mais informações."}
            </p>
          </div>

          <Separator />

          {/* Appeal */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Se acredita que esta suspensão foi um erro, pode submeter um recurso.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAppeal}
            >
              <Mail className="mr-2 h-4 w-4" />
              Submeter Recurso
            </Button>
          </div>

          <Separator />

          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
