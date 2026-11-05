# Homologação — Sprint 3 · Central de Preparação

**Ambiente:** Vercel Preview em \`dev-supabase\`. **Não publicar em Production** sem aprovação explícita.

## Visão Geral
- [ ] Acessar \`/?painel=1\`, entrar com a autenticação administrativa existente e abrir **Visão geral**.
- [ ] Confirmar que a Central de Preparação aparece sem duplicar os cartões antigos.
- [ ] Conferir 4 indicadores: confirmados contabilizados (de 100), aguardando confirmação, ações abertas e saldo a quitar.
- [ ] Conferir que as informações vêm dos módulos existentes. Nenhuma tarefa ou pagamento é gerada automaticamente.
- [ ] Verificar que os botões abrem as abas Convidados, Ações e Financeiro.
- [ ] Forçar a atualização dos dados e verificar que as informações mudam sem recarregar a página.

## Prazo de RSVP
- [ ] Confirmar que somente adultos e crianças com 5 anos ou mais contam na capacidade de 100 pessoas.
- [ ] Menores de 5 anos confirmados não consomem vagas.
- [ ] Núcleos de teste não entram nas contagens.
- [ ] Até o dia **30/11/2026**, mostrar o prazo em aberto, inclusive em todo o dia 30.
- [ ] A partir de **01/12/2026**, sinalizar a necessidade de revisão de convidados não confirmados **sem cancelar nem excluir ninguém**.
- [ ] Mesmo após 30/11, a interface mantém o número de vagas disponíveis e permite usar a aba Convidados para incluir novos núcleos.

## Cronograma do dia 04/12
- [ ] Mostrar apenas ações agendadas para **04/12/2026** com horário válido.
- [ ] Conferir ordem cronológica e agrupamento em preparação antes das 18h, evento 18h–22h e finalização após as 22h.
- [ ] Exibir responsável, local e etapas pendentes quando esses campos existirem.
- [ ] Destacar conflitos de horário do mesmo responsável e atividades sem responsável, com acesso à aba Ações.
- [ ] Quando não houver ações cadastradas, exibir a mensagem de lista vazia — não inventar horários.
- [ ] Concluir uma ação em Planejamento e conferir que a Central mostra a atualização após salvar.

## Financeiro e prioridades
- [ ] Os valores de contratado, pago, em aberto e vencido devem coincidir com Financeiro.
- [ ] Parcelas já quitadas não entram em próximos pagamentos.
- [ ] Saldo sem vencimento/parcelamento recebe alerta para programação.
- [ ] Exibir a meta e o fechamento projetado somente quando houver meta cadastrada.
- [ ] Central de prioridades apresenta atrasos, próximos 7 dias, pendências de RSVP, responsáveis e conflitos, sem repetir a mesma despesa em várias seções.
- [ ] Os filtros de prioridades funcionam sem perder a atualização.

## Mobile e segurança
- [ ] Validar em 320, 375, 390 e 430 px e desktop, sem rolagem horizontal ou recortes de textos.
- [ ] Botões de navegação, filtros, recarregar e cronograma respondem a toque.
- [ ] O painel está protegido pela senha de organização e exibe o aviso de Preview.
- [ ] Nenhum teste modifica convidados reais, pagamentos, status dos jogos ou resultados oficiais. Simulações de palpites continuam no Laboratório dos Jogos.
- [ ] GitHub Actions: \`npm test\` e \`npm run build\` passam.
- [ ] Vercel: Preview **READY**; Production continua no commit anterior.

Os testes de regras de negócio estão em \`tests/admin-final-readiness.test.mjs\`.
