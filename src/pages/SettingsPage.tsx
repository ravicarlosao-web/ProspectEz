import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Shield, Building, Eye, EyeOff, Lock } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const [agencyName, setAgencyName] = useState("");
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "agency_name")
        .single();
      if (data) setAgencyName((data as any).value || "");
    };
    fetch();
  }, []);

  const saveAgencyName = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings" as any)
      .update({ value: agencyName, updated_at: new Date().toISOString(), updated_by: user?.id } as any)
      .eq("key", "agency_name");
    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar");
      return;
    }
    toast.success("Nome da agência actualizado!");
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      toast.error("Introduza a senha actual");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("A nova senha deve ser diferente da actual");
      return;
    }

    setChangingPassword(true);

    // Verify current password by re-signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });

    if (signInError) {
      setChangingPassword(false);
      toast.error("Senha actual incorrecta");
      return;
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setChangingPassword(false);

    if (updateError) {
      toast.error("Erro ao alterar senha: " + updateError.message);
      return;
    }

    toast.success("Senha alterada com sucesso!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const PasswordInput = ({
    value,
    onChange,
    show,
    onToggle,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
  }) => (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-muted/50 border-border/50 pr-10"
        maxLength={128}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  const passwordStrength = newPassword.length === 0 ? null : newPassword.length < 6 ? "fraca" : newPassword.length < 10 ? "média" : "forte";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerir a sua conta e preferências</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Building className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Agência</CardTitle>
                <CardDescription className="text-xs">Nome usado nos templates de mensagens</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome da Agência</Label>
              <Input
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Ex: KYS Digital"
                className="bg-muted/50 border-border/50"
              />
            </div>
            <Button onClick={saveAgencyName} disabled={saving} size="sm">
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                <User className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Conta</CardTitle>
                <CardDescription className="text-xs">Informações do perfil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium mt-1">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">ID</p>
              <p className="font-mono text-xs text-muted-foreground mt-1">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Alterar Senha</CardTitle>
                <CardDescription className="text-xs">Introduza a senha actual para confirmar a sua identidade</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Senha Actual
                </Label>
                <PasswordInput
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrent}
                  onToggle={() => setShowCurrent(!showCurrent)}
                  placeholder="Senha actual"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nova Senha</Label>
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNew}
                  onToggle={() => setShowNew(!showNew)}
                  placeholder="Mínimo 6 caracteres"
                />
                {passwordStrength && (
                  <p className={`text-[11px] ${passwordStrength === "fraca" ? "text-destructive" : passwordStrength === "média" ? "text-yellow-500" : "text-emerald-500"}`}>
                    Força: {passwordStrength}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Confirmar Nova Senha</Label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirm}
                  onToggle={() => setShowConfirm(!showConfirm)}
                  placeholder="Repetir nova senha"
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[11px] text-destructive">As senhas não coincidem</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              size="sm"
              className="mt-4"
            >
              {changingPassword ? "A alterar..." : "Alterar Senha"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
