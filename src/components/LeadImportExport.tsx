import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { LEAD_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/lib/constants";

interface LeadImportExportProps {
  onImportComplete: () => void;
}

type ParsedLead = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  province?: string;
  city?: string;
  website?: string;
  service_type?: string;
  status?: string;
  notes?: string;
  source?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_linkedin?: string;
  social_tiktok?: string;
};

type ImportPreview = {
  valid: ParsedLead[];
  errors: { row: number; reason: string }[];
};

const CSV_HEADERS = [
  "nome", "empresa", "email", "telefone", "provincia", "cidade",
  "website", "tipo_servico", "estado", "notas", "origem",
  "facebook", "instagram", "linkedin", "tiktok"
];

const HEADER_MAP: Record<string, keyof ParsedLead> = {
  nome: "name", name: "name",
  empresa: "company", company: "company",
  email: "email",
  telefone: "phone", phone: "phone", tel: "phone",
  provincia: "province", province: "province", província: "province",
  cidade: "city", city: "city",
  website: "website", site: "website",
  tipo_servico: "service_type", service_type: "service_type", serviço: "service_type", servico: "service_type",
  estado: "status", status: "status",
  notas: "notes", notes: "notes",
  origem: "source", source: "source",
  facebook: "social_facebook", social_facebook: "social_facebook",
  instagram: "social_instagram", social_instagram: "social_instagram",
  linkedin: "social_linkedin", social_linkedin: "social_linkedin",
  tiktok: "social_tiktok", social_tiktok: "social_tiktok",
};

const VALID_STATUSES = ["novo", "contactado", "em_negociacao", "fechado_ganho", "perdido"];
const VALID_SERVICES = ["social_media", "website", "ambos"];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === "," || char === ";") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): ImportPreview {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { valid: [], errors: [{ row: 0, reason: "Ficheiro vazio ou sem dados" }] };

  const headerLine = parseCSVLine(lines[0]);
  const columnMap: (keyof ParsedLead | null)[] = headerLine.map(h => {
    const normalized = h.toLowerCase().replace(/[^a-z_]/g, "").trim();
    return HEADER_MAP[normalized] || null;
  });

  if (!columnMap.includes("name")) {
    return { valid: [], errors: [{ row: 1, reason: "Coluna 'nome' não encontrada no cabeçalho" }] };
  }

  const valid: ParsedLead[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const lead: Partial<ParsedLead> = {};

    columnMap.forEach((key, idx) => {
      if (key && values[idx]) {
        (lead as any)[key] = values[idx];
      }
    });

    if (!lead.name || lead.name.trim().length === 0) {
      errors.push({ row: i + 1, reason: "Nome em falta" });
      return;
    }

    // Validate status
    if (lead.status && !VALID_STATUSES.includes(lead.status.toLowerCase())) {
      lead.status = "novo";
    } else if (lead.status) {
      lead.status = lead.status.toLowerCase();
    }

    // Validate service_type
    if (lead.service_type && !VALID_SERVICES.includes(lead.service_type.toLowerCase())) {
      lead.service_type = undefined;
    } else if (lead.service_type) {
      lead.service_type = lead.service_type.toLowerCase();
    }

    valid.push(lead as ParsedLead);
  }

  return { valid, errors };
}

export function LeadImportExport({ onImportComplete }: LeadImportExportProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Apenas ficheiros CSV são suportados");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande (máx. 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const result = parseCSV(text);
      setPreview(result);
      setImportOpen(true);
    };
    reader.readAsText(file, "utf-8");

    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (!preview || preview.valid.length === 0) return;
    setImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Sessão expirada"); return; }

      const rows = preview.valid.map(lead => ({
        name: lead.name,
        company: lead.company || null,
        email: lead.email || null,
        phone: lead.phone || null,
        province: lead.province || null,
        city: lead.city || null,
        website: lead.website || null,
        service_type: (lead.service_type || null) as "social_media" | "website" | "ambos" | null,
        status: (lead.status || "novo") as "novo" | "contactado" | "em_negociacao" | "fechado_ganho" | "perdido",
        notes: lead.notes || null,
        source: lead.source || "csv_import",
        social_facebook: lead.social_facebook || null,
        social_instagram: lead.social_instagram || null,
        social_linkedin: lead.social_linkedin || null,
        social_tiktok: lead.social_tiktok || null,
        user_id: user.id,
      }));

      // Insert in batches of 50
      const batchSize = 50;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from("leads").insert(batch);
        if (error) {
          toast.error(`Erro no lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          break;
        }
        inserted += batch.length;
      }

      toast.success(`${inserted} leads importados com sucesso!`);
      setImportOpen(false);
      setPreview(null);
      onImportComplete();
    } catch {
      toast.error("Erro ao importar leads");
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) { toast.error("Erro ao exportar"); return; }
      if (!data || data.length === 0) { toast.error("Sem leads para exportar"); return; }

      const header = CSV_HEADERS.join(",");
      const rows = data.map(lead => {
        const values = [
          lead.name,
          lead.company || "",
          lead.email || "",
          lead.phone || "",
          lead.province || "",
          lead.city || "",
          lead.website || "",
          lead.service_type || "",
          lead.status || "",
          lead.notes || "",
          lead.source || "",
          lead.social_facebook || "",
          lead.social_instagram || "",
          lead.social_linkedin || "",
          lead.social_tiktok || "",
        ];
        return values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });

      const bom = "\uFEFF";
      const csv = bom + [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${data.length} leads exportados!`);
    } catch {
      toast.error("Erro ao exportar leads");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="sm:size-default"
      >
        <Upload className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Importar CSV</span>
        <span className="sm:hidden">Importar</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={exporting}
        className="sm:size-default"
      >
        <Download className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">{exporting ? "A exportar..." : "Exportar CSV"}</span>
        <span className="sm:hidden">{exporting ? "..." : "Exportar"}</span>
      </Button>

      {/* Import Preview Dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) { setImportOpen(false); setPreview(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Pré-visualização da Importação
            </DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">{preview.valid.length}</span>
                  <span className="text-muted-foreground">leads válidos</span>
                </div>
                {preview.errors.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="font-medium">{preview.errors.length}</span>
                    <span className="text-muted-foreground">com erros</span>
                  </div>
                )}
              </div>

              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <p className="text-sm font-medium text-destructive">Linhas com erro (serão ignoradas):</p>
                  {preview.errors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      Linha {err.row}: {err.reason}
                    </p>
                  ))}
                  {preview.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground">...e mais {preview.errors.length - 10} erros</p>
                  )}
                </div>
              )}

              {/* Preview table */}
              {preview.valid.length > 0 && (
                <div className="rounded-lg border border-border/50 overflow-x-auto max-h-[40vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Empresa</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Telefone</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.valid.slice(0, 20).map((lead, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{lead.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{lead.company || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{lead.email || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{lead.phone || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {LEAD_STATUS_LABELS[lead.status || "novo"] || "Novo"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {preview.valid.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ...e mais {preview.valid.length - 20} leads
                    </p>
                  )}
                </div>
              )}

              {/* Template hint */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Formato esperado:</strong> CSV com cabeçalho. Colunas aceites: {CSV_HEADERS.join(", ")}. 
                  Separador: vírgula ou ponto-e-vírgula. Codificação: UTF-8.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setImportOpen(false); setPreview(null); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || preview.valid.length === 0}
                >
                  {importing ? "A importar..." : `Importar ${preview.valid.length} leads`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
