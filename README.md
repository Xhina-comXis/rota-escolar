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

Cópia privada anterior à primeira alteração de cada dia em nova-alianca/backups. Exportar frota / Importar frota tratam somente veículos e seus registros. Em Ajustes, o administrador pode baixar um Backup completo com senha própria do arquivo (AES-256-GCM e scrypt), após confirmar sua senha atual. Inclui frota, contas, horários, ponto, ajustes, chamadas e retificações. Sessões, dispositivos autorizados e códigos de recuperação são removidos da cópia exportada para evitar reativação de acessos antigos.

Na versão online, Restaurar backup completo valida a senha e a integridade do arquivo, exige a senha atual do administrador e a palavra RESTAURAR. Cria uma cópia privada anterior à restauração e substitui o estado compartilhado com gravação condicional. Contas e senhas voltam às existentes no arquivo; todos precisam entrar novamente. Na LAN, a exportação completa funciona; restauração completa deve ser feita com suporte e servidor desligado.

## Recuperação de acesso

O administrador pode gerar seis códigos de uso único em Minha conta → Códigos de recuperação, confirmando sua senha atual. Um arquivo privado é baixado, e os códigos são mostrados uma vez. Guarde-os fora do app. Gerar novamente substitui os anteriores. No login, Esqueci minha senha permite trocar um código válido por uma senha temporária de 24 horas, revogando sessões e exigindo nova senha pessoal. Funcionários continuam podendo pedir redefinição à administração. Sem códigos previamente guardados, o administrador precisa de suporte. Não há recuperação por email configurada.

## Correções operacionais

Chamadas de outro dia ou já concluídas podem ser retificadas somente pelo administrador, informando motivo e situação explícita de cada aluno. Marcas originais, autoria e histórico de retificações são preservados. Criações de viagem têm chave de idempotência. Consultas antigas são descartadas ao trocar de sessão; rascunhos locais são separados por conta.

Em Documentos → Aplicabilidade, é possível confirmar se o item se aplica ao veículo. Não se aplica exige justificativa, suspende apenas aquele aviso e preserva datas anteriores. Nenhuma dispensa é inferida automaticamente.

A consulta FIPE online roda diariamente às 05h de São Paulo para buscar a referência mensal. Falhas preservam o valor anterior, indicam o erro e permitem nova tentativa no dia seguinte. O trabalho automático tem orçamento de tempo para respeitar o limite da função; um lote parcial continua nas execuções seguintes. A referência do mês depende da disponibilidade do serviço externo e do vínculo correto do veículo.

## Validação

Node.js 24: pnpm test executa regressões de sessão, ponto, HTML, idempotência, retificação, recuperação, backup/restore, aplicabilidade, FIPE e envio duplicado. Dados inteiramente fictícios em diretórios temporários. pnpm build gera a interface sem incluir bancos ou credenciais.

## Origem

Chat de referência: https://chatgpt.com/share/6b071091-b954-83e9-96a5-f8275a8947b7

Protótipo importado do commit 5edc489f1034352a88a25e38ce640130c0f17dcf. A integração substitui localStorage por persistência compartilhada autenticada. O protótipo antigo fica preservado no histórico Git.

## Acesso em aparelho pessoal

Lembrar meu login e manter conectado preserva a sessão por até 30 dias em cookie HttpOnly e guarda somente o login no navegador. Sem a opção, o acesso dura 12 horas. Sair, alterar a senha ou redefinir o acesso revoga as sessões. A senha não é armazenada em localStorage. Mostrar/Ocultar alterna somente a exibição do campo durante o preenchimento.

## Rotina e uso no celular

A entrada autenticada abre Hoje, com viagens da conta e próprio ponto; administradores também consultam jornadas a conferir e prioridades da frota. No celular, Hoje, Frota e Chamadas ficam na navegação principal e as demais áreas em Mais. Funcionários mantêm apenas as áreas autorizadas.

Cadastro a conferir fica separado de prazo próximo e urgência. Na chamada, a barra de progresso e conclusão é persistente, com busca e filtro de alunos sem confirmação. Os relatórios de jornada usam dias expansíveis no celular.

Listas de alunos podem ser guardadas e reutilizadas; Criar volta reaproveita os dados da ida. Atualizar uma lista não altera viagens existentes nem snapshots de chamadas iniciadas. Histórico aceita período de até 93 dias, escola/linha e responsável, com exportação CSV e alterações identificadas.

Formulários elegíveis mantêm rascunho de 24 horas nesta aba e na conta que o criou; senha, arquivo, recuperação e formulários de ações sensíveis não entram nesse mecanismo. Fechar um formulário modificado oferece guardar, continuar ou descartar.

Durante uma chamada já aberta, marcações com conexão perdida ficam pendentes nesta aba, sem nomes na fila local e com identificadores idempotentes. Quando volta a conexão, o app tenta confirmar. Conflito fica visível e não sobrescreve outra marcação. É necessário manter a aba; isso não equivale a um aplicativo inteiramente offline. Ponto continua exigindo resposta do servidor.

A atualização da frota usa 30 segundos durante uso, 90 quando ociosa e recuo após falhas; a verificação periódica da sessão passa a 60 segundos. Não houve migração de banco relacional nem alteração de quem consulta histórico após reatribuir uma linha.
