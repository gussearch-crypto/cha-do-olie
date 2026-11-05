import test from 'node:test';
import assert from 'node:assert/strict';
import {postEventSummary,postEventCsv,postEventBackup,parsePostEventBackup,validatePostEventItem} from '../oliver-post-event-utils.mjs';

const rows=[
 {id:'diaper123',type:'fralda',description:'Pacote M 32',size:'M',brand:'Marca A',quantity:1,unitsPerPackage:32,unitValue:45.5,notes:''},
 {id:'diaper456',type:'fralda',description:'Pacote M 56',size:'M',brand:'Marca B',quantity:1,unitsPerPackage:56,unitValue:49.9,notes:''},
 {id:'diaper789',type:'fralda',description:'Pacote P 40',size:'P',brand:'Marca A',quantity:2,unitsPerPackage:40,unitValue:0,notes:''},
 {id:'gift12345',type:'presente',description:'Manta',quantity:2,unitValue:35.2}
];
test('um pacote M com 32 e outro com 56 são 2 pacotes e 88 fraldas M',()=>{
 const r=postEventSummary(rows);
 assert.equal(r.diaperPacks,4);
 assert.equal(r.diaperUnits,168);
 assert.equal(r.sizes.M,88);
 assert.equal(r.packsBySize.M,2);
 assert.equal(r.sizes.P,80);
 assert.equal(r.packsBySize.P,2);
 assert.equal(r.giftUnits,2);
 assert.equal(r.uncountedPacks,0);
 assert.equal(r.estimate,165.8);
});
test('três pacotes idênticos multiplicam a quantidade de fraldas por pacote',()=>{
 const r=postEventSummary([{...rows[0],quantity:3,unitsPerPackage:32}]);
 assert.equal(r.diaperPacks,3);
 assert.equal(r.diaperUnits,96);
 assert.equal(r.sizes.M,96);
});
test('valida quantidade de pacotes e fraldas por pacote no formulário',()=>{
 assert.throws(()=>validatePostEventItem({...rows[0],quantity:0}),/quantidade/);
 assert.throws(()=>validatePostEventItem({...rows[0],size:'invalido'}),/tamanho/);
 assert.throws(()=>validatePostEventItem({...rows[0],type:'convidado'}),/Categoria/);
 for(const units of [0,-1,1.5,1001,'abc']){
  assert.throws(()=>validatePostEventItem({...rows[0],unitsPerPackage:units}),/fraldas por pacote/);
 }
 assert.throws(()=>validatePostEventItem({...rows[0],unitsPerPackage:''},{requireDiaperUnits:true}),/quantidade de fraldas por pacote/);
 const gift=validatePostEventItem({...rows[3],unitsPerPackage:32});
 assert.equal(gift.unitsPerPackage,null);
 const safe=validatePostEventItem({...rows[0],family:'Família',sender:'Convidado'});
 assert.equal(safe.family,undefined);assert.equal(safe.sender,undefined);
});
test('registros antigos permanecem, mas fraldas por pacote desconhecidas não são inventadas',()=>{
 const old={id:'legacy123',type:'fralda',description:'Pacote P',size:'P',quantity:2,unitValue:20};
 const restored=parsePostEventBackup(JSON.stringify({format:'olie-inventario-v1',items:[old]}));
 assert.equal(restored[0].unitsPerPackage,null);
 const sum=postEventSummary([...restored,...rows]);
 assert.equal(sum.diaperPacks,6);
 assert.equal(sum.uncountedPacks,2);
 assert.equal(sum.sizes.P,80);
 assert.equal(sum.unknownPacksBySize.P,2);
 assert.equal(sum.diaperUnits,168);
 assert.equal(sum.estimate,205.8);
 const csv=postEventCsv(restored);
 assert.match(csv,/Fraldas por pacote/);
 assert.match(csv,/"2";"";""/); // quantidade antiga mantida, sem falsa totalização
});
test('CSV preserva pacotes, unidades por pacote, total e neutraliza fórmulas',()=>{
 const csv=postEventCsv([{...rows[0],description:'=HYPERLINK("x")',notes:'+1+1'},rows[1]]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.match(csv,/Quantidade de pacotes ou presentes/);
 assert.match(csv,/Fraldas por pacote/);
 assert.match(csv,/Total de fraldas/);
 assert.match(csv,/"1";"32";"32"/);
 assert.match(csv,/"1";"56";"56"/);
 assert.match(csv,/'=HYPERLINK/);
 assert.match(csv,/'\+1\+1/);
 assert.doesNotMatch(csv,/Remetente|Convidado|Núcleo/);
});
test('backup restaura quantidade de pacotes e fraldas por pacote',()=>{
 const data=postEventBackup(rows);
 assert.deepEqual(parsePostEventBackup(data),rows.map(x=>validatePostEventItem(x)));
 assert.throws(()=>parsePostEventBackup(JSON.stringify({format:'olie-inventario-v1',items:[rows[0],rows[0]]})),/duplicado/);
});
