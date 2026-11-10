# Proposta futura — Inventário compartilhado (após o Chá do Oliver)

## Estado atual
- Frontend, migração e Edge Function estão versionados na branch `dev-supabase`.
- Não houve migração, deploy de função ou operação de gravação no Supabase principal.
- A Vercel Preview mantém o inventário **local por padrão** para não contaminar o banco principal. A sincronização em Preview só pode ser habilitada com um endpoint de branch Supabase diferente da principal.
- Apenas um projeto Supabase está disponível; criar branch de teste exige aprovação prévia de custos.

## Componentes
- Migração: `supabase/migrations/20261105203000_oliver_inventory_state.sql`.
- Função: `supabase/functions/oliver-inventory/index.ts`.
- Configuração: `supabase/config.toml` (`verify_jwt=false` **somente** para esta função porque há autenticação administrativa própria).
- Cliente: `oliver-inventory-sync.mjs`.
- UI: `oliver-post-event-inventory.jsx`.
- Testes: `tests/oliver-inventory-sync.test.mjs`.

## Etapas obrigatórias ANTES de liberar a sincronização

1. Obter aprovação de custos para branch de desenvolvimento Supabase e criá-la. Nunca usar produção para dados fictícios.
2. Aplicar a migração **apenas** nessa branch e conferir RLS, ausência de grants a `anon`/`authenticated` e o registro `id='main'`.
3. Configurar um segredo **somente no servidor**, `OLIVER_INVENTORY_ADMIN_CODE_SHA256`, com o SHA-256 do código administrativo da organização. Calcular e informar o hash diretamente em um ambiente seguro; não publicar a senha nem seu hash nos chats ou commits.
4. Se a branch usar um domínio de homologação, configurar nela `OLIVER_INVENTORY_ALLOWED_ORIGIN` com a origem HTTPS **exata** permitida. Configurar também `VITE_OLIVER_INVENTORY_TEST_URL=https://<ref-da-branch>.supabase.co` **somente nas variáveis Vercel Preview**. O frontend rejeita URLs de teste iguais à origem Supabase principal. A produção aceita apenas `https://cha-oliver-mvp.vercel.app` por padrão.
5. Implantar **somente** a nova função `oliver-inventory` na branch de teste; conferir status de `get`, `save`, 403 para código inválido e 409 para revisão obsoleta. O endpoint de gravação deve rejeitar Origem de Production na branch de teste.
6. Validar simultaneidade com dois navegadores: A salva revisão 1, B tenta salvar revisão 0 e recebe 409, sem sobrescrever A.
7. Testar importação local → compartilhado e repetição idempotente. **Nenhuma migração automática ou silenciosa** do armazenamento do navegador.
8. Somente com autorização expressa adicional para o banco principal, aplicar a migração em Production, configurar o segredo e implantar a função. Confirmar RLS e logs.
9. Após homologação da Preview e autorização da publicação do frontend, publicar o SHA exato via Vercel e restaurar o bloqueio de Production.

## Limites e comportamento de segurança
- Backend compartilhado consulta o inventário exclusivamente mediante código administrativo. A função usa credenciais privilegiadas **apenas no servidor**.
- A tabela não expõe políticas públicas de acesso. As gravações exigem revisão `expectedRevision` para impedir sobrescritas silenciosas.
- O histórico é derivado das diferenças dos registros aceitos pelo servidor, sem nomes de convidados, e guardado junto do estado.
- A interface nunca substitui automaticamente os registros locais por registros compartilhados quando há um rascunho existente; exige escolha e confirmação.
- Exportação para o Enxoval do Oliver contém estoque de fraldas por unidade e um identificador de origem, mas **não realiza importação direta**; o Enxoval tem armazenamento próprio e o importador nativo ainda não foi validado.
- O fechamento da estimativa em 30/11 **não bloqueia novos convidados** até 04/12 dentro da capacidade contabilizada; antigos convites não respondidos continuam sujeitos à regra existente de revisão/substituição.
