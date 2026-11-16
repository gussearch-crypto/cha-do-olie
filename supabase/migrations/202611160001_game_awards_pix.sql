-- Chá do Oliver · Configuração de premiação e PIX dos jogos online.
-- Migração aditiva: mantém os registros de palpites, convidados e presentes.
-- Aplicar somente após aprovação da Preview e coordenação com deploy de oliver-games.
alter table public.oliver_game_settings
  add column if not exists winner_count integer not null default 1,
  add column if not exists winner_rule text not null default 'overall_score',
  add column if not exists remote_pix_enabled boolean not null default false,
  add column if not exists remote_pix_payload text not null default '',
  add column if not exists remote_pix_receiver_name text not null default '',
  add column if not exists remote_pix_institution text not null default '';

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

alter table public.oliver_game_settings
  drop constraint if exists oliver_game_settings_remote_pix_payload_check;
alter table public.oliver_game_settings
  add constraint oliver_game_settings_remote_pix_payload_check
  check (char_length(remote_pix_payload) <= 1500);

comment on column public.oliver_game_settings.remote_pix_payload is
  'Código PIX Copia e Cola gerado no banco; nunca registrar chave privada, senha ou credenciais.';

-- Rótulos públicos digitados no painel administrativo, não inferidos pelo QR Code.
-- Exibidos para conferência; o aplicativo bancário é a fonte final.
alter table public.oliver_game_settings
  drop constraint if exists oliver_game_settings_pix_receiver_name_check;
alter table public.oliver_game_settings
  add constraint oliver_game_settings_pix_receiver_name_check
  check (char_length(remote_pix_receiver_name) <= 120);

alter table public.oliver_game_settings
  drop constraint if exists oliver_game_settings_pix_institution_check;
alter table public.oliver_game_settings
  add constraint oliver_game_settings_pix_institution_check
  check (char_length(remote_pix_institution) <= 80);
