

# Upgrade de Design -- ProspectEz

## Visão Geral

Transformar o design actual (genérico, claro, sem personalidade) num design moderno e premium inspirado nas referências enviadas: tema escuro, cards com bordas subtis e efeitos de partículas/pontos, tipografia limpa e acentos de cor vibrantes.

## Mudanças Principais

### 1. Tema Escuro como Padrão
- Forçar o tema escuro por defeito em toda a aplicação
- Ajustar as variáveis CSS do dark mode para corresponder ao visual das referências (fundo quase preto `~hsl(220, 25%, 5%)`, cards com fundo `~hsl(220, 22%, 8%)`, bordas subtis esverdeadas/cinzentas)

### 2. Efeito de Partículas no Fundo
- Criar um componente `StarfieldBackground` com pontos animados subtis (como nas referências) usando CSS puro ou canvas leve
- Aplicar como fundo global nas páginas principais

### 3. Sidebar Redesenhada
- Estilo mais limpo, com indicador lateral verde no item activo (como na referência)
- "Sair" no fundo com ícone, layout mais espaçado

### 4. Páginas de Login/Registo
- Fundo escuro com efeito de partículas
- Card de login com estilo glass-morphism subtil
- Manter o branding ProspectEz mas com visual premium

### 5. Dashboard (Painel Principal)
- Saudação personalizada: "Olá, [Nome]!" com subtítulo
- Cards de estatísticas redesenhados: fundo escuro, ícones coloridos no canto, números grandes e brancos
- Barra de progresso para metas (como "Meta Semanal" na referência)
- Secção de actividade recente com layout mais limpo
- Gráficos com cores vibrantes sobre fundo escuro

### 6. Página de Clientes
- Cards de contagem por status no topo (como na referência: "Em análise", "Em contacto", etc.) com ícones coloridos
- Tabela com fundo escuro, linhas com hover subtil
- Botão "+ Adicionar Novo Cliente" com destaque verde/primário
- Barra de pesquisa integrada no card

### 7. Páginas Restantes (Prospecção, Mensagens, Configurações, Admin)
- Aplicar o mesmo padrão visual: cards escuros, tipografia limpa, espaçamento consistente
- Tabs com estilo mais elegante
- Inputs e selects com estilo escuro

### 8. Componentes UI Globais
- Cards: `bg-card` mais escuro, `border` subtil, cantos arredondados `rounded-xl`
- Badges: mais contrastantes com cores vibrantes
- Buttons: primário com gradiente ou cor sólida vibrante
- Inputs: fundo ligeiramente mais claro que o card, bordas subtis
- Tables: sem bordas pesadas, separadores subtis

## Ficheiros a Alterar

| Ficheiro | Alteração |
|---|---|
| `src/index.css` | Actualizar variáveis CSS dark, adicionar classes de partículas |
| `src/components/StarfieldBackground.tsx` | **Novo** -- componente de fundo animado |
| `src/components/AppSidebar.tsx` | Redesenhar com indicador activo lateral |
| `src/components/AppLayout.tsx` | Integrar StarfieldBackground, header redesenhado |
| `src/pages/Login.tsx` | Visual escuro premium |
| `src/pages/Register.tsx` | Mesmo estilo do login |
| `src/pages/RecoverPassword.tsx` | Mesmo estilo |
| `src/pages/Dashboard.tsx` | Saudação, stat cards redesenhados, barra de meta |
| `src/pages/Clients.tsx` | Cards de contagem, tabela escura |
| `src/pages/Prospection.tsx` | Cards e tabs com estilo escuro |
| `src/pages/Messages.tsx` | Mesmo padrão visual |
| `src/pages/SettingsPage.tsx` | Cards escuros, inputs estilizados |
| `src/pages/Index.tsx` | Landing page com visual consistente |
| `tailwind.config.ts` | Novas animações para partículas |

## Abordagem Técnica

- Usar `next-themes` (já instalado) para forçar dark mode
- Manter shadcn/ui como base, apenas sobrescrever variáveis CSS
- Efeito de estrelas com `position: fixed` e `pointer-events: none`
- Sem dependências novas necessárias

