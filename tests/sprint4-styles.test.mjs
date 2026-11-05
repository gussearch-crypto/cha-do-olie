import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('estilos críticos da Sprint 4 fazem parte do HTML principal para as rotas dinâmicas',()=>{
 const html=read('index.html');
 const waiting=read('oliver-waiting-hero.css');
 const inventory=read('oliver-post-event.css');
 for(const path of ['/oliver-waiting-hero.css','/oliver-post-event.css']){
  assert.ok(html.includes('<link rel="stylesheet" href="'+path+'" />'),path+' deve estar no HTML');
 }
 assert.match(waiting,/\.olieWaitingMain\{display:grid/);
 assert.match(waiting,/\.olieWaitingStats\{display:grid/);
 assert.match(waiting,/\.gamesPage\.gamesAfterPage \.gamesWrap/);
 assert.match(inventory,/\.oliePostInventory\{/);
});

test('jornada de resultados no painel é apresentada com cartões e botões responsivos',()=>{
 const jsx=read('admin-games.jsx');
 const css=read('games.css');
 assert.match(jsx,/className="olieGamesPhaseGuide"/);
 assert.match(css,/\.oliverGamesAdmin \.olieGamesPhaseGuide\{/);
 assert.match(css,/\.oliverGamesAdmin \.olieGamesPhaseGuide ol\{/);
 assert.match(css,/\.oliverGamesAdmin \.olieGamesPhaseLinks button/);
 assert.match(css,/@media\(max-width:620px\)/);
});
