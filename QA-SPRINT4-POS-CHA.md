# Sprint 4 — Homologação em Preview (sem publicar Production)

## Entregas incluídas

**4.1 — A Espera do Oliver**: hero com DPP como referência, resumo sem nomes e estado dos palpites atualizado do Supabase; foto e data real aparecem apenas se o anúncio estiver publicado.

**4.2 — Encerramento dos Jogos**: controles já existentes de encerramento, registro oficial e histórico mantidos. Incluída linha do tempo visual no painel de Jogos; em Preview as operações que alteram jogos reais são bloqueadas. O Laboratório continua sendo o ambiente exclusivo de simulação de dados oficiais.

**4.3 — Revelação e ranking**: fluxo atual do ranking de até 400 pontos preservado, com publicação administrativa independente da publicação da chegada. Ajustada a página pública para não inferir nascimento apenas porque o ranking esteja disponível.

**4.4 — Inventário pós-chá (rascunho local)**: aba **Fraldas**, abaixo das sugestões previstas. Permite cadastrar itens por tamanho/categoria sem identificar quem entregou, editar, excluir, ver totais e valores estimados, exportar CSV, salvar/restaurar backup JSON. O custo contratado é consultado em leitura no Financeiro. **Limitação importante: itens do inventário não são sincronizados com o Supabase e ficam somente no navegador atual; a sincronização entre aparelhos dependerá de uma futura entrega de backend aprovada separadamente.**

## Testes a conferir

### A Espera do Oliver
- [ ] Acessar \`/a-espera-do-oliver\` na Preview e verificar responsividade.
- [ ] Antes de 04/12, a página não afirma que o chá ocorreu; depois de 04/12, apresenta a mensagem de pós-evento.
- [ ] Exibir a DPP em 28/01/2027 apenas como estimativa; não inventar nascimento quando a data passar.
- [ ] Resumo coletivo mostra somente contagem e médias, sem nomes, telefones ou palpites individuais.
- [ ] Link online abre a Preview; tentativas de gravar palpites reais na Preview continuam bloqueadas.
- [ ] A publicação do ranking não libera foto nem dados da chegada sem anúncio autorizado.
- [ ] Foto, peso, comprimento e horário privados não devem ser exibidos antes do anúncio.

### Jogos
- [ ] Painel → Jogos → Visão geral: jornada de 3 etapas abre as telas de Palpites e Resultados.
- [ ] Preview exibe **somente leitura** e não permite modificar dados reais por controles de Jogos.
- [ ] \`/games/teste\` (Laboratório) permite simular cadastro → encerramento → dados fictícios → ranking → publicação fictícia.
- [ ] A ação de publicação do nascimento permanece independente da publicação do ranking.
- [ ] Empates, data/hora de inclusão do palpite e pontuação final continuam seguindo as regras existentes, sem mudança de algoritmo nesta sprint.

### Inventário pós-evento
- [ ] Painel → Fraldas → O que recebemos para o Oliver.
- [ ] Cadastrar fraldas RN, P, M, G, GG, XG, outras categorias de presente e valores opcionais.
- [ ] Registrar **1 pacote M com 32 fraldas** e **1 pacote M com 56 fraldas**: exibir **2 pacotes M e 88 fraldas M**.
- [ ] Registrar **3 pacotes P com 40 fraldas**: exibir **120 fraldas P e 3 pacotes P**.
- [ ] No formulário, campo **Quantidade de pacotes** e **Fraldas por pacote** são distintos e obrigatórios para fraldas; valor estimado é por pacote.
- [ ] Total geral apresenta pacotes e fraldas separadamente; o quadro por tamanho apresenta fraldas e pacotes.
- [ ] Backups antigos sem fraldas por pacote carregam normalmente, exibem aviso para completar os dados e não inventam unidades.
- [ ] CSV contém quantidade de pacotes, fraldas por pacote e total de fraldas, inclusive para embalagens diferentes do mesmo tamanho.

- [ ] Editar, excluir e confirmar totais (quantidades e estimativas).
- [ ] CSV abre corretamente no Excel, sem nomes de participantes.
- [ ] Exportar JSON e importar backup em outro navegador; os registros devem ser restaurados.
- [ ] Depois de recarregar o navegador, os dados continuam localmente, mas **não** são compartilhados com outros dispositivos.
- [ ] O comparativo mostra o custo contratado do Financeiro, distinguindo-o de custo real final.

### Verificação de entrega
- [ ] \`npm test\` conclui com sucesso.
- [ ] \`npm run build\` conclui com sucesso.
- [ ] Vercel Preview READY no commit certo.
- [ ] Production no commit aprovado anteriormente.
- [ ] Nenhum deploy da Edge Function ou alteração na base real foi realizado.

## Publicação

A publicação de Production será **manual e somente após autorização explícita do organizador**.
Testes de nascimento, anúncio e resultados oficiais deverão ocorrer somente no Laboratório. Não registrar dados fictícios no Supabase real.
