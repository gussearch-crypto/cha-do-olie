import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../games.jsx',import.meta.url),'utf8');
test('as dependências do App não ficam escondidas em comentários de linha',()=>{
 const first=source.split(/\r?\n/,1)[0];
 assert.doesNotMatch(first,/\/\/\s*Estilos/,'comentários devem usar uma linha independente');
 const importMatch=source.match(/^import\s*\{\s*isPreviewGamesHost\s*,\s*PREVIEW_GAMES_WARNING\s*\}\s*from\s*['"]\.\/game-environment\.mjs['"]\s*;/m);
 assert.ok(importMatch,'isPreviewGamesHost precisa estar importado em linha real, fora de comentário');
 assert.match(source,/const previewOnly=isPreviewGamesHost\(window\.location\.hostname\)/);
});
test('falhas de renderização mostram mensagem em vez de página vazia',()=>{
 assert.match(source,/class GamesPageErrorBoundary extends React\.Component/);
 assert.match(source,/<GamesPageErrorBoundary><App\/><\/GamesPageErrorBoundary>/);
 assert.match(source,/Não foi possível abrir esta página/);
});
