# Teste do J16

1. Em um servidor da empresa acessível ao chip, instale o [Traccar Server](https://www.traccar.org/download/) e disponibilize a porta TCP 5023 para GT06. Disponibilize a API do Traccar por HTTPS para a aplicação.
2. Cadastre o identificador do J16 no Traccar e use a placa do veículo como nome do dispositivo. A placa deve existir na frota da Nova Aliança. Use uma conta de leitura no Traccar com acesso somente aos rastreadores desta frota.
3. Configure na Vercel as variáveis de servidor `TRACCAR_URL` (endereço HTTPS base do Traccar, sem /api) e `TRACCAR_TOKEN` (token da conta de leitura). Refaça o deploy. Mantenha o token e os identificadores dos aparelhos fora do GitHub.
4. No configurador do J16, abra a COM8, leia os parâmetros atuais e grave o IP/DNS do receptor TCP e a porta 5023. Confira o APN do chip. O endereço da aplicação web na Vercel não é o endereço do receptor TCP.
5. Confirme no Traccar que chegou uma posição válida. Entre no app como administrador ou gestor e abra **Rastreamento**. Confira a placa, o horário e as coordenadas. Use **Atualizar posições** para consultar de novo.

A integração considera uma posição recente por 15 minutos. Uma posição antiga continua disponível como última posição, com status **Sem sinal recente**. Variantes do J16 podem exigir confirmação do protocolo pelo log do receptor.
