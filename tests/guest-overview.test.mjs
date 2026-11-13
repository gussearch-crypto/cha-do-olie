import test from 'node:test';
import assert from 'node:assert/strict';
import {guestOverview,guestFamilyStatus} from '../guest-filters.mjs';

const family=(id,guests,other={})=>({id,display_name:'Núcleo '+id,group_name:'Família',guests,...other});
const guest=(attendance,person_type='adult',child_age_group=null)=>({attendance,person_type,child_age_group});

test('a capacidade considera apenas confirmados com 5 anos ou mais',()=>{
 const families=[
  family(1,[guest('yes'),guest('yes','child','under_5')]),
  family(2,[guest('yes','child','five_or_more'),guest('pending')]),
  family(3,[guest('no')])
 ];
 const x=guestOverview(families,100);
 assert.equal(x.people,5);
 assert.equal(x.confirmed,3);
 assert.equal(x.counted,2);
 assert.equal(x.confirmedUnderFive,1);
 assert.equal(x.available,98);
 assert.equal(x.pending,1);
 assert.equal(x.declined,1);
 assert.equal(x.olderChildren,1);
 assert.deepEqual(x.states,{confirmed:1,pending:0,partial:1,declined:1});
});

test('núcleos de teste não alteram os indicadores de organização',()=>{
 const families=[
  family(1,[guest('yes')]),
  family(2,[guest('yes')],{group_name:'TESTE'}),
  family(3,[guest('yes')],{is_test:true})
 ];
 const x=guestOverview(families);
 assert.equal(x.families,1);
 assert.equal(x.confirmed,1);
 assert.equal(x.available,99);
});

test('crianças confirmadas sem faixa etária geram alerta e são contabilizadas provisoriamente',()=>{
 const x=guestOverview([family(1,[guest('yes','child',null),guest('yes','child','under_5')])]);
 assert.equal(x.unknownChildAge,1);
 assert.equal(x.counted,1);
 assert.equal(x.confirmedUnderFive,1);
 assert.equal(x.available,99);
});

test('mais de cem confirmações nunca produzem vagas negativas',()=>{
 const people=Array.from({length:103},()=>guest('yes'));
 const x=guestOverview([family(1,people)]);
 assert.equal(x.counted,103);
 assert.equal(x.available,0);
 assert.equal(x.overCapacity,3);
});

test('a contagem separa pessoas pendentes de núcleos parciais',()=>{
 const families=[family(1,[guest('yes'),guest('pending')]),family(2,[guest('pending')]),family(3,[guest('no'),guest('yes')])];
 const x=guestOverview(families);
 assert.equal(x.pending,2);
 assert.equal(x.states.partial,2);
 assert.equal(x.states.pending,1);
 assert.deepEqual(families.map(guestFamilyStatus),['partial','pending','partial']);
});

test('não altera os registros recebidos nem exige acesso ao Supabase',()=>{
 const families=[family(1,[guest('yes'),guest('pending','child','under_5')])];
 const before=JSON.stringify(families);
 const x=guestOverview(families);
 assert.equal(JSON.stringify(families),before);
 assert.equal(x.confirmed,1);
});
