import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Zap } from "lucide-react";
import { StarfieldBackground } from "@/components/StarfieldBackground";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada com sucesso! A redirecionar...");
      setTimeout(() => window.location.href = "/dashboard", 1500);
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <StarfieldBackground count={100} />
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary glow-primary">
            <Zap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight gradient-text">ProspectEz</h1>
          <p className="mt-2 text-sm text-muted-foreground">Criar nova conta</p>
        </div>

        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Registar</h2>
            <p className="text-sm text-muted-foreground">Preencha os dados para criar a sua conta</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wider">Nome Completo</Label>
              <Input id="name" placeholder="João Silva" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-11 bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" placeholder="email@exemplo.co.ao" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">Senha</Label>
              <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="h-11 bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={loading}>
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? "A criar..." : "Criar Conta"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
