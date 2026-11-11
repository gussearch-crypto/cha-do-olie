import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 countsAsGuest,isRealFamily,projectedFamilyCapacity,
 familyAttendanceStatus,expectedGiftSlots,plannedDiaperChanges
} from '../supabase/functions/_shared/guest-attendance-rules.mjs';

const adult=(attendance='pending')=>({attendance,person_type:'adult',child_age_group:null});
const kid=(attendance='pending',age='under_5')=>({attendance,person_type:'child',child_age_group:age});
const family=(group_name='Amigos',is_test=false)=>({group_name,is_test});
const live=(g,f=family())=>({...g,families:f});

test('contagem: adultos e maiores de 5 ocupam vaga; menores de 5 não',()=>{
 assert.equal(countsAsGuest(adult('yes')),true);
 assert.equal(countsAsGuest(adult('pending')),false);
 assert.equal(countsAsGuest(kid('yes','under_5')),false);
 assert.equal(countsAsGuest(kid('yes','five_or_more')),true);
});
test('um núcleo com duas confirmações e uma criança menor de 5 acrescenta só duas vagas',()=>{
 const before=[adult('pending'),adult('pending'),kid('pending','under_5')];
 const after=[adult('yes'),adult('yes'),kid('yes','under_5')];
 const all=[...Array.from({length:98},()=>live(adult('yes'))),...before.map(g=>live(g))];
 const v=projectedFamilyCapacity({before,after,all,oldFamily:family(),newFamily:family(),capacity:100});
 assert.deepEqual([v.currentGlobal,v.projectedGlobal,v.available,v.allowed],[98,100,2,true]);
});
test('limite 100 impede nova confirmação, mas permite troca um por um e reversões',()=>{
 const others=Array.from({length:100},()=>live(adult('yes')));
 const unchanged=projectedFamilyCapacity({
  before:[adult('pending')],after:[adult('yes')],all:others,
  oldFamily:family(),newFamily:family(),capacity:100
 });
 assert.equal(unchanged.allowed,false);
 const replace=projectedFamilyCapacity({
  before:[adult('yes'),adult('pending')],after:[adult('no'),adult('yes')],
  all:[...others.slice(1),live(adult('yes'))],
  oldFamily:family(),newFamily:family(),capacity:100
 });
 assert.equal(replace.projectedGlobal,100);
 assert.equal(replace.allowed,true);
 const reversal=projectedFamilyCapacity({
  before:[adult('yes')],after:[adult('pending')],all:others,
  oldFamily:family(),newFamily:family(),capacity:100
 });
 assert.equal(reversal.projectedGlobal,99);
 assert.equal(reversal.allowed,true);
});
test('quando um confirmado muda de menor de 5 para 5+ requer vaga',()=>{
 const before=[kid('yes','under_5')],after=[kid('yes','five_or_more')];
 const all=[...Array.from({length:100},()=>live(adult('yes'))),live(before[0])];
 const v=projectedFamilyCapacity({before,after,all,oldFamily:family(),newFamily:family(),capacity:100});
 assert.equal(v.projectedGlobal,101);
 assert.equal(v.allowed,false);
});
test('núcleos teste não ocupam vagas mas passam a ocupar se deixarem de ser teste',()=>{
 assert.equal(isRealFamily(family('teste')),false);
 assert.equal(isRealFamily(family('Amigos',true)),false);
 assert.equal(isRealFamily(family('Amigos')),true);
 const g=adult('yes'),all=Array.from({length:100},()=>live(adult('yes')));
 const result=projectedFamilyCapacity({before:[g],after:[g],all,
  oldFamily:family('Teste'),newFamily:family('Convidados'),capacity:100});
 assert.equal(result.allowed,false);
 assert.equal(result.projectedGlobal,101);
});
test('status agregado cobre confirmação, ausência, reversão e parcial',()=>{
 assert.equal(familyAttendanceStatus([adult('yes'),kid('yes')]),'confirmed');
 assert.equal(familyAttendanceStatus([adult('no'),kid('no')]),'declined');
 assert.equal(familyAttendanceStatus([adult('pending'),kid('pending')]),'waiting');
 assert.equal(familyAttendanceStatus([adult('yes'),kid('no')]),'partial');
 assert.equal(familyAttendanceStatus([adult('yes'),kid('pending')]),'partial');
 assert.equal(familyAttendanceStatus([adult('no'),kid('pending')]),'partial');
 assert.throws(()=>familyAttendanceStatus([]),/empty_family/);
});
test('sugestões de fraldas respeitam modalidade, sem vincular entregas aos convidados',()=>{
 const guests=[adult('yes'),adult('yes'),kid('yes','under_5'),adult('no')];
 assert.equal(expectedGiftSlots('per_adult',guests),2);
 assert.equal(expectedGiftSlots('family',guests),1);
 assert.equal(expectedGiftSlots('unknown',guests),null);
 assert.equal(expectedGiftSlots('family',[adult('pending')]),0);
 assert.equal(expectedGiftSlots('per_adult',[adult('no')]),0);
 assert.equal(expectedGiftSlots('unknown',[adult('pending')]),0);
});
test('rebaixamento de previsão nunca exclui fraldas recebidas ou atribuídas fora do planejamento',()=>{
 const assignments=[
  {id:'a',slot_number:1,source:'planned',received_at:null},
  {id:'b',slot_number:2,source:'planned',received_at:'2026-11-09T12:00:00Z'},
  {id:'c',slot_number:3,source:'external',received_at:null},
  {id:'d',slot_number:4,source:'planned',received_at:null}
 ];
 const plan=plannedDiaperChanges(assignments,1);
 assert.deepEqual(plan.removeIds,['d','a']);
 assert.deepEqual(plan.newSlots,[]);
 assert.equal(plan.retained,2,'registros históricos não são apagados para atingir a meta');
 assert.deepEqual(assignments.map(a=>a.id),['a','b','c','d'],'o planejador não altera a entrada');
});
test('nova atribuição usa próximo número livre após a maior existente',()=>{
 const assignments=[
  {id:'z',slot_number:1,source:'planned',received_at:null},
  {id:'y',slot_number:5,source:'planned',received_at:null}
 ];
 const p=plannedDiaperChanges(assignments,4);
 assert.deepEqual(p.newSlots,[6,7]);
 assert.deepEqual(p.removeIds,[]);
});
test('a Edge Function realmente utiliza as funções puras testadas',()=>{
 const source=readFileSync(new URL('../supabase/functions/invite-api/index.ts',import.meta.url),'utf8');
 assert.match(source,/from "\.\.\/_shared\/guest-attendance-rules\.mjs"/);
 assert.match(source,/projectedFamilyCapacity\(\{/);
 assert.match(source,/familyAttendanceStatus\(current\)/);
 assert.match(source,/expectedGiftSlots\(family\.gift_mode,current\)/);
 assert.match(source,/plannedDiaperChanges\(assigned\|\|\[\],expected\)/);
 assert.match(source,/\.eq\("source","planned"\)\.is\("received_at",null\)/);
 assert.match(source,/update_guest_attendance_with_source/);
 assert.match(source,/p_source:"administrador"/);
});
