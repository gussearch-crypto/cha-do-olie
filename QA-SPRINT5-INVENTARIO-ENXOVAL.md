# Sprint 5 simplificada — Reta final do Chá do Oliver

**Decisão de escopo:** até 04/12/2026, entregar apenas funcionalidades estáveis e sem novo ambiente de banco. A sincronização entre dispositivos, APIs adicionais e integração automática com o Enxoval do Oliver ficam para discussão **após o chá**.

## O que entra na homologação atual

### Inventário sem servidor novo
- [ ] Aba Fraldas do painel: registro de fraldas e presentes sem relação com nomes de convidados.
- [ ] Os dados continuam no `localStorage` sob a **mesma chave da Sprint 4** (`oliver-post-event-local-draft-v1`). Itens antigos não devem desaparecer após esta atualização.
- [ ] É possível cadastrar, editar, excluir, baixar backup JSON e restaurar backup em outro navegador.
- [ ] Há aviso claro de que o inventário está salvo somente no navegador atual. **Recomendação:** exportar backup após cada sessão de lançamentos.
- [ ] Não aparecem botões de compartilhamento, mesclagem com servidor, revisão do Supabase ou sincronização.
- [ ] Preview e Production não enviam nenhum dado de inventário ao Supabase. Apenas a leitura do Financeiro continua utilizando o serviço atual.

### Fraldas por pacote e por unidade
- [ ] 1 pacote M com 32 + 1 pacote M com 56 = **2 pacotes M / 88 fraldas M**.
- [ ] 2 pacotes P com 40 unidades = **2 pacotes P / 80 fraldas P**.
- [ ] Total de pacotes e total de fraldas são indicadores distintos; RN, P, M, G, GG e XG têm seus próprios valores.
- [ ] Registros antigos sem quantidades internas permanecem preservados e sinalizados para completar sem inventar unidades.
- [ ] Exportar inventário completo em CSV e backup de todos os registros em JSON.

### Transferência manual para o Enxoval do Oliver
- [ ] Exportar CSV por tamanho e unidades reais.
- [ ] Exportar JSON de transferência com IDs de origem e sinalização de registros incompletos.
- [ ] Nenhuma exportação atualiza automaticamente o aplicativo Enxoval; os arquivos servem para conferência e futura importação planejada.
- [ ] Nenhum arquivo inclui quem trouxe ou deixou de trazer presentes.

### Financeiro e convidados
- [ ] Balanço mostra **valor contratado**, **já pago**, **saldo a quitar** e **valor estimado dos itens recebidos**, sem confundir valor financeiro com lucro.
- [ ] A Central de Preparação oferece exportação de base agregada de produção, com data **real** da captura.
- [ ] 30/11 é **referência para a estimativa de produção e custos**, sem fechamento automático da lista.
- [ ] Novos convites e confirmações seguem até **04/12**, respeitando a capacidade de 100 adultos e crianças de cinco anos ou mais. Crianças menores de cinco anos não ocupam vaga.
- [ ] Pendências antigas podem ser revisadas; nenhum convidado é excluído automaticamente.

## Regras de segurança da entrega
- [ ] Nenhuma branch/projeto Supabase de testes foi criado.
- [ ] Nenhuma migração ou Edge Function de inventário foi aplicada ou implantada.
- [ ] A preparação técnica anterior para sincronização permanece documentada no repositório e **fora da interface**, reservada para expansão futura.
- [ ] `npm test` e `npm run build` passam no mesmo commit.
- [ ] Vercel Preview do commit final está READY e é homologada antes de pedir publicação manual em Production.
- [ ] Production continua na Sprint 4 até autorização explícita para publicar um SHA exato.

## Pós-chá — backlog, não aprovado para execução agora
1. Avaliar se vale a pena sincronizar os inventários entre aparelhos.
2. Estudar um fluxo de importação real no Enxoval do Oliver com prevenção de duplicidade.
3. Se necessário, revisar arquitetura, custo do Supabase, permissões e plano de teste antes de migrar dados.
4. Priorizar a continuidade dos registros e a recuperação de backups existentes.
