import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { StarfieldBackground } from "@/components/StarfieldBackground";

const RecoverPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email de recuperação enviado! Verifique a sua caixa de entrada.");
      supabase.functions.invoke("log-security-event", {
        body: { event_type: "password_reset_request", email },
      }).catch(() => {});
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <StarfieldBackground count={100} />
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary glow-primary">
            <img src={logoImg} alt="ProspectEz" className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight gradient-text">ProspectEz</h1>
        </div>

        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Recuperar Senha</h2>
            <p className="text-sm text-muted-foreground">Introduza o seu email para receber um link de recuperação</p>
          </div>
          <form onSubmit={handleRecover} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" placeholder="email@exemplo.co.ao" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={loading}>
              <Mail className="mr-2 h-4 w-4" />
              {loading ? "A enviar..." : "Enviar Link"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">Voltar ao login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecoverPassword;
