import test from 'node:test';
import assert from 'node:assert/strict';
import {productionReference,productionReferenceCsv} from '../oliver-production-reference.mjs';

const families=[
 {id:'a',guests:[{attendance:'yes',person_type:'adult'},
   {attendance:'yes',person_type:'child',child_age_group:'under_5'},
   {attendance:'yes',person_type:'child',child_age_group:'five_or_more'}]},
 {id:'b',guests:[{attendance:'pending',person_type:'adult'}]},
 {id:'test',is_test:true,guests:[{attendance:'yes',person_type:'adult'}]}
];
test('base de produção de 30/11 não exclui crianças pequenas do registro, mas não as conta nas 100 vagas',()=>{
 const ref=productionReference(families,{expenses:[]},'2026-11-30');
 assert.equal(ref.captureDate,'2026-11-30');
 assert.equal(ref.isExactReferenceDay,true);
 assert.equal(ref.confirmedCounted,2);
 assert.equal(ref.adults,1);
 assert.equal(ref.childrenFivePlus,1);
 assert.equal(ref.childrenUnderFive,1);
 assert.equal(ref.waiting,1);
 assert.equal(ref.available,98);
});
test('exportação posterior não finge reconstruir fotografia do dia 30/11',()=>{
 const r=productionReference(families,{expenses:[]},'2026-12-03');
 assert.equal(r.isExactReferenceDay,false);
 assert.equal(r.isRetrospective,true);
 assert.equal(r.captureDate,'2026-12-03');
 assert.equal(r.available,98);
 const csv=productionReferenceCsv(r);
 assert.match(csv,/Capturado em/);
 assert.match(csv,/2026-12-03/);
 assert.match(csv,/Crianças menores de 5/);
 assert.doesNotMatch(csv,/nome|telefone|convidado individual/i);
});
