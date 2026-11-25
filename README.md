# Nova Aliança Transportes

Aplicativo integrado de frota, contas da equipe, controle interno de jornada e chamadas de transporte escolar. Evolução do protótipo Rota Escolar.

## Publicação

Projeto Vercel existente: rota-escolar. Node.js 24, funções em api/index.js, interface gerada em public pelo build.cjs. O código e as imagens podem ficar no GitHub; dados e credenciais não participam do repositório ou do build.

Variáveis do servidor: BLOB_READ_WRITE_TOKEN (armazenamento privado) e NOVA_PRODUCTION_HOST (domínio oficial permitido). A Vercel mantém os dados em um Blob privado, na região de São Paulo, com leitura consistente e gravação condicional por ETag. Uma requisição só recebe confirmação depois de persistir a alteração; conflito gera nova leitura e tentativa limitada. Cada instância usa uma pasta temporária exclusiva para executar as regras SQLite existentes; essa pasta é descartada e nunca é a fonte persistente.

Esta é uma arquitetura inicial para a operação da empresa, com um estado compartilhado e proteção contra perda de atualização. A imagem completa do estado é transferida por requisição: conforme a utilização crescer, medir latência e consumo e migrar para um banco relacional hospedado. Não usar diretório /tmp como banco persistente.

Contas, senhas protegidas, horários, marcações, ajustes e alunos ficam somente no armazenamento privado. Dados reais foram migrados por um processo separado do GitHub. Cadastro inicial público está desabilitado. A conta local de demonstração teste/teste fica desativada online. Sessões anteriores foram revogadas na migração.

## Chamadas

Administração e gestores cadastram uma viagem por linha, escola, horário e sentido, com dias da semana, lista de alunos e funcionários responsáveis. Cada funcionário vê somente suas viagens. Ida e volta têm registros independentes. A lista é preservada quando a chamada começa; alterações no cadastro não reescrevem o histórico. Aluno sem marcação permanece sem marcação. A conclusão exige todos os alunos marcados. Datas, hora e autoria vêm do servidor.

As rotas de demonstração usam exclusivamente nomes fictícios e são identificadas na interface. Nenhuma informação clínica é necessária ao cadastro de chamada.

## Ponto online

Continua sendo controle interno, sem cálculo de folha. Para autorizar a rede da empresa, o administrador acessa Equipe → Rede e exceções estando no Wi-Fi da empresa, adiciona a rede da conexão e salva. A versão online verifica o IP público de origem fornecido pela Vercel; SSID e IP privado do celular não estão disponíveis. Mudanças do IP da operadora exigem revisar a autorização. Exceções continuam individuais.

## Backups

Cópia privada anterior à primeira alteração de cada dia em nova-alianca/backups. O botão de exportar no app exporta somente a frota. Para recuperação completa, usar o snapshot privado e as ferramentas administrativas do armazenamento. Preservar credenciais fora do código.

## Origem

Chat de referência: https://chatgpt.com/share/6b071091-b954-83e9-96a5-f8275a8947b7

Protótipo importado do commit 5edc489f1034352a88a25e38ce640130c0f17dcf. A integração substitui localStorage por persistência compartilhada autenticada. O protótipo antigo fica preservado no histórico Git.
