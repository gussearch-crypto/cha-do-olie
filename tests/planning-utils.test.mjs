import test from 'node:test';
import assert from 'node:assert/strict';
import {eventToday,daysUntil,matchesPeriod,deadline,installmentBalance,expenseTotals,planningSnapshot,recordExpensePayment,paymentHistory,reviseExpensePayment,generateInstallments,categoryBudgets,saveExpenseWithActions,paymentForecast,planningCsv,trashPlanningItem,restorePlanningItem} from '../planning-utils.mjs';
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

test('monthly schedules preserve cents and restore the original day after shorter months',()=>{
  let seq=0;
  const ps=generateInstallments({amount:100,count:3,firstDue:'2027-01-31',startIndex:2},()=>String(++seq));
  assert.deepEqual(ps.map(p=>p.amount),[33.34,33.33,33.33]);
  assert.deepEqual(ps.map(p=>p.due),['2027-01-31','2027-02-28','2027-03-31']);
  assert.equal(ps[0].label,'Parcela 2');assert.equal(new Set(ps.map(p=>p.id)).size,3);
  assert.equal(ps.reduce((s,p)=>s+Math.round(p.amount*100),0),10000);
  assert.equal(generateInstallments({amount:2,count:2,firstDue:'2023-12-31'})[1].due,'2024-01-31');
  assert.equal(generateInstallments({amount:3,count:3,firstDue:'2024-01-31'})[1].due,'2024-02-29');
  for(const args of [{amount:0,count:3,firstDue:today},{amount:.02,count:3,firstDue:today},{amount:10,count:1.5,firstDue:today},{amount:10,count:61,firstDue:today},{amount:10,count:3,firstDue:'2026-02-30'}])assert.throws(()=>generateInstallments(args));
});
test('category budgets include settled and unscheduled contracts, distinguish zero and missing limits',()=>{
  const expenses=[{category:'Alimentação',contracted:100,installments:[{amount:100,paidAmount:100}]},{category:'Alimentação',contracted:50,installments:[]},{category:'Bebidas',contracted:25,installments:[]}];
  const rows=categoryBudgets(expenses,{'Alimentação':140,'Bebidas':0,'Local':200},['Decoração']);
  assert.deepEqual(rows.find(r=>r.category==='Alimentação'),{category:'Alimentação',budget:140,contracted:150,remaining:-10});
  assert.equal(rows.find(r=>r.category==='Bebidas').remaining,-25);
  assert.equal(rows.find(r=>r.category==='Local').remaining,200);
  assert.equal(rows.find(r=>r.category==='Decoração').budget,null);
  assert.equal(categoryBudgets(expenses,{'Alimentação':''})[0].budget,null);
});

test('saving service links applies selection, preserves unrelated tasks and leaves payment-only edits linked',()=>{
  const data={budgets:{Local:500},tasks:[{id:'a',expenseId:'old',cost:true},{id:'b',expenseId:'service',cost:true},{id:'c'}],expenses:[{id:'old'},{id:'service'}]};
  const next=saveExpenseWithActions(data,{id:'service',description:'Updated'},['a','c','c']);
  assert.equal(next.tasks[0].expenseId,'service');assert.equal(next.tasks[1].expenseId,'');assert.equal(next.tasks[2].cost,true);assert.equal(next.expenses.length,2);assert.equal(next.budgets.Local,500);assert.equal(data.tasks[0].expenseId,'old');
  const paid=saveExpenseWithActions(next,{id:'service',paid:100});assert.strictEqual(paid.tasks,next.tasks);
  const none=saveExpenseWithActions(paid,{id:'service'},[]);assert.equal(none.tasks.filter(t=>t.expenseId==='service').length,0);
  const added=saveExpenseWithActions(data,{id:'new'},['c']);assert.equal(added.expenses.length,3);assert.equal(added.tasks[1].expenseId,'service');
});
test('forecast includes today and period boundaries, excludes paid, overdue and unknown dates',()=>{
  const expenses=[{id:'e',description:'Buffet',contracted:1000,installments:[{id:'today',amount:100,paidAmount:40,due:today},{id:'7',amount:100,due:'2026-10-12'},{id:'8',amount:100,due:'2026-10-13'},{id:'30',amount:100,due:'2026-11-04'},{id:'31',amount:100,due:'2026-11-05'},{id:'old',amount:100,due:'2026-10-04'},{id:'paid',amount:100,paidAmount:100,due:today},{id:'none',amount:100,due:''}]}];
  const forecast=paymentForecast(expenses,today);
  assert.equal(forecast.total7,160);assert.equal(forecast.total30,360);assert.equal(forecast.overdue,100);assert.equal(forecast.undated,300);assert.deepEqual(forecast.next7.map(p=>p.id),['today','7']);
  assert.equal(paymentForecast([],today).total30,0);
});
test('CSV exports all sections, protects formula text, preserves quotes and distinguishes reversals',()=>{
  const data={budgets:{Local:100},tasks:[{id:'t',title:'=HYPERLINK("evil")',category:'Local',expenseId:'e',notes:'Line 1\nLine 2',status:'done'}],expenses:[{id:'e',description:'Salão; "A"',category:'Local',contracted:150,installments:[{id:'p',label:'Sinal',amount:150,paidAmount:100,payments:[{id:'active',amount:100,paidAt:today,payment:'Pix'},{id:'reverse',amount:50,paidAt:today,payment:'Pix',reversedAt:'2026-10-05T12:00:00Z',reversalReason:'Duplicado'}]}]}]};
  const actions=planningCsv(data,'tasks',today);assert.ok(actions.startsWith('\uFEFF'));assert.ok(actions.includes(`"'=HYPERLINK(""evil"")"`));assert.ok(actions.includes('"Line 1\nLine 2"'));
  const expenses=planningCsv(data,'expenses',today);assert.ok(expenses.includes('"Salão; ""A"""'));assert.ok(expenses.includes('"150,00";"100,00";"50,00"'));
  const payments=planningCsv(data,'payments',today);assert.ok(payments.includes('"Estornado";"Duplicado"'));assert.ok(payments.includes('"Ativo"'));assert.ok(planningCsv(data,'budgets',today).includes('"0,00";"50,00"'));
  assert.throws(()=>planningCsv(data,'invalid',today));
});

