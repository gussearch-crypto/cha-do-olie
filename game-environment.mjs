/**
 * Esta aplicação utiliza o mesmo projeto Supabase em Preview e Production.
 * Evita salvar palpites reais quando alguém testa um endereço temporário.
 */
export const OFFICIAL_GAMES_HOST = 'cha-oliver-mvp.vercel.app';

export function isOfficialGamesHost(hostname){
  return String(hostname||'').trim().toLowerCase()===OFFICIAL_GAMES_HOST;
}

export function isPreviewGamesHost(hostname){
  return !isOfficialGamesHost(hostname);
}

export const PREVIEW_GAMES_WARNING='Ambiente de teste: o envio de palpites reais está desativado nesta versão. Para testar os registros e resultados, use o Laboratório dos Jogos no painel.';
