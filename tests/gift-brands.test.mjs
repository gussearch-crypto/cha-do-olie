import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const brands=readFileSync(new URL('../gift-brands.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('a confirmação sugere quatro marcas de fraldas, sem tornar nenhuma obrigatória',()=>{
 assert.match(brands,/Marcas sugeridas: Huggies, Pampers, PomPom ou Turma da Mônica\./);
 assert.match(brands,/As marcas são apenas sugestões de padrão, não uma exigência/);
 assert.match(brands,/Fique à vontade para escolher outra marca de sua preferência/);
 assert.match(html,/import\('\/gift-brands\.js'\)/);
});

test('aviso das marcas aparece uma vez após os itens e possui estilo responsivo',()=>{
 assert.match(brands,/result\.querySelector\('\.diaperBrandsDisclaimer'\)/);
 assert.match(brands,/note\.previousElementSibling!==gifts\[gifts\.length-1\]/);
 assert.match(styles,/\.result \.diaperBrandsDisclaimer\{/);
 assert.match(styles,/font-size:12px/);
});

test('mimo não é obrigatório e aparece uma vez fora da lista de fraldas',()=>{
 const invite=readFileSync(new URL('../src.jsx',import.meta.url),'utf8');
 assert.match(invite,/um mimo complementar, totalmente opcional/);
 assert.match(invite,/Fralda sugerida; um mimo complementar é opcional/);
 assert.match(invite,/diapers\.slice\(0,gifts\)\.map/);
 assert.match(invite,/className="mimoComplementar"/);
 assert.match(invite,/className="optionalGiftLabel">OPCIONAL/);
 assert.match(invite,/Não é necessário trazer nada além da fralda sugerida/);
 assert.equal((invite.match(/className="mimoComplementar"/g)||[]).length,1);
 assert.doesNotMatch(invite,/<b>Presentinho para o Oliver<\/b>/);
 assert.doesNotMatch(brands,/if\(index===1/);
 assert.match(styles,/\.result \.mimoComplementar\{/);
});
