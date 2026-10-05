// Civil dates and installment balances shared by the planning views.
export function eventToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function civilDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const stamp = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === date ? stamp / 86400000 : null;
}
export function daysUntil(date, today = eventToday()) {
  const day = civilDay(date), base = civilDay(today);
  return day === null || base === null ? null : day - base;
}
export function matchesPeriod(date, period, today = eventToday()) {
  const days = daysUntil(date, today);
  if (period === 'all') return true;
  if (period === 'undated') return days === null;
  if (days === null) return false;
  if (period === 'overdue') return days < 0;
  if (period === 'today') return days === 0;
  if (period === 'last7' || period === 'last30') return days <= 0 && days >= -(period === 'last7' ? 7 : 30);
  return days >= 0 && days <= (period === 'next7' ? 7 : 30);
}
export function deadline(date, today = eventToday()) {
  const days = daysUntil(date, today);
  if (days === null) return {tone: 'neutral', label: 'Sem prazo'};
  if (days < 0) return {tone: 'overdue', label: `Atrasado há ${-days} dia${days === -1 ? '' : 's'}`};
  if (days === 0) return {tone: 'soon', label: 'Vence hoje'};
  return {tone: days <= 7 ? 'soon' : days <= 15 ? 'near' : 'neutral', label: `Vence em ${days} dia${days === 1 ? '' : 's'}`};
}
const cents = n => Math.max(0, Math.round((Number(n) || 0) * 100));
export const installmentBalance = p => Math.max(0, cents(p.amount) - cents(p.paidAmount)) / 100;
export function expenseTotals(expense, today = eventToday()) {
  const ps = expense.installments || [];
  const scheduled = ps.reduce((s, p) => s + cents(p.amount), 0) / 100;
  // Existing expenses keep their original total until explicitly edited.
  const planned = expense.contracted != null ? cents(expense.contracted) / 100 : scheduled;
  const paid = ps.reduce((s, p) => s + cents(p.paidAmount), 0) / 100;
  const scheduledBalance = ps.reduce((s, p) => s + Math.round(installmentBalance(p) * 100), 0) / 100;
  const unallocated = Math.max(0, cents(planned) - cents(scheduled)) / 100;
  const balance = Math.max(scheduledBalance, Math.max(0, cents(planned) - cents(paid)) / 100);
  const overdue = ps.some(p => installmentBalance(p) > 0 && matchesPeriod(p.due, 'overdue', today));
  return {planned, scheduled, unallocated, paid, balance, overdue, state: balance === 0 && planned > 0 ? 'paid' : overdue ? 'overdue' : paid > 0 ? 'partial' : 'open'};
}
export function recordExpensePayment(expense, {installmentId, amount, paidAt, payment}, makeId = () => crypto.randomUUID()) {
  const value = cents(amount);
  if (!(Number(amount) > 0) || value === 0) throw new Error('Informe um valor maior que zero.');
  if (civilDay(paidAt) === null) throw new Error('Informe a data do pagamento.');
  const ps = (expense.installments || []).map(p => ({...p}));
  let p;
  if (installmentId === '__unallocated__') {
    if (value > cents(expenseTotals(expense).unallocated)) throw new Error('O valor supera o saldo sem programação.');
    p = {id: makeId(), label: 'Pagamento avulso', amount: value / 100, due: '', paidAmount: 0, payments: []};
    ps.push(p);
  } else {
    p = ps.find(p => p.id === installmentId);
    if (!p || value > cents(installmentBalance(p))) throw new Error('O valor supera o saldo da parcela.');
  }
  const history = paymentHistory(p);
  history.push({id: makeId(), amount: value / 100, paidAt, payment});
  Object.assign(p, {paidAmount: (cents(p.paidAmount) + value) / 100, paidAt, payment, payments: history});
  const result = {...expense, contracted: expenseTotals(expense).planned, installments: ps};
  const totals = expenseTotals(result);
  return {...result, planned: totals.planned, paid: totals.paid};
}
export function paymentHistory(installment) {
  const history = Array.isArray(installment.payments) ? installment.payments.map(h => ({...h})) : [];
  if (history.reduce((s, h) => s + (h.reversedAt ? 0 : cents(h.amount)), 0) === cents(installment.paidAmount)) return history;
  return cents(installment.paidAmount) > 0 ? [{id: 'legacy-' + installment.id, amount: cents(installment.paidAmount) / 100, paidAt: installment.paidAt || '', payment: installment.payment || 'Outros', legacy: true}] : [];
}
export function reviseExpensePayment(expense, {installmentId, paymentId, action, amount, paidAt, payment, reason = ''}, now = new Date()) {
  const installments = (expense.installments || []).map(p => ({...p}));
  const p = installments.find(p => p.id === installmentId);
  if (!p) throw new Error('Parcela não encontrada.');
  const history = paymentHistory(p), entry = history.find(h => h.id === paymentId);
  if (!entry || entry.reversedAt) throw new Error('Pagamento indisponível para alteração.');
  if (action === 'reverse') {
    if (!reason.trim()) throw new Error('Informe o motivo do estorno.');
    Object.assign(entry, {reversedAt: now.toISOString(), reversalReason: reason.trim()});
  } else if (action === 'edit') {
    const value = cents(amount), other = history.reduce((s,h) => s + (h.id === paymentId || h.reversedAt ? 0 : cents(h.amount)), 0);
    if (!(Number(amount) > 0) || value === 0 || value + other > cents(p.amount)) throw new Error('O valor deve ser positivo e não superar o valor da parcela.');
    if (civilDay(paidAt) === null) throw new Error('Informe a data do pagamento.');
    const changes = [...(entry.changes || []), {amount: entry.amount, paidAt: entry.paidAt, payment: entry.payment, changedAt: now.toISOString(), reason: reason.trim()}];
    Object.assign(entry, {amount: value / 100, paidAt, payment, changes});
  } else throw new Error('Ação inválida.');
  const active = history.filter(h => !h.reversedAt), last = [...active].sort((a,b) => (b.paidAt || '').localeCompare(a.paidAt || ''))[0];
  Object.assign(p, {payments: history, paidAmount: active.reduce((s,h) => s + cents(h.amount), 0) / 100, paidAt: last?.paidAt || '', payment: last?.payment || 'Pix'});
  const result = {...expense, contracted: expenseTotals(expense).planned, installments};
  const totals = expenseTotals(result);
  return {...result, planned: totals.planned, paid: totals.paid};
}
export function planningSnapshot(data, today = eventToday()) {
  const tasks = data.tasks.filter(t => t.status !== 'done');
  const payments = data.expenses.flatMap(e => (e.installments || []).map((p, index) => ({...p, key: `${e.id}-${p.id || index}`, expense: e, balance: installmentBalance(p)}))).filter(p => p.balance > 0);
  const overduePayments = payments.filter(p => matchesPeriod(p.due, 'overdue', today));
  const soonPayments = payments.filter(p => matchesPeriod(p.due, 'next7', today));
  const sum = ps => ps.reduce((s, p) => s + Math.round(p.balance * 100), 0) / 100;
  const totals = data.expenses.map(e => expenseTotals(e, today));
  const total = key => totals.reduce((s, e) => s + Math.round(e[key] * 100), 0) / 100;
  return {planned: total('planned'), paid: total('paid'), open: total('balance'),
    overdueTasks: tasks.filter(t => matchesPeriod(t.due, 'overdue', today)).length,
    soonTasks: tasks.filter(t => matchesPeriod(t.due, 'next7', today)).length,
    overdueValue: sum(overduePayments), soonValue: sum(soonPayments),
    overduePayments: overduePayments.length, soonPayments: soonPayments.length};
}

