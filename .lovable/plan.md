

## Plano de Implementação: Paginação, Avatar e Deduplicação

### 1. Paginação Real na Tabela de Clientes (`Clients.tsx`)

Actualmente o `fetchLeads` carrega todos os leads sem limite. Vamos implementar paginação server-side com `range()` do Supabase.

**Alterações:**
- Adicionar estados `page`, `pageSize` (20), `totalCount`
- Usar query `.range(from, to)` e header `count: 'exact'` para obter o total
- Substituir a query actual por: `supabase.from("leads").select("*", { count: "exact" }).range(from, to)`
- Os cards de contagem no topo continuam a funcionar via `count` queries separadas (ou usar os dados da paginação actual)
- Adicionar componente de paginação no fundo da tabela com Previous/Next e indicador de página
- Recalcular os status cards com queries `count` separadas por status (para não depender dos dados paginados)

---

### 2. Avatar/Foto de Perfil nas Configurações (`SettingsPage.tsx`)

**Base de dados:**
- Criar bucket de storage `avatars` (público) via migração SQL
- Política RLS: utilizadores podem fazer upload/delete dos seus próprios avatars

**Frontend:**
- No card de Perfil, adicionar um Avatar circular com fallback de iniciais
- Botão de upload que aceita imagens (max 2MB, jpg/png/webp)
- Upload para `avatars/{user_id}.{ext}` via Supabase Storage
- Guardar o URL público em `profiles.avatar_url`
- Pré-visualização instantânea após upload

---

### 3. Deduplicação Robusta na Prospecção (CRUCIAL)

A deduplicação actual compara apenas nomes normalizados. Precisa ser reforçada com múltiplos critérios.

**Melhorias na deduplicação:**
- Carregar leads existentes com `name, company, email, phone, website, social_facebook, social_instagram` (não apenas name/company)
- Criar sets separados para: nomes normalizados, emails, telefones normalizados (só dígitos), domínios de websites
- Na função `analyzeResults` e `analyzeSocialPresence`, verificar match em QUALQUER critério:
  - Nome/empresa normalizado já existe
  - Email já existe na base
  - Telefone (últimos 9 dígitos) já existe
  - Domínio do website já existe
- Adicionar verificação de similaridade fuzzy nos nomes (ex: Levenshtein simplificado ou substring match com >80% de overlap)
- Na função `saveAsLead`/`saveAsSocialLead`, fazer verificação final antes de inserir para evitar race conditions (query ao DB imediatamente antes do insert)
- Mostrar badge diferenciado: "Já guardado" vs "Possível duplicado" (match parcial)

**Deduplicação intra-resultados (dentro da mesma pesquisa):**
- O `businessMap` actual agrupa por nome normalizado exacto. Melhorar para também detectar nomes muito semelhantes e mergear (ex: "Restaurante Xpto" e "Restaurante XPTO Lda")
- Normalizar removendo sufixos comuns: "lda", "sa", "limitada", "sarl", "ep"

---

### Resumo de Ficheiros a Editar

| Ficheiro | Alteração |
|---|---|
| `src/pages/Clients.tsx` | Paginação server-side com range() |
| `src/pages/SettingsPage.tsx` | Upload de avatar com preview |
| `src/pages/Prospection.tsx` | Deduplicação multi-critério reforçada |
| Migração SQL | Bucket `avatars` + políticas storage |

