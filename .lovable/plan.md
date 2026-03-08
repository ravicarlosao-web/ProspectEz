

## Plano: Sistema Financeiro com Pagamentos e Comprovativos

### Contexto
O projeto já tem planos definidos em `app_settings` (Free, Starter, Pro, Business) com preços em Kz e USD, e pacotes de tokens avulso. Falta a interface do utilizador para pagamentos, upload de comprovativos, área admin para verificar pagamentos, e popup de tokens esgotados.

### Alterações na Base de Dados

**1. Nova tabela `payments`** para registar pedidos de pagamento/upgrade:
- `id`, `user_id`, `plan_key`, `package_key` (nullable), `amount_kz`, `amount_usd`, `payment_method` (transferencia, multicaixa, etc.), `status` (pendente, aprovado, rejeitado), `receipt_url` (ficheiro PDF), `admin_notes`, `reviewed_by`, `reviewed_at`, `created_at`
- RLS: utilizador vê/insere os seus; admin vê/atualiza todos

**2. Storage bucket `payment-receipts`** (privado) para os PDFs de comprovativo (limite 1MB validado no frontend)

**3. Políticas RLS no bucket**: utilizador faz upload na sua pasta; admin lê tudo

### Novas Páginas e Componentes

**4. Página `/financeiro` (user-facing)**
- Lista os planos disponíveis (lidos de `app_settings`) com preços em cards
- Plano atual do utilizador destacado (lido de `search_quotas.plan_type`)
- Botão "Atualizar Plano" abre dialog com:
  - Seleção do plano/pacote desejado
  - Método de pagamento (Transferência, Multicaixa Express, etc.)
  - Dados bancários/referências (configuráveis pelo admin em `app_settings`)
  - Upload do comprovativo PDF (max 1MB)
  - Submissão cria registo em `payments` com status "pendente"
- Histórico de pagamentos do utilizador

**5. Componente `TokenExhaustedDialog`**
- Popup modal que aparece quando `consume_search_token` retorna false
- Mostra tokens restantes = 0, sugere renovar ou fazer upgrade
- Botão redireciona para `/financeiro`
- Integrado na página de Prospecção (onde os tokens são consumidos)

**6. Área Admin `/admin/financeiro` (`AdminFinance.tsx`)**
- Dashboard com total de receitas (aprovados), pendentes, rejeitados
- Tabela de todos os pagamentos com filtros por status
- Ao clicar num pagamento: ver detalhes, abrir/descarregar comprovativo PDF, aprovar ou rejeitar
- Ao aprovar: atualiza `search_quotas` do utilizador (plan_type, limites, ou tokens_added_manually), regista em `admin_audit_log`

### Navegação
- Novo item "Financeiro" na sidebar do utilizador (ícone CreditCard)
- Novo item "Financeiro" na secção admin da sidebar
- Nova rota `/financeiro` e `/admin/financeiro` em `App.tsx`

### Ficheiros a criar/editar
- **Criar**: `src/pages/Finance.tsx`, `src/components/admin/AdminFinance.tsx`, `src/components/TokenExhaustedDialog.tsx`
- **Editar**: `src/App.tsx` (rotas), `src/components/AppSidebar.tsx` (nav items), `src/pages/Prospection.tsx` (integrar popup tokens esgotados)
- **Migração SQL**: tabela `payments`, bucket `payment-receipts`, políticas RLS

### Fluxo Resumido

```text
Utilizador                          Admin
    │                                  │
    ├─ /financeiro                     │
    ├─ Escolhe plano/pacote            │
    ├─ Seleciona método pagamento      │
    ├─ Upload comprovativo PDF         │
    ├─ Submete (status: pendente)      │
    │                                  │
    │                    /admin/financeiro
    │                    ├─ Vê pagamento pendente
    │                    ├─ Abre comprovativo PDF
    │                    ├─ Aprova → atualiza quotas
    │                    └─ Ou rejeita com nota
    │                                  │
    ├─ Tokens esgotados?               │
    ├─ Popup → redireciona /financeiro │
```