// Split in integer cents; keep the original day when a shorter month is clamped.
export function generateInstallments({amount, count, firstDue, startIndex = 1}, makeId = () => crypto.randomUUID()) {
  const value = cents(amount), n = Number(count);
  if (!Number.isFinite(Number(amount)) || value < 1 || !Number.isInteger(n) || n < 1 || n > 60 || value < n) throw new Error('Informe um valor positivo e de 1 a 60 parcelas de pelo menos R$ 0,01.');
  if (civilDay(firstDue) === null) throw new Error('Informe o primeiro vencimento.');
  const [year, month, day] = firstDue.split('-').map(Number);
  if (year + Math.floor((month - 1 + n - 1) / 12) > 9999) throw new Error('O último vencimento ultrapassa o ano permitido.');
  return Array.from({length:n}, (_, i) => {
    const absolute = month - 1 + i, y = year + Math.floor(absolute / 12), m = absolute % 12;
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const due = `${String(y).padStart(4,'0')}-${String(m + 1).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`;
    return {id:makeId(), label:`Parcela ${startIndex + i}`, amount:(Math.floor(value / n) + (i < value % n ? 1 : 0)) / 100, due, paidAmount:0, paidAt:'', payment:'Pix'};
  });
}
export function categoryBudgets(expenses, budgets = {}, categories = []) {
  const names = [...new Set([...categories, ...Object.keys(budgets), ...expenses.map(e => e.category || 'Outros')])];
  return names.map(category => {
    const contracted = expenses.filter(e => (e.category || 'Outros') === category).reduce((s,e) => s + cents(expenseTotals(e).planned),0) / 100;
    const raw = budgets[category], defined = raw !== '' && raw != null && Number.isFinite(Number(raw)) && Number(raw) >= 0;
    const budget = defined ? cents(raw) / 100 : null;
    return {category, budget, contracted, remaining:defined ? (cents(budget) - cents(contracted)) / 100 : null};
  });
}

