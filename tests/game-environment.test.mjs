import test from 'node:test';
import assert from 'node:assert/strict';
import {isOfficialGamesHost,isPreviewGamesHost,PREVIEW_GAMES_WARNING} from '../game-environment.mjs';

test('permite registros reais apenas no domínio oficial',()=>{
  assert.equal(isOfficialGamesHost('cha-oliver-mvp.vercel.app'),true);
  assert.equal(isOfficialGamesHost('CHA-OLIVER-MVP.VERCEL.APP'),true);
  for(const host of [
    'cha-oliver-mvp.vercel.app.evil.example',
    'cha-oliver-mvp-git-dev-supabase-gh-57f5.vercel.app',
    'cha-oliver-2j3zhjv35-gh-57f5.vercel.app',
    'localhost',
    '',
    'outro.vercel.app'
  ])assert.equal(isOfficialGamesHost(host),false,host);
});
test('classifica todos os links temporários como Preview',()=>{
  assert.equal(isPreviewGamesHost('cha-oliver-mvp.vercel.app'),false);
  assert.equal(isPreviewGamesHost('cha-oliver-preview.vercel.app'),true);
  assert.match(PREVIEW_GAMES_WARNING,/Laboratório dos Jogos/);
});
