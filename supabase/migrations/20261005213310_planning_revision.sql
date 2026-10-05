-- One row stores the planning snapshot. Its revision allows atomic optimistic writes.
alter table public.event_planning_state
  add column if not exists revision bigint not null default 0;