test('trash excludes balances and restoration recovers histories, documents and available links',()=>{
  const expense={id:'e',description:'Buffet',contracted:1000,attachments:[{path:'contract'}],installments:[{id:'p',amount:1000,paidAmount:400,payments:[{id:'h',amount:400,attachments:[{path:'receipt'}]}]}]};
  const data={budgets:{Local:100},tasks:[{id:'t',title:'Contratar',expenseId:'e',cost:true}],expenses:[expense]};
  const deleted=trashPlanningItem(data,'expense','e',()=> 'deleted',new Date('2026-10-05T15:00:00Z'));
  assert.equal(planningSnapshot(deleted,today).open,0);assert.equal(deleted.tasks[0].expenseId,'');assert.equal(data.tasks[0].expenseId,'e');
  const restored=restorePlanningItem(deleted,'deleted');assert.deepEqual(restored.expenses[0],expense);assert.equal(restored.tasks[0].expenseId,'e');assert.equal(planningSnapshot(restored,today).open,600);assert.equal(restored.trash.length,0);
  const reassigned={...deleted,tasks:[{...deleted.tasks[0],expenseId:'another'}]};assert.equal(restorePlanningItem(reassigned,'deleted').tasks[0].expenseId,'another');
  assert.throws(()=>restorePlanningItem({...deleted,expenses:[expense]},'deleted'));assert.throws(()=>trashPlanningItem(data,'expense','missing'));
});
test('restoring task and service in either order preserves their association',()=>{
  const data={tasks:[{id:'t',title:'Ação',expenseId:'e',status:'done'}],expenses:[{id:'e',description:'Serviço',contracted:10,installments:[]}]};let n=0;
  const both=trashPlanningItem(trashPlanningItem(data,'task','t',()=>String(++n)),'expense','e',()=>String(++n));
  const taskFirst=restorePlanningItem(restorePlanningItem(both,'1'),'2');assert.equal(taskFirst.tasks[0].expenseId,'e');assert.equal(taskFirst.tasks[0].status,'done');
  const serviceFirst=restorePlanningItem(restorePlanningItem(both,'2'),'1');assert.equal(serviceFirst.tasks[0].expenseId,'e');
});


test('task steps prevent early completion and reopen a completed task when a step is unchecked',async()=>{
 const {taskProgress,togglePlanningTask,togglePlanningSubtask}=await import('../planning-utils.mjs');
 let data={tasks:[{id:'t',title:'Montagem',status:'todo',subtasks:[{id:'s',title:'Conferir mesas',done:false}]}],expenses:[]};
 assert.deepEqual(taskProgress(data.tasks[0]),{total:1,done:0,pending:true});assert.throws(()=>togglePlanningTask(data,'t'),/etapas/);
 data=togglePlanningSubtask(data,'t','s');data=togglePlanningTask(data,'t','2026-12-04');assert.equal(data.tasks[0].completedAt,'2026-12-04');
 data=togglePlanningSubtask(data,'t','s');assert.equal(data.tasks[0].status,'todo');assert.equal(data.tasks[0].completedAt,'');
});
test('schedule filters date, sorts times, excludes malformed times and exports all dates',async()=>{
 const {eventSchedule,planningCsv}=await import('../planning-utils.mjs');
 const tasks=[{id:'b',title:'Recepção',eventDate:'2026-12-04',eventTime:'15:00'},{id:'a',title:'Montagem',eventDate:'2026-12-04',eventTime:'09:00'},{id:'x',title:'Outro dia',eventDate:'2026-12-05',eventTime:'09:00'},{id:'z',title:'Inválido',eventDate:'2026-12-04',eventTime:'25:99'}];
 assert.deepEqual(eventSchedule(tasks,'2026-12-04').map(t=>t.id),['a','b']);assert.ok(planningCsv({tasks,expenses:[]},'schedule').includes('Outro dia'));
});
test('three-way merge combines independent records and requires a choice for same-record changes or deletion',async()=>{
 const {mergePlanningStates}=await import('../planning-utils.mjs');
 const base={tasks:[{id:'a',title:'A'},{id:'b',title:'B'}],expenses:[],trash:[],budgets:{Local:100}};
 const local=structuredClone(base),remote=structuredClone(base);local.tasks[0].title='A local';remote.tasks[1].title='B remoto';remote.budgets.Local=200;
 let result=mergePlanningStates(base,local,remote);assert.equal(result.conflicts.length,0);assert.deepEqual(result.data.tasks.map(t=>t.title),['A local','B remoto']);assert.equal(result.data.budgets.Local,200);
 remote.tasks[0].title='A remoto';result=mergePlanningStates(base,local,remote);assert.equal(result.conflicts[0].key,'tasks:a');assert.equal(mergePlanningStates(base,local,remote,{'tasks:a':'remote'}).data.tasks[0].title,'A remoto');
 remote.tasks=[];assert.equal(mergePlanningStates(base,local,remote).conflicts.length,1);
});
