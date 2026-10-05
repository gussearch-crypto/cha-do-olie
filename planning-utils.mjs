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
  const planned = ps.reduce((s, p) => s + cents(p.amount), 0) / 100;
  const paid = ps.reduce((s, p) => s + cents(p.paidAmount), 0) / 100;
  const balance = ps.reduce((s, p) => s + Math.round(installmentBalance(p) * 100), 0) / 100;
  const overdue = ps.some(p => installmentBalance(p) > 0 && matchesPeriod(p.due, 'overdue', today));
  return {planned, paid, balance, overdue, state: balance === 0 && planned > 0 ? 'paid' : overdue ? 'overdue' : paid > 0 ? 'partial' : 'open'};
}
export function planningSnapshot(data, today = eventToday()) {
  const tasks = data.tasks.filter(t => t.status !== 'done');
  const payments = data.expenses.flatMap(e => (e.installments || []).map((p, index) => ({...p, key: `${e.id}-${p.id || index}`, expense: e, balance: installmentBalance(p)}))).filter(p => p.balance > 0);
  const overduePayments = payments.filter(p => matchesPeriod(p.due, 'overdue', today));
  const soonPayments = payments.filter(p => matchesPeriod(p.due, 'next7', today));
  const sum = ps => ps.reduce((s, p) => s + Math.round(p.balance * 100), 0) / 100;
  const totals = data.expenses.map(e => expenseTotals(e, today));
  const total = key => totals.reduce((s, e) => s + Math.round(e[key] * 100), 0) / 100;
  const agenda = [
    ...tasks.filter(t => daysUntil(t.due, today) !== null).map(t => ({key: `task-${t.id}`, type: 'task', title: t.title, due: t.due, item: t})),
    ...payments.filter(p => daysUntil(p.due, today) !== null).map(p => ({key: `payment-${p.key}`, type: 'expense', title: `${p.expense.description} · ${p.label || 'Pagamento'}`, due: p.due, balance: p.balance, item: p.expense}))
  ].sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title, 'pt-BR'));
  return {planned: total('planned'), paid: total('paid'), open: total('balance'),
    overdueTasks: tasks.filter(t => matchesPeriod(t.due, 'overdue', today)).length,
    soonTasks: tasks.filter(t => matchesPeriod(t.due, 'next7', today)).length,
    overdueValue: sum(overduePayments), soonValue: sum(soonPayments),
    overduePayments: overduePayments.length, soonPayments: soonPayments.length, agenda};
}
