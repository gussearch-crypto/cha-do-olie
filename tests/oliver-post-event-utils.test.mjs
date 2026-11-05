import test from 'node:test';
import assert from 'node:assert/strict';
import {postEventSummary,postEventCsv,postEventBackup,parsePostEventBackup,validatePostEventItem} from '../oliver-post-event-utils.mjs';
const rows=[
 {id:'diaper123',type:'fralda',description:'Pacote fraldas',size:'M',brand:'Marca A',quantity:3,unitValue:45.5,notes:''},
 {id:'diaper456',type:'fralda',description:'Pacote fraldas',size:'P',quantity:2,unitValue:0},
 {id:'gift12345',type:'presente',description:'Manta',quantity:2,unitValue:35.2}
];
test('soma fraldas por tamanho, presentes e valores opcionais',()=>{
 const s=postEventSummary(rows);
 assert.equal(s.diaperPacks,5);assert.equal(s.giftUnits,2);assert.equal(s.sizes.M,3);
 assert.equal(s.sizes.P,2);assert.equal(s.estimate,206.9);
});
test('valida quantidades e tipos sem coletar nomes de convidados',()=>{
 assert.throws(()=>validatePostEventItem({...rows[0],quantity:0}),/quantidade/);
 assert.throws(()=>validatePostEventItem({...rows[0],size:'invalido'}),/tamanho/);
 assert.throws(()=>validatePostEventItem({...rows[0],type:'convidado'}),/Categoria/);
 const safe=validatePostEventItem({...rows[0],family:'João',sender:'Convidado'});
 assert.equal(safe.family,undefined);assert.equal(safe.sender,undefined);
});
test('CSV neutraliza fórmulas e oferece colunas para importar no Enxoval',()=>{
 const text=postEventCsv([{...rows[2],description:'=HYPERLINK("x")',notes:'+1+1'}]);
 assert.ok(text.startsWith('\uFEFF'));
 assert.match(text,/'=HYPERLINK/);
 assert.match(text,/'\+1\+1/);
 assert.match(text,/Quantidade/);
 assert.doesNotMatch(text,/Remetente|Convidado|Núcleo/);
});
test('backup JSON restaura registros válidos com IDs únicos',()=>{
 const snapshot=postEventBackup(rows);
 assert.deepEqual(parsePostEventBackup(snapshot),rows.map(validatePostEventItem));
 assert.throws(()=>parsePostEventBackup(JSON.stringify({format:'olie-inventario-v1',items:[rows[0],rows[0]]})),/duplicado/);
});
