import test from 'node:test';
import assert from 'node:assert/strict';
import {eventToday,daysUntil,matchesPeriod,deadline,installmentBalance,expenseTotals,planningSnapshot} from '../planning-utils.mjs';
const today='2026-10-05';
test('event day changes at midnight in São Paulo, including when UTC is already tomorrow',()=>{
  assert.equal(eventToday(new Date('2026-10-06T02:59:59Z')),today);
  assert.equal(eventToday(new Date('2026-10-06T03:00:00Z')),'2026-10-06');
});
test('period boundaries include today and day 7, exclude overdue and day 8',()=>{
  assert.equal(matchesPeriod('2026-10-05','today',today),true);
  assert.equal(matchesPeriod('2026-10-12','next7',today),true);
  assert.equal(matchesPeriod('2026-10-13','next7',today),false);
  assert.equal(matchesPeriod('2026-10-04','next7',today),false);
  assert.equal(matchesPeriod('2026-11-04','next30',today),true);
  assert.equal(matchesPeriod('2026-11-05','next30',today),false);
  assert.equal(matchesPeriod('','undated',today),true);
  assert.equal(matchesPeriod('','overdue',today),false);
  assert.equal(daysUntil('2026-02-30',today),null);
});
test('urgency has clear boundaries',()=>{
  assert.equal(deadline('2026-10-04',today).tone,'overdue');
  assert.equal(deadline(today,today).label,'Vence hoje');
  assert.equal(deadline('2026-10-12',today).tone,'soon');
  assert.equal(deadline('2026-10-13',today).tone,'near');
  assert.equal(deadline('2026-10-20',today).tone,'near');
  assert.equal(deadline('2026-10-21',today).tone,'neutral');
  assert.equal(deadline('',today).label,'Sem prazo');
});
test('alerts count only pending actions and remaining installment balances',()=>{
  const expense={id:'dec',description:'Decoração',installments:[
    {id:'paid',amount:500,paidAmount:500,due:'2026-10-01'},
    {id:'partial',amount:650,paidAmount:200,due:'2026-10-04'},
    {id:'soon',amount:650,paidAmount:0,due:'2026-10-12'},
    {id:'later',amount:300,paidAmount:0,due:'2026-10-13'},
    {id:'undated',amount:100,paidAmount:0,due:''}
  ]};
  const data={tasks:[{id:'done',status:'done',due:'2026-10-01',title:'Feito'},{id:'late',status:'todo',due:'2026-10-04',title:'Ação atrasada'},{id:'today',status:'todo',due:today,title:'Ação hoje'},{id:'none',status:'todo',due:'',title:'Sem data'}],expenses:[expense]};
  const s=planningSnapshot(data,today);
  assert.equal(s.overdueTasks,1);assert.equal(s.soonTasks,1);
  assert.equal(s.overduePayments,1);assert.equal(s.overdueValue,450);
  assert.equal(s.soonPayments,1);assert.equal(s.soonValue,650);
  assert.equal(s.planned,2200);assert.equal(s.paid,700);assert.equal(s.open,1500);
  assert.equal(expenseTotals(expense,today).state,'overdue');
});
test('overpayment on one installment cannot erase another installment debt',()=>{
  assert.equal(installmentBalance({amount:.3,paidAmount:.1}),.2);
  const e={installments:[{amount:100,paidAmount:200},{amount:100,paidAmount:0}]};
  assert.equal(expenseTotals(e,today).balance,100);
  assert.equal(planningSnapshot({tasks:[],expenses:[e]},today).open,100);
});

test('services become settled only after the full contracted value is paid',()=>{
  const full={installments:[{amount:1000,paidAmount:1000,due:'2026-10-01'}]};
  assert.equal(expenseTotals(full,today).state,'paid');
  const split={installments:[{amount:500,paidAmount:500},{amount:500,paidAmount:100}]};
  assert.equal(expenseTotals(split,today).state,'partial');
  assert.equal(expenseTotals(split,today).balance,400);
  split.installments[1].paidAmount=500;
  assert.equal(expenseTotals(split,today).state,'paid');
  split.installments[1].paidAmount=499.99;
  assert.notEqual(expenseTotals(split,today).state,'paid');
  assert.equal(expenseTotals(split,today).balance,.01);
  assert.equal(expenseTotals({installments:[]},today).state,'open');
});
