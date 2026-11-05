# Publicação controlada · Chá do Oliver

Este projeto separa desenvolvimento e homologação de produção. **Nenhuma alteração deve ser publicada em Production sem autorização explícita dos organizadores.**

## Ambientes

| Ambiente | Finalidade | Dados |
| --- | --- | --- |
| Branch dev-supabase + Vercel Preview | Revisão visual e compilação | A Preview pode consultar o Supabase real; os formulários públicos bloqueiam envio de palpites |
| /games/teste (Laboratório) | Simular inscrições, encerramento, dados oficiais e ranking | Registros fictícios isolados da tabela de palpites reais |
| cha-oliver-mvp.vercel.app | Uso oficial do evento | Registros reais |

**Atenção:** Preview e Production usam a mesma configuração de backend. Não use controles administrativos que gravam no Supabase real durante a homologação. Alterações de banco, funções, dados oficiais ou publicação dos vencedores requerem uma autorização específica.

## Trava de Production na Vercel (plano Hobby)

O projeto Vercel \`cha-oliver-mvp\` utiliza o **Ignored Build Step** com a seguinte regra:

\`\`\`sh
if [ "$VERCEL_ENV" = "production" ]; then echo "Production bloqueada: exige liberacao manual"; exit 0; else exit 1; fi
\`\`\`

Esse controle cancela builds de Production pelo fluxo normal, mas permite Preview. Não é uma regra de autorização de nível Enterprise: quem tiver permissão administrativa na Vercel poderá desativá-la ou dispensá-la. Verificar esse campo no dashboard após alterações de projeto.

Quando uma implantação oficial for explicitamente autorizada, efetuar a liberação manual do build na Vercel (por exemplo, em **Redeploy**, desmarcar **Use project's Ignore Build Step**) e conferir o commit exato. Não reabilitar deploy automático como parte dessa liberação.

## Critérios de aprovação antes de Production

1. A branch \`dev-supabase\` contém o commit aprovado e a Preview correspondente está READY.
2. GitHub Actions \`Validação de Preview — Chá do Oliver\` terminou com sucesso (testes + build, sem deploy).
3. Conferir as páginas: \`/games\`, \`/games/online\`, \`/games/resultado\`, \`/games/teste\`, \`/games/qr\`, e a administração.
4. Testar no mobile: calendário, relógio HH:MM, peso, comprimento, confirmação e consulta.
5. No Laboratório, validar abertura, duplicidade, encerramento, registro de dados oficiais, revelação e empates.
6. Checar que dados pessoais não aparecem no ranking, nos indicadores e nos comprovantes compartilhados.
7. Conferir a impressão e leitura do QR Code em um segundo aparelho.
8. Registrar aprovação explícita do organizador para o commit/Preview exatos.
9. Só então executar a publicação manual, confirmar \`READY\`, revisar o domínio oficial e os logs.

## Formato da entrega de uma Preview

- Commit / link para a Preview
- Alterações incluídas
- Testes executados e respectivos resultados
- Itens a validar no navegador
- Estado de Production: **não alterada**

## Plano de recuperação

Se houver um problema após uma publicação autorizada, usar o histórico de Deployments para restaurar a versão conhecida e válida, confirmando o domínio antes de anunciar normalidade. A restauração de Production também exige autorização expressa.

**Nenhum teste poderá salvar valores oficiais ou publicar resultados no Supabase real sem autorização.**
