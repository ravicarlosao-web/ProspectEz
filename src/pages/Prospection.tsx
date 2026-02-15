import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Globe, FileUp } from "lucide-react";

const Prospection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prospecção</h1>
        <p className="text-muted-foreground">Ferramentas de pesquisa e extracção de leads</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Pesquisa Web</CardTitle>
                <CardDescription>Pesquisar empresas angolanas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Utilize o Firecrawl para pesquisar empresas por palavra-chave e localização em Angola.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Em breve
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                <Globe className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <CardTitle className="text-base">Scraping de Websites</CardTitle>
                <CardDescription>Extrair contactos de sites</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Extraia emails, telefones e redes sociais automaticamente de qualquer website.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Em breve
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <FileUp className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Importar CSV</CardTitle>
                <CardDescription>Importar leads em massa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Importe leads a partir de ficheiros CSV ou Excel com mapeamento de colunas.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Em breve
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Prospection;
