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
- [ ] Conferir o SHA atual de Production antes da publicação; nunca presumir que permanece na Sprint 4.

## Ajuste adicional — Presenças na edição do núcleo (11/11/2026)

- [ ] Na aba **Convidados**, a listagem apresenta nome e status de cada pessoa, mas não apresenta botões individuais de confirmação, ausência ou reversão.
- [ ] Clique em **Editar** do núcleo familiar para abrir a edição.
- [ ] Cada integrante tem seletor **Status de presença** com **A confirmar / Confirmado / Não irá**. Isso vale também para adicionar novos integrantes durante a edição.
- [ ] Uma única ação **Salvar alterações** atualiza os dados do núcleo e as situações selecionadas.
- [ ] A senha administrativa adicional só é solicitada quando houver mudança de presença, com resumo prévio das transições.
- [ ] São permitidas as transições *A confirmar → Confirmado*, *A confirmar → Não irá*, *Não irá → Confirmado*, *Não irá → A confirmar*, *Confirmado → A confirmar* e *Confirmado → Não irá*.
- [ ] Validar que não há mudança de status se a senha for incorreta.
- [ ] Atualizar apenas integrantes modificados; registros de histórico individuais têm origem administrativa.
- [ ] Conferir status agregado do núcleo e recomendações de fraldas conforme modalidade, sem rastrear presentes recebidos por convidado.
- [ ] Capacidade segue limitada a 100 contabilizados; menores de 5 anos não ocupam vagas.
- [ ] Criança confirmada precisa ter faixa etária definida. Ajustar a idade e o status na mesma edição deve funcionar.
- [ ] 30/11 não encerra confirmações administrativas; novos integrantes e alterações seguem permitidos até 04/12 conforme vagas.
- [ ] Tentar salvar com dados desatualizados de outro administrador deve gerar alerta, sem excluir convidados cadastrados no outro acesso.
- [ ] Na **Preview**, alterações de presença não são enviadas ao Supabase oficial. Testar a apresentação do formulário e validações locais; homologar persistência somente após publicação autorizada da função e do frontend.
- [ ] As atualizações de cadastro e de presença são operações distintas dentro da mesma chamada de API. Existe risco residual de persistência parcial em falhas intermediárias; em caso de aviso, atualizar a lista antes de tentar novamente.
- [ ] **Concorrência:** a verificação atual de vagas é anterior à gravação, não transacional. Para evitar corrida na última vaga, não executar confirmações simultâneas por administradores diferentes.
- [ ] **Supabase:** o código atualizado da Edge Function `invite-api` segue na branch, sem implantação automática no banco oficial. A publicação do backend depende de aprovação específica.

## Situação de Production consultada em 11/11/2026
- SHA em Production: 72fe4225926ec29a311283338342fb05a758518f.
- A nova confirmação administrativa de pendentes não está ativa nesse commit.

## Validação funcional sem gravações oficiais — 11/11/2026

### Testes automatizados
- [x] Regras de capacidade isoladas em `supabase/functions/_shared/guest-attendance-rules.mjs`, reutilizadas pela Edge Function.
- [x] Testados 10 cenários de regras: adultos, menores de 5 anos, limite de 100, troca de participantes, reversão, mudança da idade, núcleos de teste, estados agregados, modalidades de fraldas e preservação de recebimentos.
- [x] Fluxo de edição continua com somente uma solicitação de senha no clique em **Salvar alterações** quando há mudança de status.
- [x] Histórico individual utiliza a função existente `update_guest_attendance_with_source` e o trigger `guest_attendance_history_trigger` (confirmados por consulta somente leitura ao Supabase).
- [x] Ajuste de sugestões de fraldas preserva registros que tenham data de recebimento ou fonte diferente de `planned`.
- [x] Mudar o tipo de um convidado confirmado entre adulto e criança atualiza a quantidade sugerida de fraldas quando aplicável.
- [x] A Preview bloqueia **todas as ações de gravação** do módulo de Convidados; somente operações de leitura são permitidas. A edição de nomes/grupos também não grava no banco oficial.

### Testes e dependências ainda pendentes
- [ ] Teste de integração real da Edge Function com gravação, revisão de histórico e rollback, somente mediante autorização específica e plano de backup.
- [ ] Revisão de salvamento **transacional**: múltiplas operações de edição são atualmente feitas em chamadas sucessivas do Supabase. Uma falha intermediária pode produzir atualização parcial de um núcleo.
- [ ] Revisão de concorrência: a capacidade é verificada antes da atualização; duas confirmações simultâneas da última vaga ainda não são impedidas por trava de banco. Evitar alterações simultâneas antes de resolver isso.
- [ ] Aprovar explicitamente a versão final e a ordem da implantação: revisão/backup do banco → Edge Function `invite-api` → frontend Vercel Production → validação real de um cenário controlado.
- [ ] Depois da implantação, confirmar histórico, totais, reversão, sugestões de fraldas e funcionamento da confirmação pública.
- [ ] Restaurar ou manter o bloqueio de publicação automática após liberação manual.

**Importante:** os testes unitários e a Preview READY são necessários, mas não substituem a homologação integrada de escrita. Não implantar automaticamente a Edge Function ou o frontend em Production.

## Incidente de compatibilidade — status não persistido (11/11/2026)

**Causa confirmada:** a Edge Function publicada `invite-api` v26 executa `adminUpdateFamily` salvando apenas nome, grupo, tipo de pessoa e idade. Ela ignora os campos `attendance` e `confirmationCode` e retorna `{ok:true}` mesmo sem atualizar a presença. O frontend mais recente não deve interpretar esse `ok` como confirmação.

**Correção preparada no Git, ainda não publicada:**
- [x] O backend anuncia `adminCapabilities.capabilities.batchAttendanceUpdate=true` somente quando implementa o processamento de presenças.
- [x] Ao clicar em Salvar alterações com status modificados, o frontend consulta essa capacidade **antes de solicitar a senha e antes de enviar qualquer escrita**.
- [x] Se o backend for antigo, mostra mensagem de incompatibilidade, mantém o editor aberto e não tenta salvar parcialmente a edição.
- [x] Depois de uma gravação aceita, exige a contagem `attendanceChanges` e consulta `adminList` para conferir os status efetivos antes de fechar a edição.
- [x] Se o servidor disser sucesso mas os status diferirem, não exibe salvamento concluído: mostra erro e mantém a edição aberta.
- [x] Testes de regressão impedem remoção acidental dessa proteção.
- [ ] **Publicação pendente:** liberar backend e frontend juntos, de maneira controlada e com autorização explícita, após plano de backup e revisão dos riscos de transação parcial e concorrência.
- [ ] Fazer um teste integrado de gravação/reversão e conferência de histórico em núcleo de teste autorizado **depois** da implantação.

**Até a publicação conjunta:** não usar o formulário novo para mudar presença na Production. A Preview continua sem permissão para gravações oficiais. O convite público segue seu fluxo já existente.
