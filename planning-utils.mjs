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
