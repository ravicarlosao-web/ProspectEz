import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Shield, Building, Eye, EyeOff, Lock, Camera, Loader2 } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const [agencyName, setAgencyName] = useState("");
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "agency_name")
        .single();
      if (data) setAgencyName((data as any).value || "");
    };
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar_url || null);
      }
    };
    fetchSettings();
    fetchProfile();
  }, [user?.id]);

  const saveAgencyName = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings" as any)
      .update({ value: agencyName, updated_at: new Date().toISOString(), updated_by: user?.id } as any)
      .eq("key", "agency_name");
    setSaving(false);
    if (error) { toast.error("Erro ao guardar"); return; }
    toast.success("Nome da agência actualizado!");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx. 2MB)");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP");
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;

      // Delete old avatar files in the folder
      const { data: existingFiles } = await supabase.storage.from("avatars").list(user.id);
      if (existingFiles?.length) {
        await supabase.storage.from("avatars").remove(existingFiles.map(f => `${user.id}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) { toast.error("Erro ao fazer upload"); return; }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) { toast.error("Erro ao guardar avatar"); return; }

      setAvatarUrl(publicUrl);
      toast.success("Foto de perfil actualizada!");
    } catch {
      toast.error("Erro ao fazer upload");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    if (!fullName.trim()) { toast.error("O nome não pode estar vazio"); return; }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) { toast.error("Erro ao guardar perfil"); return; }
    toast.success("Perfil actualizado!");
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) { toast.error("Introduza a senha actual"); return; }
    if (newPassword.length < 6) { toast.error("A nova senha deve ter pelo menos 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    if (currentPassword === newPassword) { toast.error("A nova senha deve ser diferente da actual"); return; }

    setChangingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });
    if (signInError) { setChangingPassword(false); toast.error("Senha actual incorrecta"); return; }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (updateError) { toast.error("Erro ao alterar senha: " + updateError.message); return; }

    toast.success("Senha alterada com sucesso!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const PasswordInput = ({ value, onChange, show, onToggle, placeholder }: {
    value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string;
  }) => (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-muted/50 border-border/50 pr-10" maxLength={128} />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  const passwordStrength = newPassword.length === 0 ? null : newPassword.length < 6 ? "fraca" : newPassword.length < 10 ? "média" : "forte";
  const initials = fullName ? fullName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "?";

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
              <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Ex: KYS Digital" className="bg-muted/50 border-border/50" />
            </div>
            <Button onClick={saveAgencyName} disabled={saving} size="sm">
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/50">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Perfil</CardTitle>
                <CardDescription className="text-xs">Nome, telefone e informações da conta</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-16 w-16">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                  <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Clique para alterar a foto</p>
                <p>JPG, PNG ou WebP • Máx. 2MB</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome Completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" className="bg-muted/50 border-border/50" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: +244 923 456 789" className="bg-muted/50 border-border/50" maxLength={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium mt-1">{user?.email}</p>
            </div>
            <Button onClick={saveProfile} disabled={savingProfile} size="sm">
              {savingProfile ? "A guardar..." : "Guardar Perfil"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/50">
                <Shield className="h-4 w-4 text-primary" />
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
                <PasswordInput value={currentPassword} onChange={setCurrentPassword} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} placeholder="Senha actual" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nova Senha</Label>
                <PasswordInput value={newPassword} onChange={setNewPassword} show={showNew} onToggle={() => setShowNew(!showNew)} placeholder="Mínimo 6 caracteres" />
                {passwordStrength && (
                  <p className={`text-[11px] ${passwordStrength === "fraca" ? "text-destructive" : passwordStrength === "média" ? "text-yellow-500" : "text-emerald-500"}`}>
                    Força: {passwordStrength}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Confirmar Nova Senha</Label>
                <PasswordInput value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} placeholder="Repetir nova senha" />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[11px] text-destructive">As senhas não coincidem</p>
                )}
              </div>
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword} size="sm" className="mt-4">
              {changingPassword ? "A alterar..." : "Alterar Senha"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
