import test from 'node:test';
import assert from 'node:assert/strict';
import {eventRsvpReadiness,eventScheduleReadiness,eventFinanceReadiness,eventPriorityReadiness,RSVP_DEADLINE,EVENT_DATE} from '../admin-final-readiness.mjs';

const families=[
 {id:'f1',guests:[{attendance:'yes',person_type:'adult'},{attendance:'yes',person_type:'child',child_age_group:'under_5'},{attendance:'pending',person_type:'adult'}]},
 {id:'f2',guests:[{attendance:'yes',person_type:'child',child_age_group:'five_or_more'},{attendance:'no',person_type:'adult'}]},
 {id:'f3',is_test:true,guests:[{attendance:'yes',person_type:'adult'}]},
 {id:'f4',group_name:'Teste',guests:[{attendance:'yes',person_type:'adult'}]},
];
test('contabiliza adultos e crianças 5+; não inclui menores de 5 nem núcleos de teste',()=>{
 const r=eventRsvpReadiness(families,'2026-11-05');
 assert.equal(r.counted,2);
 assert.equal(r.confirmed,3);
 assert.equal(r.confirmedUnderFive,1);
 assert.equal(r.available,98);
 assert.equal(r.waiting,1);
 assert.equal(r.pendingEligible,1);
 assert.equal(r.possibleCount,3);
 assert.equal(r.declined,1);
 assert.equal(r.families,2);
 assert.equal(r.waitingFamilies,1);
});
test('30/11 inteiro é prazo válido em São Paulo; 01/12 alerta sem excluir ninguém',()=>{
 assert.equal(RSVP_DEADLINE,'2026-11-30');
 const before=eventRsvpReadiness(families,'2026-11-30');
 const after=eventRsvpReadiness(families,'2026-12-01');
 assert.equal(before.afterDeadline,false);
 assert.equal(before.substitutionCandidates,0);
 assert.equal(after.afterDeadline,true);
 assert.equal(after.substitutionCandidates,1);
 assert.equal(after.available,98); // vagas continuam disponíveis depois de 30/11
 assert.equal(after.waiting,1); // não se altera presença automaticamente
});
test('identifica classificação infantil incompleta sem presumir menor de 5',()=>{
 const r=eventRsvpReadiness([{id:'x',guests:[{attendance:'yes',person_type:'child'}]}],'2026-11-06');
 assert.equal(r.unknownAges,1);
 assert.equal(r.counted,1);
});
test('cronograma real de 04/12 ordena por horários, separa montagem e evento e alerta conflitos',()=>{
 assert.equal(EVENT_DATE,'2026-12-04');
 const data={tasks:[
  {id:'a',title:'Receber alimentos',eventDate:EVENT_DATE,eventTime:'16:00',eventEnd:'17:00',responsible:'Vanessa'},
  {id:'b',title:'Montar mesa',eventDate:EVENT_DATE,eventTime:'16:30',eventEnd:'17:30',responsible:'vanessa'},
  {id:'c',title:'Brincadeiras',eventDate:EVENT_DATE,eventTime:'19:00',status:'todo',responsible:'',subtasks:[{title:'Premiação',done:false}]},
  {id:'d',title:'Encerrar',eventDate:EVENT_DATE,eventTime:'22:10',responsible:'Gustavo'},
  {id:'e',title:'Outro dia',eventDate:'2026-12-03',eventTime:'17:00'},
  {id:'f',title:'Sem horário',eventDate:EVENT_DATE}
 ]};
 const r=eventScheduleReadiness(data);
 assert.equal(r.scheduled,4);
 assert.deepEqual(r.entries.map(x=>x.id),['a','b','c','d']);
 assert.deepEqual(r.entries.map(x=>x.phase),['before','before','during','after']);
 assert.equal(r.conflicts.length,1);
 assert.equal(r.missingOwners,1);
 assert.equal(r.entries.find(x=>x.id==='c').pendingSteps,1);
});
test('cronograma sem tarefas nunca inventa atividades realizadas',()=>{
 assert.equal(eventScheduleReadiness({tasks:[]}).scheduled,0);
});
test('financeiro contabiliza saldo pago, atrasado e sem vencimento sem inventar data',()=>{
 const data={tasks:[],expenses:[
  {id:'e1',description:'Decoração',contracted:300,installments:[{id:'p1',amount:200,paidAmount:100,due:'2026-11-04'},{id:'p2',amount:100,paidAmount:0,due:'2026-11-09'}]},
  {id:'e2',description:'Lembrança',contracted:70,installments:[]}
 ]};
 const r=eventFinanceReadiness(data,'2026-11-05');
 assert.equal(r.open,270);
 assert.equal(r.overdueValue,100);
 assert.equal(r.dated.length,2);
 assert.equal(r.unallocated,70);
 assert.equal(r.unplannedBalance,70);
});
test('prioridades alertam vencidos e ausência de responsável, sem modificar fontes',()=>{
 const data={tasks:[{id:'a',title:'Decoração',due:'2026-11-01',status:'todo',eventDate:EVENT_DATE,eventTime:'15:00',responsible:''}],expenses:[]};
 const prev=structuredClone(data),rsvp=eventRsvpReadiness(families,'2026-12-01');
 const rows=eventPriorityReadiness(data,rsvp,'2026-12-01');
 assert.equal(rows.some(x=>x.label==='Decoração'&&x.priority===0),true);
 assert.equal(rows.some(x=>x.label.includes('Responsáveis')),true);
 assert.equal(rows.some(x=>x.type==='guests'&&x.detail.includes('Estimativa de produção de 30/11 fechada')),true);
 assert.deepEqual(data,prev);
});

test('reúne orçado, contratado e negociações sem duplicar despesas',()=>{
 const data={
  tasks:[],shopping:[{id:'s1',status:'pending'},{id:'s2',status:'bought'}],
  expenses:[{id:'e1',description:'Buffet',category:'Alimentação',contracted:300,installments:[{id:'p',amount:300,paidAmount:0,due:'2026-11-25'}]}],
  budgets:{Alimentação:450,__goal:650},
  quotes:[{id:'q1',category:'Decoração',proposals:[{amount:100}]}]
 };
 const finance=eventFinanceReadiness(data,'2026-11-05');
 assert.equal(finance.budgeted,450);
 assert.equal(finance.planned,300);
 assert.equal(finance.goal,650);
 assert.equal(finance.projected,400);
 assert.equal(finance.goalVariance,250);
 const alerts=eventPriorityReadiness(data,{},'2026-11-05');
 assert.equal(alerts.some(x=>x.label.includes('Cotações ainda em negociação')),true);
 assert.equal(alerts.some(x=>x.label.includes('Compras a realizar')),true);
});

test('30/11 é apenas a referência para produção; vagas seguem abertas até 04/12',()=>{
 const before=eventRsvpReadiness(families,'2026-11-30');
 const after=eventRsvpReadiness(families,'2026-12-01');
 const event=eventRsvpReadiness(families,'2026-12-04');
 const later=eventRsvpReadiness(families,'2026-12-05');
 assert.equal(before.productionEstimateClosed,false);
 assert.equal(after.productionEstimateClosed,true);
 assert.equal(after.inviteWindowOpen,true);
 assert.equal(after.canAddGuests,true);
 assert.equal(event.inviteWindowOpen,true);
 assert.equal(event.available,98);
 assert.equal(later.inviteWindowOpen,false);
 assert.equal(later.canAddGuests,false);
 assert.equal(after.waiting,1);
 assert.equal(after.substitutionCandidates,1);
});
