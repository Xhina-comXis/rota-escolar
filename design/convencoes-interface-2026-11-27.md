# Convenções de interface — 27/11/2026

## Objetivo e contexto

Tornar as interações previsíveis para funcionários e administração, especialmente no celular. A solicitação pede padrões familiares em todo o app e abertura do veículo pela placa e pelo cartão. Mantemos a identidade azul, amarela e branca da Nova Aliança e a arquitetura existente.

A pesquisa compara recomendações oficiais de sistemas estabelecidos. Ela identifica convenções recorrentes; não mede participação de mercado nem demonstra que um padrão é o mais usado em todos os produtos. O processo segue o arquivo contextual-product-design fornecido pelo usuário, reaproveitando a documentação de rotina móvel do projeto.

## Referências e decisões

Referências consultadas em 27/11/2026:

| Área | Evidência primária | Aplicação no app |
| --- | --- | --- |
| Senha | [MUI: adornos de campos](https://mui.com/material-ui/react-text-field/#input-adornments), [Carbon: text input](https://www.carbondesignsystem.com/building-blocks/core/components/text-input/guidelines) | Olho dentro do campo, à direita, alterna revelar/ocultar. Rótulo permanece fora do campo. Nome acessível acompanha a ação e o valor digitado é preservado. |
| Cartões | [MUI: cards](https://mui.com/material-ui/react-card/), [USWDS: cards](https://designsystem.digital.gov/components/card/) | Placa, cabeçalho e corpo livre abrem os detalhes. Abastecer permanece uma ação independente. Cabeçalho é botão nativo com foco e teclado; não há botões aninhados. Selecionar texto e clicar com botão direito não abrem detalhes. |
| Busca | [Carbon: search](https://www.carbondesignsystem.com/building-blocks/core/components/search/guidelines) | Campo de busca com lupa, X para limpar, Escape e contagem de resultados anunciada sem interromper a digitação. |
| Ações | [Fluent: buttons](https://fluent2.microsoft.design/components/web/react/core/button/usage) | Hierarquia entre ação principal e secundária; ação em andamento mostra texto, indicador e estado ocupado. Desabilitação por pré-requisito não mostra carregamento. |
| Formulários em diálogo | [Fluent: dialogs](https://fluent2.microsoft.design/components/web/react/core/dialog/usage) | Fechar no cabeçalho, conteúdo rolável e ações persistentes. Erro aparece com destaque e rola para a área visível. |
| Navegação móvel | [MUI: bottom navigation](https://mui.com/material-ui/react-bottom-navigation/) | Quatro destinos com ícones consistentes e rótulos visíveis; Mais usa reticências e abre painel inferior. Os textos ajudam usuários ocasionais. |

## Revisão transversal

- Abas de veículos e chamadas têm seleção por sublinhado, uma linha rolável em telas pequenas, relação acessível com o painel e navegação por setas, Home e End.
- Expansores de jornada usam chevron. Chamadas e equipe têm ícones distintos. Foco de teclado permanece visível.
- Mantidos: textos Presente/Ausente, rótulos de campos, mensagens de situação junto às cores, confirmações de operações importantes, seleção nativa e navegação já conhecida. Familiaridade não exige substituir informação útil por ícones isolados.
- Sem adicionar biblioteca visual ou alterar permissões, dados, regras de sessão, ponto, chamadas ou rastreamento.

## Validação

Prévia local com banco isolado e credenciais fictícias. Conferência visual em desktop e viewport 390 × 844: olho dentro da senha; abertura por placa e corpo do cartão; Abastecer independente; limpar busca; painel Mais; formulário com cabeçalho e ações visíveis. Navegação das abas verificada com teclado nas telas de veículo e chamadas.

Quatro verificações automatizadas novas cobrem alternância da senha, estrutura e escape do cartão, exclusões do clique no corpo e limpeza da busca. A suíte completa possui 38 verificações. A validação no navegador simula dimensões móveis; não substitui testar o aparelho físico do usuário.
