-- Chá do Oliver · Correção focalizada da premiação dos palpites.
-- Executar antes de publicar a atualização oliver-games.
-- Aditivo: não altera palpites, convidados, dados oficiais nem resultados publicados.
-- Valor inicial oficial: um vencedor por maior pontuação geral.
alter table public.oliver_game_settings
  add column if not exists winner_count integer not null default 1,
  add column if not exists winner_rule text not null default 'overall_score';

alter table public.oliver_game_settings
  drop constraint if exists oliver_game_settings_winner_count_check;
alter table public.oliver_game_settings
  add constraint oliver_game_settings_winner_count_check
  check (winner_count between 1 and 3);

alter table public.oliver_game_settings
  drop constraint if exists oliver_game_settings_winner_rule_check;
alter table public.oliver_game_settings
  add constraint oliver_game_settings_winner_rule_check
  check (winner_rule in ('overall_score','closest_datetime','closest_weight','closest_length'));

comment on column public.oliver_game_settings.winner_count is
  'Quantidade de vencedores configurada no painel (1 por padrão, até 3).';
comment on column public.oliver_game_settings.winner_rule is
  'Critério de classificação dos vencedores: pontuação geral (padrão) ou proximidade por parâmetro.';
