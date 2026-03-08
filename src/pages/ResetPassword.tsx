import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Eye, EyeOff } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { StarfieldBackground } from "@/components/StarfieldBackground";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is a recovery session
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setIsValidSession(true);
    } else {
      // Also check via session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsValidSession(true);
        } else {
          toast.error("Link de recuperação inválido ou expirado");
          navigate("/login");
        }
      });
    }
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error("A senha deve conter maiúsculas, minúsculas e números");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      navigate("/login");
    }
    setLoading(false);
  };

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <StarfieldBackground count={100} />
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary glow-primary">
            <Zap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight gradient-text">ProspectEz</h1>
        </div>

        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Nova Senha</h2>
            <p className="text-sm text-muted-foreground">Defina uma nova senha segura para a sua conta</p>
          </div>
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mín. 8 caracteres com maiúsculas e números"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  className="h-11 bg-muted/50 border-border/50 focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[
                      password.length >= 8,
                      /[A-Z]/.test(password),
                      /[a-z]/.test(password),
                      /\d/.test(password),
                    ].map((met, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${met ? "bg-emerald-500" : "bg-muted"}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Confirmar Senha</Label>
              <Input
                type="password"
                placeholder="Repetir nova senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                maxLength={128}
                className="h-11 bg-muted/50 border-border/50 focus:border-primary"
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "A alterar..." : "Definir Nova Senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
