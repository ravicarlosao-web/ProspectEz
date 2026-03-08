import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, Zap, ShieldAlert } from "lucide-react";
import { StarfieldBackground } from "@/components/StarfieldBackground";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "login_rate_limit";

function getRateLimit(): { attempts: number; lockedUntil: number | null } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { attempts: 0, lockedUntil: null };
}

function setRateLimit(attempts: number, lockedUntil: number | null) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ attempts, lockedUntil }));
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);
  const navigate = useNavigate();

  const checkLock = useCallback(() => {
    const { lockedUntil } = getRateLimit();
    if (lockedUntil && Date.now() < lockedUntil) {
      setLockRemaining(Math.ceil((lockedUntil - Date.now()) / 1000));
      return true;
    }
    if (lockedUntil) {
      setRateLimit(0, null);
      setLockRemaining(0);
    }
    return false;
  }, []);

  useEffect(() => {
    checkLock();
    const interval = setInterval(() => {
      const { lockedUntil } = getRateLimit();
      if (lockedUntil && Date.now() < lockedUntil) {
        setLockRemaining(Math.ceil((lockedUntil - Date.now()) / 1000));
      } else if (lockedUntil) {
        setRateLimit(0, null);
        setLockRemaining(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [checkLock]);

  const isLocked = lockRemaining > 0;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkLock()) {
      toast.error(`Conta bloqueada. Tente novamente em ${formatTime(lockRemaining)}.`);
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const rl = getRateLimit();
      const newAttempts = rl.attempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        setRateLimit(newAttempts, lockedUntil);
        setLockRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        toast.error(`Demasiadas tentativas falhadas. Conta bloqueada por 5 minutos.`);
      } else {
        setRateLimit(newAttempts, null);
        const remaining = MAX_ATTEMPTS - newAttempts;
        toast.error(
          error.message === "Invalid login credentials"
            ? `Credenciais inválidas. ${remaining} tentativa${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""}.`
            : error.message
        );
      }
    } else {
      setRateLimit(0, null);
      navigate("/dashboard");
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
          <p className="mt-2 text-sm text-muted-foreground">Prospecção de Clientes</p>
        </div>

        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Entrar</h2>
            <p className="text-sm text-muted-foreground">Introduza as suas credenciais para aceder ao sistema</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" placeholder="email@exemplo.co.ao" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="h-11 bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={loading}>
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? "A entrar..." : "Entrar"}
            </Button>
          </form>
          <div className="flex justify-between text-sm">
            <Link to="/recuperar-senha" className="text-primary hover:text-primary/80 transition-colors">Esqueceu a senha?</Link>
            <Link to="/registar" className="text-primary hover:text-primary/80 transition-colors">Criar conta</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
