import {daysUntil,expenseTotals,financialClosingProjection,installmentBalance,planningSnapshot,taskDependencies} from './planning-utils.mjs';
import {scheduleConflicts} from './planning-schedule-conflicts.mjs';

export const EVENT_DATE='2026-12-04';
export const RSVP_DEADLINE='2026-11-30';
export const EVENT_CAPACITY=100;
const validTime=time=>/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'');
export const isRealFamily=family=>family?.is_test!==true&&String(family?.group_name||'').trim().toLowerCase()!=='teste';
const isUnderFive=guest=>guest?.person_type==='child'&&guest?.child_age_group==='under_5';
const hasAnswer=guest=>guest?.attendance==='yes'||guest?.attendance==='no';

export function eventRsvpReadiness(families=[],today='2026-11-05'){
  const real=(Array.isArray(families)?families:[]).filter(isRealFamily);
  const guests=real.flatMap(f=>Array.isArray(f.guests)?f.guests:[]);
  const yes=guests.filter(g=>g.attendance==='yes');
  const waiting=guests.filter(g=>!hasAnswer(g));
  const counted=yes.filter(g=>!isUnderFive(g)).length;
  const pendingEligible=waiting.filter(g=>!isUnderFive(g)).length;
  const affectedFamilies=real.filter(f=>(f.guests||[]).some(g=>!hasAnswer(g)));
  const deadlineDays=daysUntil(RSVP_DEADLINE,today);
  const afterDeadline=deadlineDays!==null&&deadlineDays<0;
  const unknownAges=yes.filter(g=>g.person_type==='child'&&!['under_5','five_or_more'].includes(g.child_age_group)).length;
  return {
    families:real.length,
    counted,capacity:EVENT_CAPACITY,available:Math.max(0,EVENT_CAPACITY-counted),
    overCapacity:Math.max(0,counted-EVENT_CAPACITY),
    confirmed:yes.length,confirmedUnderFive:yes.filter(isUnderFive).length,
    waiting:waiting.length,pendingEligible,waitingFamilies:affectedFamilies.length,
    declined:guests.filter(g=>g.attendance==='no').length,
    unknownAges,deadlineDays,afterDeadline,
    substitutionCandidates:afterDeadline?affectedFamilies.length:0,
    possibleCount:counted+pendingEligible
  };
}

export function eventScheduleReadiness(data={},date=EVENT_DATE){
  const tasks=Array.isArray(data?.tasks)?data.tasks:[];
  const rows=tasks.filter(t=>t.eventDate===date&&validTime(t.eventTime))
    .sort((a,b)=>a.eventTime.localeCompare(b.eventTime)||(a.title||'').localeCompare(b.title||'','pt-BR'));
  const conflicts=scheduleConflicts(rows.filter(t=>t.status!=='done'),date);
  const conflicted=new Set(conflicts.flatMap(c=>[c.first.id,c.second.id]));
  const entries=rows.map(task=>{
    const phase=task.eventTime<'18:00'?'before':task.eventTime<'22:00'?'during':'after';
    const steps=Array.isArray(task.subtasks)?task.subtasks:[];
    return {...task,phase,conflict:conflicted.has(task.id),missingOwner:!String(task.responsible||'').trim(),
      pendingSteps:steps.filter(s=>!s.done).length,stepsTotal:steps.length};
  });
  return {entries,conflicts,scheduled:entries.length,
    pending:entries.filter(x=>x.status!=='done').length,
    missingOwners:entries.filter(x=>x.status!=='done'&&x.missingOwner).length,
    before:entries.filter(x=>x.phase==='before'),during:entries.filter(x=>x.phase==='during'),after:entries.filter(x=>x.phase==='after')};
}

