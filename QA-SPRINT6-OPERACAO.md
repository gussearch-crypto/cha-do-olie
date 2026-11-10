# Homologação — Sprint 6 | Operação do Chá do Oliver

## Escopo e segurança
- **Data do evento:** sexta-feira, 04/12/2026, das 18h às 22h.
- **Participantes:** capacidade de 100 adultos e crianças a partir de 5 anos; menores de 5 não ocupam vaga.
- **30/11:** data de referência para estimativa de produção e custos; **não encerra a inclusão** de novos convidados. Novas inclusões podem continuar até 04/12, conforme capacidade.
- **Sem check-in, sem rastreamento de presentes por convidado, sem automação de envio do WhatsApp.**
- A Preview continua conectada à base oficial de convidados e planejamento **para leitura**. Nenhum teste deve escrever ou cadastrar dados fictícios nela.
- A nova Central do Dia bloqueia **conclusão/reabertura direta de tarefas oficiais na Preview**. O Laboratório é o lugar correto para testes dos Jogos.
- Nenhuma migração ou nova Edge Function foi aplicada. Production só muda mediante autorização expressa para um SHA específico.

## 6.1 · Convidados e vagas
- [ ] Aba Operação do Dia mostra confirmados contabilizados, vagas, pendências e menores de 5.
- [ ] Botão **Abrir convidados** conduz à aba Convidados existente.
- [ ] Nenhum convidado é removido automaticamente após 30/11.
- [ ] A inclusão de um núcleo posterior a 30/11 permanece possível no painel administrativo, respeitando limite de 100 contabilizados.

## 6.2 · Base de produção
- [ ] Sem base salva, é possível registrar uma fotografia **agregada e datada** em armazenamento local.
- [ ] No dia 30/11, o registro é reconhecido como referência exata. Em qualquer outro dia, aparece aviso explícito de que não representa fotografia de 30/11.
- [ ] Após mudança nas confirmações, a comparação preserva o valor salvo, mostra evolução no número de participantes e custo contratado.
- [ ] É possível exportar a base em CSV, fazer backup JSON e restaurar JSON no mesmo ou em outro navegador.
- [ ] A fotografia da produção **não bloqueia o RSVP** e não contém nomes de convidados.

## 6.3 · Central do Dia
- [ ] Listagem real de tarefas cadastradas para 04/12, com horários, responsáveis, local e status.
- [ ] Filtros Todos, Montagem, Durante o chá e Encerramento mostram as mesmas tarefas nas respectivas janelas.
- [ ] Identificar conflitos de horário, responsáveis ausentes e etapas pendentes.
- [ ] **Preview**: botão para concluir tarefas oficiais fica desabilitado.
- [ ] **Production somente após aprovação**: conclusão/reabertura usa as validações e persistência do Planejamento existente; depende da confirmação do servidor.
- [ ] Botão Abrir Ações leva ao módulo existente sem apagar filtros ou tarefas.

## 6.4 · Jogos
- [ ] Checklist local independente do jogo oficial; marcar um item **não encerra palpites** nem revela resultado.
- [ ] QR Codes e impressão aponta para a página oficial do projeto; versões Preview usam aviso de URL não imprimível.
- [ ] Link Laboratório abre `/games/teste`.
- [ ] Botão Jogos abre controles existentes.
- [ ] Conclusão da brincadeira da barriga acontece no módulo oficial, protegida pelas regras já implementadas.

## 6.5 · Kit do Organizador
- [ ] Exibe pendências de compras e parcelas com saldo financeiro.
- [ ] Exporta CSV UTF-8 BOM com resumo de participantes, cronograma, responsáveis, compras e pagamentos.
- [ ] Exportação CSV protege dados que começam por `=`, `+`, `-`, `@`.
- [ ] Impressão / Salvar PDF usa a tela Operação, sem navegação lateral.
- [ ] Lista nominal de convidados permanece disponível pela exportação da aba Convidados.
- [ ] Não envia dados para outro sistema.

## 6.6 · Central de Mensagens
- [ ] Está visível em **Convidados → Central de Mensagens**.
- [ ] Quatro modelos: convite inicial, confirmação pendente, convite após 30/11 e lembrete de evento.
- [ ] Editor de texto com variáveis autorizadas; variáveis desconhecidas impedem salvar.
- [ ] Prévia mostra nome, link, PIN, data, hora, local e emojis sem códigos `%XX`.
- [ ] Modelos são salvos **neste navegador** e podem ser exportados/importados com backup JSON.
- [ ] O texto do botão **Copiar convite** usa o modelo salvo, incluindo o modelo de novas inclusões após 30/11.
- [ ] Botão **Preparar lembrete** usa o modelo editável e mantém o histórico de envios existente.
- [ ] Para confirmados, **Copiar lembrete do evento** permite enviar manualmente.
- [ ] Não há link `wa.me/?text=...`, disparo automático, nem registro de envio ao copiar.
- [ ] Ao clicar **Marcar como enviado**, o registro é feito apenas após envio manual.

## Critérios técnicos para homologação
- [ ] `npm test` e `npm run build` passam no mesmo SHA.
- [ ] Preview Vercel `READY` corresponde ao SHA aprovado.
- [ ] Validar layout em celular estreito e desktop (idealmente 320, 375, 390 e 430 px).
- [ ] Testar editor de mensagens sem salvar códigos de acesso reais em capturas.
- [ ] Testar exportações e impressão com dados lidos, sem criar convidados, sem enviar lembretes e sem alterar o Supabase real.
- [ ] Verificar que Production continua na Sprint 4 até autorização manual separada.
