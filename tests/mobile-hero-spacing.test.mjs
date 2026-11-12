import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('convite mobile aproxima a arte dos mascotes sem afetar desktop',()=>{
 const css=read('mobile-hero-fix.css');
 const app=read('mobile-ui.js');
 const html=read('index.html');
 assert.match(css,/@media\s*\(max-width:\s*760px\)/);
 assert.match(css,/\.heroMobileArt\s*\{[\s\S]*?margin:\s*clamp\(-168px,\s*-30vw,\s*-85px\)\s+auto\s+0\s*!important/);
 assert.match(css,/\.heroMobileArt\s*\{[\s\S]*?object-fit:\s*contain\s*!important/);
 assert.match(css,/\.heroMobileArt\s*\{[\s\S]*?height:\s*auto\s*!important/);
 assert.match(css,/@media\s*\(min-width:\s*761px\)\s*\{[\s\S]*?\.heroMobileArt\s*\{\s*display:\s*none\s*!important/);
 assert.match(app,/img\.src='\/images\/banner-oliver-mobile\.png'/);
 assert.match(html,/href="\/mobile-hero-fix\.css"/);
});
test('ajuste responsivo sobe a arte em celulares estreitos e largos',()=>{
 const offset=width=>Math.max(-168,Math.min(-width*.30,-85));
 for(const width of [320,375,390,430,536,760]){
  const value=offset(width);
  assert.ok(value < 0, 'deslocamento negativo em '+width);
  assert.ok(value>=-168 && value<=-85,'limites de deslocamento em '+width);
 }
 assert.ok(offset(536)<offset(375),'arte acompanha a largura de tela');
});
