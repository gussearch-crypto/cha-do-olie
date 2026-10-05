import test from 'node:test';
import assert from 'node:assert/strict';
import {eventToday,daysUntil,matchesPeriod,deadline,installmentBalance,expenseTotals,planningSnapshot,recordExpensePayment,paymentHistory,reviseExpensePayment} from '../planning-utils.mjs';
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

test('contracted total includes amounts not yet scheduled and keeps legacy totals',()=>{
  const e={contracted:1800,installments:[{id:'sinal',amount:500,paidAmount:500}]};
  const t=expenseTotals(e,today);
  assert.equal(t.planned,1800);assert.equal(t.unallocated,1300);assert.equal(t.balance,1300);
  assert.equal(t.state,'partial');
  assert.equal(planningSnapshot({tasks:[],expenses:[e]},today).open,1300);
  assert.equal(expenseTotals({installments:e.installments},today).planned,500);
  assert.equal(expenseTotals({contracted:1800,installments:[]},today).balance,1800);
});
test('quick payments accumulate with their history and settle only the remaining balance',()=>{
  const e={id:'a',contracted:1000,installments:[{id:'p',amount:1000,paidAmount:200,paidAt:'2026-10-01',payment:'Pix'}]};
  let seq=0;const makeId=()=>String(++seq);
  const next=recordExpensePayment(e,{installmentId:'p',amount:300,paidAt:today,payment:'Crédito'},makeId);
  assert.equal(next.installments[0].paidAmount,500);assert.equal(next.installments[0].payments.length,2);
  assert.equal(next.installments[0].payments[0].amount,200);
  assert.equal(next.installments[0].payments[1].payment,'Crédito');
  assert.equal(e.installments[0].paidAmount,200);
  const end=recordExpensePayment(next,{installmentId:'p',amount:500,paidAt:today,payment:'Pix'},makeId);
  assert.equal(expenseTotals(end,today).state,'paid');assert.equal(end.installments[0].payments.length,3);
  assert.throws(()=>recordExpensePayment(next,{installmentId:'p',amount:500.01,paidAt:today,payment:'Pix'},makeId));
  assert.throws(()=>recordExpensePayment(next,{installmentId:'p',amount:0,paidAt:today,payment:'Pix'},makeId));
  assert.throws(()=>recordExpensePayment(next,{installmentId:'p',amount:1,paidAt:'',payment:'Pix'},makeId));
});
test('paying unscheduled balance creates only the amount paid, preserves the remaining contract',()=>{
  const e={contracted:1800,installments:[{id:'s',amount:500,paidAmount:500}]};let seq=0;
  const next=recordExpensePayment(e,{installmentId:'__unallocated__',amount:300,paidAt:today,payment:'Débito'},()=>String(++seq));
  assert.equal(next.contracted,1800);assert.equal(expenseTotals(next,today).unallocated,1000);
  assert.equal(expenseTotals(next,today).paid,800);assert.equal(expenseTotals(next,today).balance,1000);
  const end=recordExpensePayment(next,{installmentId:'__unallocated__',amount:1000,paidAt:today,payment:'Pix'},()=>String(++seq));
  assert.equal(expenseTotals(end,today).state,'paid');assert.equal(expenseTotals(end,today).unallocated,0);
});

test('corrections recalculate the paid amount and preserve previous values',()=>{
  const e={contracted:1000,installments:[{id:'p',amount:1000,paidAmount:1000,paidAt:today,payment:'Pix'}]};
  const fixed=reviseExpensePayment(e,{installmentId:'p',paymentId:'legacy-p',action:'edit',amount:900,paidAt:today,payment:'Débito',reason:'Valor digitado incorretamente'});
  assert.equal(expenseTotals(fixed,today).balance,100);
  assert.equal(fixed.installments[0].payments[0].changes[0].amount,1000);
  assert.equal(fixed.installments[0].payments[0].payment,'Débito');
  assert.equal(e.installments[0].paidAmount,1000);
});
test('reversals preserve the entry, reopen debt, and are excluded from later payment sums',()=>{
  let seq=0;const makeId=()=>String(++seq);
  const base={contracted:1000,installments:[{id:'p',amount:1000,paidAmount:200,paidAt:today,payment:'Pix',due:'2026-10-01'}]};
  const paid=recordExpensePayment(base,{installmentId:'p',amount:800,paidAt:today,payment:'Pix'},makeId);
  const history=paymentHistory(paid.installments[0]);
  const reversed=reviseExpensePayment(paid,{installmentId:'p',paymentId:history[1].id,action:'reverse',reason:'Duplicado'});
  assert.equal(expenseTotals(reversed,today).paid,200);assert.equal(expenseTotals(reversed,today).balance,800);
  assert.equal(expenseTotals(reversed,today).state,'overdue');
  assert.ok(paymentHistory(reversed.installments[0])[1].reversedAt);
  const again=recordExpensePayment(reversed,{installmentId:'p',amount:800,paidAt:today,payment:'Crédito'},makeId);
  assert.equal(paymentHistory(again.installments[0]).length,3);
  assert.equal(expenseTotals(again,today).state,'paid');
  assert.throws(()=>reviseExpensePayment(reversed,{installmentId:'p',paymentId:history[1].id,action:'edit',amount:1,paidAt:today,payment:'Pix'}));
});
test('history corrections cannot exceed a parcel after other active payments',()=>{
  const e={contracted:1000,installments:[{id:'p',amount:1000,paidAmount:1000,payments:[{id:'a',amount:400,paidAt:today,payment:'Pix'},{id:'b',amount:600,paidAt:today,payment:'Pix'}]}]};
  assert.throws(()=>reviseExpensePayment(e,{installmentId:'p',paymentId:'a',action:'edit',amount:401,paidAt:today,payment:'Pix'}));
  assert.throws(()=>reviseExpensePayment(e,{installmentId:'p',paymentId:'a',action:'reverse',reason:''}));
  assert.throws(()=>reviseExpensePayment(e,{installmentId:'missing',paymentId:'a',action:'reverse',reason:'Erro'}));
  assert.equal(paymentHistory({id:'old',paidAmount:500,paidAt:''})[0].id,'legacy-old');
});
