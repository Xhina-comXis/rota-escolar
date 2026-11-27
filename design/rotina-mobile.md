# Rotina móvel — 27/11/2026

Contexto: gestão operacional usada por proprietário, equipe e funcionários em celular e desktop. Preservada a identidade azul/amarelo já aprovada e a identificação da frota por placa. A auditoria anterior demonstrou navegação móvel extensa, excesso de informação antes da busca e tabelas de jornada largas.

Decisões aplicadas: navegação principal reduzida com Mais; resumo Hoje por permissão; busca da frota em primeiro plano; cadastro pendente em cinza separado dos avisos operacionais; relatório móvel por dias expansíveis; progresso/busca da chamada persistentes; rascunho por conta; reaproveitamento explícito de listas sem propagação silenciosa; histórico com período e autoria. Nenhuma marcação automática de presença.

Referências consultadas em 25/11/2026: [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), para informação caber sem exigir rolagem em duas direções; [W3C Status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), para feedback sem deslocar foco; [Chrome, retrying requests](https://developer.chrome.com/docs/workbox/retrying-requests-when-back-online/), para separar falha de rede de confirmação e não assumir que um reenvio é seguro. A fila implementada é explícita e vinculada à conta na aba; não se afirma uso de Workbox ou suporte offline completo.

Verificado anteriormente em cópia isolada: Hoje e navegação móvel em 390×844, rascunho ao fechar e reabrir Nova viagem, busca/filtro de 16 alunos fictícios, confirmação individual, histórico por período e autoria. Identificado transbordamento de 3 pixels no cabeçalho e aplicada correção de largura e retirada do atalho redundante de alerta no celular. A última repetição visual após integrar rastreamento ficou indisponível porque não havia navegador habilitado. Essa correção final de largura e a apresentação por dias ainda precisam de nova conferência visual; os templates foram renderizados em teste de inicialização.

Validação automatizada: 34 verificações em pnpm test, cobrindo inicialização na ordem do HTML, renderização de Hoje/relatório, listas, idempotência, conflito, autorização, sessão persistente, ponto, recuperação e backup. Os testes usam contas e alunos fictícios. Não foi realizada avaliação com usuários reais nem auditoria completa de WCAG.

Limites: banco relacional hospedado depende de dimensionamento e provisão; acesso histórico após substituição de funcionários é decisão de privacidade; offline completo exige política de cache de dados pessoais e ciclo de vida. Mantidas as permissões atuais.