export function eventFinanceReadiness(data={},today='2026-11-05'){
  const expenses=Array.isArray(data?.expenses)?data.expenses:[];
  const totals=planningSnapshot({tasks:Array.isArray(data?.tasks)?data.tasks:[],expenses},today);
  const payments=expenses.flatMap(e=>(e.installments||[]).map((p,index)=>({
    key:String(e.id||'expense')+':'+String(p.id||index),expense:e,installment:p,
    balance:installmentBalance(p),due:p.due||''
  }))).filter(p=>p.balance>0);
  const dated=payments.filter(p=>daysUntil(p.due,today)!==null)
    .sort((a,b)=>a.due.localeCompare(b.due)||(a.expense.description||'').localeCompare(b.expense.description||'','pt-BR'));
  const unallocated=expenses.reduce((n,e)=>n+Math.round(expenseTotals(e,today).unallocated*100),0)/100;
  const unscheduled=payments.filter(p=>daysUntil(p.due,today)===null).reduce((n,p)=>n+Math.round(p.balance*100),0)/100;
  const forecast=financialClosingProjection(expenses,data?.quotes||[],data?.budgets||{});
  return {...totals,dated,unallocated,unscheduled,unplannedBalance:Math.round((unallocated+unscheduled)*100)/100,
    goal:forecast.goal,projected:forecast.projected};
}

export function eventPriorityReadiness(data={},rsvp={},today='2026-11-05'){
  const tasks=Array.isArray(data?.tasks)?data.tasks:[];
  const schedule=eventScheduleReadiness(data);
  const finance=eventFinanceReadiness(data,today);
  const rows=[];
  const add=(priority,type,label,detail,tab)=>rows.push({priority,type,label,detail,tab});
  const days=daysUntil(RSVP_DEADLINE,today);
  if(rsvp.waiting>0){
    add(days!==null&&days<0?0:days!==null&&days<=7?1:2,'guests',
      rsvp.waiting+' pessoa(s) aguardando confirmação',
      days!==null&&days<0?'Prazo de 30/11 encerrado · revisar substituições sem remover automaticamente':'Prazo para confirmação: 30/11 · '+rsvp.waitingFamilies+' núcleo(s)','guests');
  }
  if(rsvp.overCapacity>0)add(0,'guests','Capacidade confirmada acima de 100',rsvp.overCapacity+' pessoa(s) além da capacidade','guests');
  if(rsvp.unknownAges>0)add(1,'guests','Verificar faixa etária',rsvp.unknownAges+' criança(s) confirmadas sem classificação de idade','guests');
  if(finance.overduePayments>0)add(0,'finance','Pagamentos vencidos',finance.overduePayments+' parcela(s) · '+finance.overdueValue.toFixed(2)+' a quitar','finance');
  if(finance.soonPayments>0)add(1,'finance','Próximos pagamentos',finance.soonPayments+' parcela(s) vencem nos próximos 7 dias','finance');
  if(finance.unplannedBalance>0)add(2,'finance','Revisar programação financeira','Existe saldo sem vencimento ou sem parcelamento definido','finance');
  for(const task of tasks.filter(t=>t.status!=='done')){
    const d=daysUntil(task.due,today),dependencies=taskDependencies(task,tasks);
    if(d!==null&&d<0)add(0,'planning',task.title||'Ação sem título','Ação atrasada · '+(-d)+' dia(s)','planning');
    else if(d!==null&&d<=7)add(1,'planning',task.title||'Ação sem título','Vence nos próximos 7 dias','planning');
    if(dependencies.length)add(2,'planning',task.title||'Ação sem título','Bloqueada por '+dependencies.length+' dependência(s)','planning');
  }
  if(schedule.conflicts.length)add(0,'schedule','Conflitos no cronograma de 04/12',
    schedule.conflicts.length+' sobreposição(ões) de horário para o mesmo responsável','planning');
  if(schedule.missingOwners)add(1,'schedule','Responsáveis a definir no dia do chá',
    schedule.missingOwners+' atividade(s) do cronograma sem responsável','planning');
  rows.sort((a,b)=>a.priority-b.priority||a.label.localeCompare(b.label,'pt-BR'));
  return rows;
}