export function saveExpenseWithActions(data, expense, actionIds) {
  const selected = actionIds === undefined ? null : new Set(actionIds.filter(Boolean));
  return {...data, expenses:data.expenses.some(e=>e.id===expense.id)?data.expenses.map(e=>e.id===expense.id?expense:e):[expense,...data.expenses],
    tasks:selected === null ? data.tasks : data.tasks.map(t=>selected.has(t.id)?{...t,expenseId:expense.id,cost:true}:t.expenseId===expense.id?{...t,expenseId:''}:t)};
}
export function paymentForecast(expenses, today = eventToday()) {
  const pending = expenses.flatMap(expense => (expense.installments || []).map(p=>({...p,expense,balance:installmentBalance(p)}))).filter(p=>p.balance>0).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||a.expense.description.localeCompare(b.expense.description,'pt-BR'));
  const next7 = pending.filter(p=>matchesPeriod(p.due,'next7',today)), next30 = pending.filter(p=>matchesPeriod(p.due,'next30',today));
  const sum = rows => rows.reduce((s,p)=>s+cents(p.balance),0)/100;
  return {next7,next30,total7:sum(next7),total30:sum(next30),overdue:sum(pending.filter(p=>matchesPeriod(p.due,'overdue',today))),undated:(pending.filter(p=>daysUntil(p.due,today)===null).reduce((s,p)=>s+cents(p.balance),0)+expenses.reduce((s,e)=>s+cents(expenseTotals(e).unallocated),0))/100};
}
// Semicolon CSV is compatible with Brazilian spreadsheet settings; quote every field.
export function planningCsv(data, section, today = eventToday()) {
  const brMoney = value => Number(value||0).toFixed(2).replace('.',',');
  let rows;
  if (section === 'schedule') rows = [['Ação','Data','Início','Fim','Responsável','Contato','Local','Situação','Etapas'],...data.tasks.filter(t=>t.eventDate&&t.eventTime).sort((a,b)=>(a.eventDate+a.eventTime).localeCompare(b.eventDate+b.eventTime)).map(t=>[t.title,t.eventDate,t.eventTime,t.eventEnd,t.responsible,t.contact,t.place,t.status==='done'?'Realizada':'A realizar',(t.subtasks||[]).map(s=>(s.done?'✓ ':'Pendente: ')+s.title).join(' | ')])];
  else if (section === 'tasks') rows = [['Ação','Categoria','Situação','Prioridade','Responsável','Prazo','Realizada em','Serviço vinculado','Observação','Etapas'],...data.tasks.map(t=>[t.title,t.category,t.status==='done'?'Realizada':'A realizar',({high:'Alta',medium:'Média',low:'Baixa'})[t.priority]||'',t.responsible,t.due,t.completedAt,data.expenses.find(e=>e.id===t.expenseId)?.description||'',t.notes,(t.subtasks||[]).map(s=>(s.done?'✓ ':'Pendente: ')+s.title).join(' | ')])];
  else if (section === 'expenses') rows = [['Serviço','Categoria','Fornecedor','Contratado','Pago','A quitar','Situação','Ações vinculadas','Observação'],...data.expenses.map(e=>{const totals=expenseTotals(e,today);return [e.description,e.category,e.supplier,brMoney(totals.planned),brMoney(totals.paid),brMoney(totals.balance),totals.state==='paid'?'Quitado':totals.planned>0?'A quitar':'Valor a definir',data.tasks.filter(t=>t.expenseId===e.id).map(t=>t.title).join(' | '),e.notes]})];
  else if (section === 'payments') rows = [['Serviço','Parcela','Valor programado','Vencimento','Valor pago ativo','Saldo da parcela','Pagamento registrado','Data do pagamento','Meio de pagamento','Situação do registro','Motivo do estorno','Estornado em','Correções','Valores anteriores'],...data.expenses.flatMap(e=>(e.installments||[]).flatMap(p=>{const history=paymentHistory(p),base=[e.description,p.label,brMoney(p.amount),p.due,brMoney(p.paidAmount),brMoney(installmentBalance(p))];return history.length?history.map(h=>[...base,brMoney(h.amount),h.paidAt,h.payment,h.reversedAt?'Estornado':'Ativo',h.reversalReason,h.reversedAt,h.changes?.length||0,(h.changes||[]).map(c=>`${brMoney(c.amount)} | ${c.paidAt||'Sem data'} | ${c.payment||''} | ${c.changedAt||''} | ${c.reason||''}`).join(' / ')]):[[...base,'','','','Sem pagamento','','',0,'']]}))];
  else if (section === 'budgets') rows = [['Categoria','Limite','Contratado','Disponível','Excedido'],...categoryBudgets(data.expenses,data.budgets||{}).map(r=>[r.category,r.budget===null?'':brMoney(r.budget),brMoney(r.contracted),r.remaining===null?'':brMoney(Math.max(0,r.remaining)),r.remaining===null?'':brMoney(Math.max(0,-r.remaining))])];
  else throw new Error('Exportação inválida.');
  const escape = value => {let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'};
  return '\uFEFF'+rows.map(row=>row.map(escape).join(';')).join('\r\n')+'\r\n';
}

export function trashPlanningItem(data, type, itemId, makeId = () => crypto.randomUUID(), now = new Date()) {
  const collection = type === 'task' ? 'tasks' : type === 'expense' ? 'expenses' : null;
  if (!collection) throw new Error('Tipo inválido.');
  const item = data[collection].find(x=>x.id===itemId);
  if (!item) throw new Error('Registro não encontrado.');
  const linkedTaskIds = type === 'expense' ? data.tasks.filter(t=>t.expenseId===itemId).map(t=>t.id) : [];
  if ((data.trash||[]).length>=500) throw new Error('A lixeira atingiu 500 registros. Restaure um registro antes de excluir outro.');
  const entry = {id:makeId(),type,item:structuredClone(item),linkedTaskIds,deletedAt:now.toISOString()};
  return {...data,[collection]:data[collection].filter(x=>x.id!==itemId),tasks:type==='expense'?data.tasks.map(t=>t.expenseId===itemId?{...t,expenseId:''}:t):data.tasks.filter(t=>t.id!==itemId),trash:[entry,...(data.trash||[])]};
}
export function restorePlanningItem(data, entryId) {
  const entry = (data.trash||[]).find(x=>x.id===entryId);
  if (!entry || !['task','expense'].includes(entry.type)) throw new Error('Registro não encontrado na lixeira.');
  const collection = entry.type==='task'?'tasks':'expenses';
  if (data[collection].some(x=>x.id===entry.item.id)) throw new Error('Já existe um registro com este identificador.');
  const item=structuredClone(entry.item);
  const tasks=entry.type==='task'?[item,...data.tasks]:data.tasks.map(t=>(entry.linkedTaskIds||[]).includes(t.id)&&!t.expenseId?{...t,expenseId:item.id,cost:true}:t);
  return {...data,[collection]:[item,...data[collection]],tasks,trash:data.trash.filter(x=>x.id!==entryId)};
}

export function taskProgress(task) {
  const steps=task.subtasks||[];
  return {total:steps.length,done:steps.filter(s=>s.done).length,pending:steps.some(s=>!s.done)};
}
export function togglePlanningTask(data, taskId, today=eventToday()) {
  return {...data,tasks:data.tasks.map(t=>{
    if(t.id!==taskId)return t;
    if(t.status!=='done'&&taskProgress(t).pending)throw new Error('Conclua as etapas antes de finalizar a ação.');
    return {...t,status:t.status==='done'?'todo':'done',completedAt:t.status==='done'?'':today};
  })};
}
export function togglePlanningSubtask(data, taskId, stepId) {
  return {...data,tasks:data.tasks.map(t=>{
    if(t.id!==taskId)return t;
    const subtasks=(t.subtasks||[]).map(s=>s.id===stepId?{...s,done:!s.done}:s);
    return {...t,subtasks,...(t.status==='done'&&subtasks.some(s=>!s.done)?{status:'todo',completedAt:''}:{})};
  })};
}
export function eventSchedule(tasks,date) {
  return tasks.filter(t=>t.eventDate===date&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t.eventTime||'')).sort((a,b)=>a.eventTime.localeCompare(b.eventTime)||a.title.localeCompare(b.title,'pt-BR'));
}
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
export const planningStatesEqual=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
const sameRecord=planningStatesEqual;
export function mergePlanningStates(base,local,remote,choices={}) {
  const conflicts=[],data={};
  const pick=(key,label,b,l,r)=>{
    if(sameRecord(l,b))return r;
    if(sameRecord(r,b)||sameRecord(l,r))return l;
    conflicts.push({key,label,local:l,remote:r});
    return choices[key]==='remote'?r:l;
  };
  for(const collection of ['tasks','expenses','trash']) {
    const maps=[base,local,remote].map(d=>new Map((d?.[collection]||[]).map(x=>[x.id,x])));
    const keys=[...new Set([...maps[1].keys(),...maps[2].keys(),...maps[0].keys()])];
    data[collection]=keys.map(key=>{const [b,l,r]=maps.map(m=>m.get(key));const item=l||r||b;return pick(collection+':'+key,item.title||item.description||item.item?.title||item.item?.description||'Registro',b,l,r)}).filter(Boolean);
  }
  const keys=[...new Set([...Object.keys(base?.budgets||{}),...Object.keys(local?.budgets||{}),...Object.keys(remote?.budgets||{})])];
  data.budgets={};keys.forEach(key=>{const v=pick('budgets:'+key,'Orçamento: '+key,base?.budgets?.[key],local?.budgets?.[key],remote?.budgets?.[key]);if(v!==undefined)data.budgets[key]=v});
  return {data,conflicts};
}
