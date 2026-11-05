-- Sprint 5: inventário compartilhado, sem relação com famílias e convidados.
-- Preparado em Git, NÃO aplicado ao Supabase principal durante a homologação.
create table if not exists public.oliver_inventory_state (
  id text primary key check (id = 'main'),
  data jsonb not null default '{"items":[],"history":[]}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint oliver_inventory_data_object check (jsonb_typeof(data) = 'object')
);

alter table public.oliver_inventory_state enable row level security;
revoke all on public.oliver_inventory_state from anon, authenticated;
-- Somente Edge Functions com credencial administrativa do servidor consultam esta tabela.
-- Não criar políticas públicas de leitura ou escrita.
insert into public.oliver_inventory_state(id,data,revision)
values ('main','{"items":[],"history":[]}'::jsonb,0)
on conflict (id) do nothing;

comment on table public.oliver_inventory_state is
  'Inventário pós-Chá do Oliver. Sem nome de convidado ou vínculo com RSVP; API administrativa com revisão otimista.';
