# Sprint 5 — Inventário inteligente, sincronização e Enxoval do Oliver

## Ambientes e segurança
- Todas as alterações desta sprint existem apenas em `dev-supabase`.
- Existe apenas um Supabase principal. Uma branch de homologação **não foi criada** porque a operação exige autorização para custos.
- Migração e Edge Function foram preparadas no GitHub e **não executadas nem implantadas**.
- A Preview permanece em **rascunho local**. Nenhum envio à API compartilhada ocorre fora do domínio oficial.
- A liberação do backend exige autorização distinta para aplicar a migração no banco principal, configurar a função e validar a segurança.
- Publicação do frontend em Production exige homologação e autorização manual separadas.

## Inventário local e compartilhado (5.1)
- [ ] Em Preview, adicionar, editar, excluir, importar e exportar registros usando apenas o navegador.
- [ ] Os registros do navegador permanecem intactos após atualização ou erro de rede.
- [ ] Em Production **somente após backend implantado**, a tela detecta a API do inventário e lê seu número de revisão.
- [ ] Com rascunho local existente, nenhuma migração acontece sem clique expresso em **Mesclar rascunho**.
- [ ] A mesclagem usa IDs, não duplica itens iguais e exige conferência se houver IDs com conteúdos divergentes.
- [ ] Erro 409 por edição simultânea não confirma gravação nem apaga dados locais: usuário atualiza a versão compartilhada.
- [ ] Na versão compartilhada, edição, exclusão e inclusão só aparecem como salvas após resposta confirmada do servidor.
- [ ] Operações autenticadas exigem código do administrador e servidor verifica sua identidade.
- [ ] Banco com RLS, sem políticas públicas, sem chaves privilegiadas no cliente e sem nomes/contatos de convidados.
- [ ] Histórico gerado no servidor para registro criado, atualizado e excluído.

## Estoque e Enxoval do Oliver (5.2 e 5.3)
- [ ] Registrar 1 pacote M com 32 fraldas e 1 com 56: **2 pacotes M / 88 fraldas M**.
- [ ] Registrar 2 pacotes P com 40 fraldas: **2 pacotes P / 80 fraldas P**.
- [ ] Tamanhos RN, P, M, G, GG e XG apresentados por pacotes e unidades.
- [ ] Pacotes legados sem unidades internas são sinalizados, não entram no total de unidades até completar.
- [ ] Exportar **Fraldas para Enxoval CSV**; conferir RN/P/M/G/GG/XG e total de unidades para estoque.
- [ ] Exportar **Transferência JSON**, incluindo IDs de origem para auxiliar prevenção de importação duplicada.
- [ ] O Enxoval do Oliver usa armazenamento próprio e ainda não possui importador/API compatível validado nesta sprint. Exportação **não atualiza** o estoque automaticamente.
- [ ] Não registrar doador, convidado ou núcleo familiar.

## Balanço financeiro (5.4)
- [ ] Distinguir custos contratados, pagos, saldo a quitar e valor estimado recebido.
- [ ] O comparativo é familiar e não avalia os presentes de nenhum convidado.
- [ ] Sem valores de mercado digitados não inventar preço.
- [ ] Os valores do Financeiro são apenas consultados, não alterados pelo inventário.

## Regra de convidados 30/11 versus 04/12
- [ ] 30/11 é a **referência de produção/custos**, não o fechamento de novas inclusões.
- [ ] A lista poderá ser complementada com novos convites até 04/12, ocupando as vagas remanescentes até 100 participantes contabilizados.
- [ ] Crianças menores de 5 anos não contam na capacidade.
- [ ] Convites anteriores ainda pendentes podem ser revisados/substituídos; ninguém é excluído automaticamente.
- [ ] Novos convites após 30/11 não são bloqueados por pertencerem à nova etapa de produção.
- [ ] A mensagem ao convidado com prazo individual encerrado não comunica que o evento está fechado para todos.

## Homologação técnica (5.5)
- [ ] `npm test` e `npm run build` aprovados no mesmo SHA.
- [ ] Vercel Preview `READY`; Production permanece no commit da Sprint 4.
- [ ] Nenhuma migração, deploy de Edge Function ou gravação no Supabase principal foi efetuado.
- [ ] Revisão visual em dispositivos com 320, 375, 390, 430 px e desktop.
- [ ] Conferir console do navegador e execução do formulário, inclusive troca de categorias e exportação.
