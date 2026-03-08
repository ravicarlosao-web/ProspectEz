import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Shield, Building } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const [agencyName, setAgencyName] = useState("");
  const [saving, setSaving] = useState(false);

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

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Segurança</CardTitle>
                <CardDescription className="text-xs">Gestão de acesso</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Papel: Utilizador (predefinido)
            </p>
            <Button variant="outline" size="sm" disabled className="border-border/50">Alterar Senha</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
