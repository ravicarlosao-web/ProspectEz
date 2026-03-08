import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, ShieldAlert, CreditCard } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { StarfieldBackground } from "@/components/StarfieldBackground";
import {
  generateDeviceFingerprint,
  getPersistentDeviceToken,
  createPersistentDeviceToken,
} from "@/lib/fingerprint";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [persistentToken, setPersistentToken] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockedEmail, setBlockedEmail] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string>("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkDevice = async () => {
      try {
        const [fp, token] = await Promise.all([
          generateDeviceFingerprint(),
          getPersistentDeviceToken(),
        ]);
        setFingerprint(fp);
        setPersistentToken(token);

        const { data, error } = await supabase.functions.invoke("check-device", {
          body: { fingerprint: fp, persistent_token: token, action: "check" },
        });

        if (!error && data?.blocked) {
          setBlocked(true);
          setBlockedEmail(data.registered_email || null);
          setBlockedReason(data.reason || "");
        }
      } catch (err) {
        console.error("Device check failed:", err);
      } finally {
        setChecking(false);
      }
    };
    checkDevice();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast.error("O nome deve ter entre 2 e 100 caracteres");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Email inválido");
      return;
    }

    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error("A senha deve conter maiúsculas, minúsculas e números");
      return;
    }

    setLoading(true);

    // 1. Check disposable email
    try {
      const { data: emailCheck } = await supabase.functions.invoke("check-device", {
        body: { fingerprint: fingerprint || "unknown", action: "check_email", email: trimmedEmail },
      });
      if (emailCheck?.blocked) {
        toast.error("Emails temporários ou descartáveis não são permitidos. Use um email real.");
        setLoading(false);
        return;
      }
    } catch {}

    // 2. Re-check device
    if (fingerprint) {
      try {
        const { data } = await supabase.functions.invoke("check-device", {
          body: { fingerprint, persistent_token: persistentToken, action: "check" },
        });
        if (data?.blocked) {
          setBlocked(true);
          setBlockedEmail(data.registered_email || null);
          setBlockedReason(data.reason || "");
          setLoading(false);
          return;
        }
      } catch {}
    }

    // 3. Log attempt for rate limiting
    try {
      await supabase.functions.invoke("check-device", {
        body: { fingerprint: fingerprint || "unknown", action: "log_attempt", email: trimmedEmail },
      });
    } catch {}

    // 4. Create account
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { full_name: trimmedName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // 5. Create persistent token and register device
    const newToken = await createPersistentDeviceToken();

    if (fingerprint) {
      try {
        await supabase.functions.invoke("check-device", {
          body: {
            fingerprint,
            action: "register",
            email: trimmedEmail,
            user_id: signUpData.user?.id || null,
            persistent_token: newToken,
          },
        });
      } catch (err) {
        console.error("Failed to register device:", err);
      }
    }

    // Check if session exists (auto-confirm enabled) or not (email verification needed)
    if (signUpData.session) {
      toast.success("Conta criada com sucesso! A redirecionar...");
      setTimeout(() => (window.location.href = "/dashboard"), 1500);
    } else {
      toast.success("Conta criada! Verifique o seu email para confirmar o registo.", { duration: 8000 });
    }
    setLoading(false);
  };

  const getBlockedMessage = () => {
    switch (blockedReason) {
      case "rate_limit":
        return "Demasiadas tentativas de registo detectadas a partir da sua rede. Aguarde algum tempo antes de tentar novamente.";
      default:
        return (
          <>
            O nosso sistema detectou que este dispositivo já foi utilizado para criar uma conta gratuita
            {blockedEmail && <span className="font-medium"> ({blockedEmail})</span>}.
          </>
        );
    }
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
              <Input id="name" placeholder="João Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11 bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" placeholder="email@exemplo.co.ao" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">Senha</Label>
              <Input id="password" type="password" placeholder="Mín. 8 caracteres com maiúsculas e números" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} className="h-11 bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={loading || checking}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {checking ? "A verificar dispositivo..." : loading ? "A criar..." : "Criar Conta"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">Entrar</Link>
          </p>
        </div>
      </div>

      {/* Blocked Device Dialog */}
      <Dialog open={blocked} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              {blockedReason === "rate_limit" ? "Limite de Tentativas Excedido" : "Conta Gratuita Já Utilizada"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm text-foreground">{getBlockedMessage()}</p>
              <p className="text-sm text-muted-foreground">
                Cada dispositivo tem direito a <strong>apenas uma conta gratuita</strong>.
                Esta política existe para garantir um serviço justo para todos os utilizadores.
              </p>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">O que pode fazer:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Entrar na sua conta existente</strong> com o email já registado</li>
                <li>• <strong>Adquirir um plano pago</strong> para continuar a usar o ProspectEz</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login" className="w-full">
                <Button className="w-full" variant="default">Entrar na Minha Conta</Button>
              </Link>
              <Link to="/login" className="w-full">
                <Button className="w-full" variant="outline">
                  <CreditCard className="mr-2 h-4 w-4" />Ver Planos Disponíveis
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
