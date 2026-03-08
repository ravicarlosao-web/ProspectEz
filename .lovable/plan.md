

# Sistema AngolaProsp – Prospecção de Clientes

## Visão Geral
Sistema de prospecção de clientes para uma agência de Social Media e Websites em Angola, em Português (pt-AO), com gestão de leads, templates de mensagens e ferramentas de prospecção.

---

## Fase 1 – Base do Sistema

### Autenticação e Perfis
- Página de login, registo e recuperação de senha
- Perfis de utilizador com foto e dados pessoais
- Sistema de papéis: Admin, Gestor, Vendedor
- Toda a interface em Português angolano

### Dashboard Principal
- Resumo de leads totais, contactados, em negociação, fechados
- Gráfico de funil de conversão
- Actividades recentes e alertas de follow-up
- Leads por província/cidade de Angola

---

## Fase 2 – Gestão de Clientes e Leads

### Lista de Clientes/Leads
- Tabela com pesquisa, ordenação e paginação
- Campos: nome, empresa, email, telefone (+244), província, cidade, website, redes sociais
- Estados do funil: Novo → Contactado → Em negociação → Fechado ganho / Perdido
- Formulário de criação e edição de leads com validação

### Filtros Inteligentes
- Filtrar por cidade/província de Angola
- Tipo de serviço (Social Media, Website, ambos)
- Existência de website
- Estado do funil
- Palavras-chave

---

## Fase 3 – Templates e Mensagens

### Templates de Mensagem
- Biblioteca de templates em Português: mensagem inicial, follow-ups, proposta de reunião, agradecimento, abandono
- Campos dinâmicos: {{NomeCliente}}, {{Empresa}}, {{ServiçoInteressado}}, {{DataContato}}
- Editor de templates personalizados

### Gestão de Mensagens
- Histórico de mensagens enviadas por lead
- Pré-visualização com dados do cliente preenchidos
- Copiar mensagem formatada para enviar via WhatsApp/Email manualmente
- Agendamento de follow-ups com lembretes

---

## Fase 4 – Prospecção e Scraping

### Prospecção Web (via Firecrawl)
- Pesquisa de empresas angolanas por palavra-chave e localização
- Extracção automática de emails, telefones (+244) e redes sociais de websites
- Identificação de empresas sem website ou presença digital fraca
- Logs de prospecção com histórico e deduplicação

### Importação Manual
- Importar leads via CSV/Excel
- Formulário rápido de adição manual

---

## Fase 5 – Relatórios e Exportação

### Analytics
- Tabela de leads por estado com contagens
- Gráficos mensais de conversão e actividade
- Desempenho por vendedor
- Exportação para CSV/Excel

---

## Especificações Angolanas
- Moeda: Kwanza (AKZ)
- Telefone: formato +244
- Províncias e cidades de Angola pré-carregadas
- Interface 100% em Português angolano

## Navegação
- `/login`, `/registar`, `/recuperar-senha`
- `/dashboard` (painel principal)
- `/clientes` (lista, criação, edição)
- `/prospeccao` (pesquisa e scraping)
- `/mensagens` (templates e histórico)
- `/configuracoes` (conta e preferências)

