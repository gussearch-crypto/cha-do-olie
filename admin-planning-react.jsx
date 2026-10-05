import React,{useEffect,useMemo,useRef,useState}from'react';import{createRoot}from'react-dom/client';
import {eventToday, matchesPeriod, deadline, installmentBalance, expenseTotals, planningSnapshot, recordExpensePayment, paymentHistory, reviseExpensePayment, generateInstallments, categoryBudgets} from './planning-utils.mjs';
import './admin-planning.css';
const KEY='oliverEventPlanningV2',API=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/planning-api';
const CATS=['Local','Alimentação','Bebidas','Decoração','Convites','Lembrancinhas','Bolo e doces','Foto/Vídeo','Estrutura','Outros'],PAY=['Pix','Débito','Crédito','Dinheiro','Outros'];
const seed={tasks:[{id:'t1',title:'Fechar quantidade final de convidados',category:'Convites',due:'2026-11-20',status:'todo',priority:'high',responsible:'',notes:'',cost:false},{id:'t2',title:'Definir cardápio e quantidades',category:'Alimentação',due:'2026-11-20',status:'todo',priority:'high',responsible:'',notes:'',cost:true},{id:'t3',title:'Confirmar decoração e montagem',category:'Decoração',due:'2026-11-27',status:'todo',priority:'medium',responsible:'',notes:'',cost:true}],expenses:[]};
const normalize=d=>({budgets:d?.budgets&&typeof d.budgets==='object'&&!Array.isArray(d.budgets)?d.budgets:{},tasks:(d?.tasks||[]).map(t=>({...t,completedAt:t.completedAt||''})),expenses:(d?.expenses||[]).map(e=>({...e,installments:Array.isArray(e.installments)?e.installments.map((p,i)=>({...p,id:p.id||'payment-'+e.id+'-'+i})):(e.planned||e.paid||e.due?[{id:'legacy-'+e.id,label:'Pagamento',amount:Number(e.planned)||0,due:e.due||'',paidAmount:Number(e.paid)||0,paidAt:Number(e.paid)>0?(e.due||''):'',payment:e.payment||'Pix'}]:[])}))});
const readLocal=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return normalize(x&&Array.isArray(x.tasks)&&Array.isArray(x.expenses)?x:seed)}catch{return normalize(seed)}};
const planningApi=async(action,data)=>{const adminCode=sessionStorage.getItem('oliverAdmin')||'';if(!API||!adminCode)throw new Error('not_configured');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,adminCode,data})}),j=await r.json();if(!r.ok)throw new Error(j.error||'planning_error');return j};
const money=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),id=()=>crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('pt-BR'):'',today=eventToday;
function Modal({children,onClose}){useEffect(()=>{const h=e=>e.key==='Escape'&&onClose();document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[onClose]);return <div className="planningModal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="planningDialog">{children}</div></div>}
function TaskForm({item,onSave,onDelete,onClose,expenses=[]}){const[f,setF]=useState(item||{title:'',category:'Outros',due:'',priority:'medium',responsible:'',notes:'',cost:false});const change=(k,v)=>setF(x=>({...x,[k]:v}));return <form onSubmit={e=>{e.preventDefault();if(f.title.trim())onSave({...f,title:f.title.trim()})}}><h3>{item?'Editar':'Nova'} tarefa</h3><label>Tarefa<input autoFocus required value={f.title} onChange={e=>change('title',e.target.value)}/></label><div className="formGrid"><label>Categoria<select value={f.category} onChange={e=>change('category',e.target.value)}>{CATS.map(x=><option key={x}>{x}</option>)}</select></label><label>Prazo<input type="date" value={f.due} onChange={e=>change('due',e.target.value)}/></label><label>Prioridade<select value={f.priority} onChange={e=>change('priority',e.target.value)}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label>Responsável<input value={f.responsible} onChange={e=>change('responsible',e.target.value)}/></label></div><label>Observação<textarea value={f.notes} onChange={e=>change('notes',e.target.value)}/></label><label className="checkLine"><input type="checkbox" checked={!!f.cost} onChange={e=>setF(x=>({...x,cost:e.target.checked,expenseId:e.target.checked?x.expenseId:''}))}/> Esta tarefa envolve um gasto</label><label>Serviço vinculado<select aria-label="Serviço vinculado" value={f.expenseId||''} onChange={e=>setF(x=>({...x,expenseId:e.target.value,cost:e.target.value?true:x.cost}))}><option value="">Sem vínculo</option>{f.expenseId&&!expenses.some(e=>e.id===f.expenseId)&&<option value={f.expenseId}>Serviço indisponível</option>}{expenses.map(e=><option value={e.id} key={e.id}>{e.description}</option>)}</select><small className="planningFormHint">Vincule um serviço do financeiro para acompanhar seu pagamento junto da ação.</small></label><div className="modalActions">{item&&<button type="button" className="danger" onClick={onDelete}>Excluir</button>}<button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="primary">Salvar</button></div></form>}
function ExpenseForm({item,onSave,onDelete,onClose,linkedTasks=[],onOpenTask}) {
  const base=item||{description:'',category:'Outros',supplier:'',notes:'',installments:[]};
  const[f,setF]=useState({...base,contracted:expenseTotals(base).planned,installments:(base.installments||[]).map(p=>({...p}))}),[error,setError]=useState(''),[generator,setGenerator]=useState(false),[count,setCount]=useState(3),[firstDue,setFirstDue]=useState(today),[preview,setPreview]=useState([]);
  const change=(k,v)=>{setF(x=>({...x,[k]:v}));setError('');setPreview([])};
  const add=()=>change('installments',[...f.installments,{id:id(),label:`Parcela ${f.installments.length+1}`,amount:'',due:'',paidAmount:0,paidAt:'',payment:'Pix'}]);
  const setInst=(i,k,v)=>change('installments',f.installments.map((p,j)=>j===i?{...p,[k]:v,...(['paidAmount','paidAt','payment'].includes(k)?{payments:undefined}:{})}:p));
  const totals=expenseTotals(f);
  const submit=e=>{
    e.preventDefault();
    if(!f.description.trim())return;
    if(Math.round(totals.scheduled*100)>Math.round(totals.planned*100)){setError('A soma das parcelas não pode superar o valor contratado. Ajuste o contrato ou os pagamentos.');return}
    onSave({...f,description:f.description.trim(),contracted:totals.planned,planned:totals.planned,paid:totals.paid,installments:f.installments.map(p=>({...p,amount:Number(p.amount)||0,paidAmount:Number(p.paidAmount)||0}))});
  };
  return <form onSubmit={submit}><h3>{item?'Editar':'Novo'} gasto</h3>{linkedTasks.length>0&&<div className="planningRelatedTasks"><b>Ações vinculadas</b>{linkedTasks.map(t=><button type="button" key={t.id} onClick={()=>onOpenTask(t)}>{t.title} · {t.status==='done'?'Realizada':'A realizar'}</button>)}</div>}
    <label>Descrição<input autoFocus required value={f.description} onChange={e=>change('description',e.target.value)}/></label>
    <div className="formGrid"><label>Categoria<select value={f.category} onChange={e=>change('category',e.target.value)}>{CATS.map(x=><option key={x}>{x}</option>)}</select></label><label>Fornecedor<input value={f.supplier||''} onChange={e=>change('supplier',e.target.value)}/></label></div>
    <label>Valor total contratado<input type="number" min="0" step="0.01" required value={f.contracted} onChange={e=>change('contracted',e.target.value)}/><small className="planningFormHint">Informe o valor completo do serviço. As parcelas podem ser programadas aos poucos.</small></label>
    <div className="installmentHead"><div><b>Pagamentos / parcelas</b><small>Programado: {money(totals.scheduled)} · Sem programação: {money(totals.unallocated)}</small></div><button type="button" onClick={add}>+ Adicionar pagamento</button></div>
    <div className="planningGenerator"><button type="button" aria-expanded={generator} onClick={()=>setGenerator(x=>!x)}>Parcelar automaticamente</button>{generator&&<div>
      <p className="planningFormHint">Divida os {money(totals.unallocated)} sem programação em parcelas mensais. Os pagamentos existentes serão mantidos.</p>
      <div className="formGrid"><label>Quantidade de parcelas<input type="number" min="1" max="60" step="1" value={count} onChange={e=>{setCount(e.target.value);setPreview([])}}/></label><label>Primeiro vencimento<input type="date" value={firstDue} onChange={e=>{setFirstDue(e.target.value);setPreview([])}}/></label></div>
      <button type="button" disabled={totals.unallocated<=0} onClick={()=>{try{setPreview(generateInstallments({amount:totals.unallocated,count,firstDue,startIndex:f.installments.length+1},id));setError('')}catch(err){setPreview([]);setError(err.message)}}}>Prévia das parcelas</button>
      {preview.length>0&&<><ul className="planningInstallmentPreview" aria-label="Prévia das parcelas">{preview.map(p=><li key={p.id}><span>{p.label} · {fmt(p.due)}</span><b>{money(p.amount)}</b></li>)}</ul><button type="button" className="primary" onClick={()=>change('installments',[...f.installments,...preview])}>Adicionar {preview.length} parcelas</button></>}
      <small className="planningFormHint">Quando o mês não tiver o dia escolhido, o vencimento será no último dia do mês.</small>
    </div>}</div>
    {f.installments.some(p=>p.payments?.length>0)&&<p className="planningFormHint">Para corrigir pagamentos já registrados, use Editar ou Estornar no histórico do serviço.</p>}<div className="installmentEditor">{f.installments.map((p,i)=><div className="installmentRow" key={p.id||i}>
      <input aria-label={`Nome da parcela ${i+1}`} placeholder="Ex.: Sinal" value={p.label||''} onChange={e=>setInst(i,'label',e.target.value)}/>
      <input aria-label={`Valor da parcela ${i+1}`} type="number" min="0" step="0.01" placeholder="Valor" value={p.amount} onChange={e=>setInst(i,'amount',e.target.value)}/>
      <input aria-label={`Vencimento da parcela ${i+1}`} type="date" value={p.due||''} onChange={e=>setInst(i,'due',e.target.value)}/>
      <input disabled={!!p.payments?.length} aria-label={`Valor pago da parcela ${i+1}`} type="number" min="0" step="0.01" placeholder="Pago" value={p.paidAmount||''} onChange={e=>setInst(i,'paidAmount',e.target.value)}/>
      <input disabled={!!p.payments?.length} aria-label={`Data de pagamento da parcela ${i+1}`} type="date" value={p.paidAt||''} onChange={e=>setInst(i,'paidAt',e.target.value)}/>
      <select disabled={!!p.payments?.length} aria-label={`Meio de pagamento da parcela ${i+1}`} value={p.payment||'Pix'} onChange={e=>setInst(i,'payment',e.target.value)}>{PAY.map(x=><option key={x}>{x}</option>)}</select>
      <button type="button" className="removeInstallment" aria-label={`Remover parcela ${i+1}`} onClick={()=>change('installments',f.installments.filter((_,j)=>j!==i))}>×</button>
    </div>)}</div>
    {!f.installments.length&&<div className="planningEmpty">O valor contratado ficará como saldo sem programação até você cadastrar parcelas ou registrar um pagamento.</div>}
    <label>Observação<textarea value={f.notes||''} onChange={e=>change('notes',e.target.value)}/></label>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="modalActions">{item&&<button type="button" className="danger" onClick={onDelete}>Excluir</button>}<button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="primary">Salvar</button></div>
  </form>;
}
function PaymentForm({item,onSave,onClose}) {
  const totals=expenseTotals(item),options=(item.installments||[]).filter(p=>installmentBalance(p)>0).map(p=>({id:p.id,label:p.label||'Pagamento',balance:installmentBalance(p)}));
  if(totals.unallocated>0)options.push({id:'__unallocated__',label:'Saldo sem programação',balance:totals.unallocated});
  const[selection,setSelection]=useState(options[0]?.id||''),[amount,setAmount]=useState(options[0]?.balance||''),[paidAt,setPaidAt]=useState(today),[payment,setPayment]=useState('Pix'),[error,setError]=useState('');
  const selected=options.find(p=>p.id===selection);
  return <form onSubmit={e=>{e.preventDefault();try{onSave(recordExpensePayment(item,{installmentId:selection,amount,paidAt,payment},id))}catch(err){setError(err.message)}}}>
    <h3>Registrar pagamento</h3><p className="planningPaymentIntro">{item.description} · Saldo total {money(totals.balance)}</p>
    <label>Parcela<select aria-label="Parcela" value={selection} onChange={e=>{setSelection(e.target.value);setAmount(options.find(p=>p.id===e.target.value)?.balance||'');setError('')}}>{options.map(p=><option key={p.id} value={p.id}>{p.label} · {money(p.balance)}</option>)}</select></label>
    <div className="formGrid"><label>Valor do pagamento<input autoFocus required type="number" min="0.01" max={selected?.balance||0} step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setError('')}}/></label><label>Data do pagamento<input required type="date" max={today()} value={paidAt} onChange={e=>setPaidAt(e.target.value)}/></label></div>
    <label>Meio de pagamento<select aria-label="Meio de pagamento" value={payment} onChange={e=>setPayment(e.target.value)}>{PAY.map(x=><option key={x}>{x}</option>)}</select></label>
    <p className="planningFormHint">O valor será somado aos pagamentos já registrados. O serviço será quitado quando não houver saldo.</p>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="modalActions"><button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="primary" disabled={!selected}>Registrar pagamento</button></div>
  </form>;
}
function PaymentRevisionForm({item,installmentId,paymentId,action,onSave,onClose}) {
  const installment=(item.installments||[]).find(p=>p.id===installmentId),entry=paymentHistory(installment||{}).find(h=>h.id===paymentId);
  const[f,setF]=useState({amount:entry?.amount||'',paidAt:entry?.paidAt||today(),payment:entry?.payment||'Pix',reason:''}),[error,setError]=useState('');
  const change=(key,value)=>{setF(x=>({...x,[key]:value}));setError('')};
  const reversing=action==='reverse',other=paymentHistory(installment||{}).filter(h=>h.id!==paymentId&&!h.reversedAt).reduce((sum,h)=>sum+(Number(h.amount)||0),0);
  return <form onSubmit={e=>{e.preventDefault();try{onSave(reviseExpensePayment(item,{installmentId,paymentId,action,...f}))}catch(err){setError(err.message)}}}>
    <h3>{reversing?'Estornar':'Editar'} pagamento</h3><p className="planningPaymentIntro">{item.description} · {installment?.label||'Pagamento'} · {money(entry?.amount)}</p>
    {reversing?<p className="planningFormHint">O lançamento continuará no histórico como estornado. Seu valor deixará de contar como pago e voltará ao saldo a quitar.</p>:<><div className="formGrid"><label>Valor do pagamento<input autoFocus required type="number" min="0.01" step="0.01" max={Math.max(0,(Number(installment?.amount)||0)-other).toFixed(2)} value={f.amount} onChange={e=>change('amount',e.target.value)}/></label><label>Data do pagamento<input required type="date" max={today()} value={f.paidAt} onChange={e=>change('paidAt',e.target.value)}/></label></div><label>Meio de pagamento<select aria-label="Meio de pagamento" value={f.payment} onChange={e=>change('payment',e.target.value)}>{PAY.map(x=><option key={x}>{x}</option>)}</select></label></>}
    <label>{reversing?'Motivo do estorno':'Motivo da correção (opcional)'}<textarea autoFocus={reversing} required={reversing} value={f.reason} onChange={e=>change('reason',e.target.value)}/></label>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="modalActions"><button type="button" onClick={onClose}>Cancelar</button><button type="submit" className={reversing?'danger':'primary'} disabled={!entry||!!entry.reversedAt}>{reversing?'Confirmar estorno':'Salvar correção'}</button></div>
  </form>;
}
const PERIODS=[['all','Todos os períodos'],['today','Hoje'],['next7','Próximos 7 dias'],['next30','Próximos 30 dias'],['overdue','Vencidos'],['undated','Sem data']];
const searchText=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function PeriodFilter({value,onChange,label='Período',paid=false}) {
  const options=paid?[['all','Todos os períodos'],['today','Hoje'],['last7','Últimos 7 dias'],['last30','Últimos 30 dias'],['undated','Sem data']]:PERIODS;
  return <label>{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>;
}
function DueBadge({date,currentDay}) {
  const info=deadline(date,currentDay);
  return <span className={'planningDeadline '+info.tone}>{info.label}</span>;
}
function FilterToolbar({search,onSearch,placeholder,open,onToggle,count,sort,onSort,sortLabel,options,filterId}) {
  return <div className="planningFilterToolbar"><label className="planningSearch">Buscar<input aria-label="Buscar" placeholder={placeholder} value={search} onChange={e=>onSearch(e.target.value)}/></label><button type="button" className={'planningFilterToggle '+(count?'hasFilters':'')} aria-expanded={open} aria-controls={filterId} onClick={onToggle}>Filtrar{count>0?' · '+count:''} <span aria-hidden="true">{open?'▴':'▾'}</span></button><label className="planningSort">Ordenar<select aria-label={sortLabel} value={sort} onChange={e=>onSort(e.target.value)}>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>;
}
function BudgetForm({budgets,onSave,onClose}) {
  const [values,setValues]=useState({...budgets});
  return <form onSubmit={e=>{e.preventDefault();const next={...budgets};CATS.forEach(c=>{if(values[c]==null||values[c]==='')delete next[c];else next[c]=Math.round(Number(values[c])*100)/100});onSave(next)}}>
    <h3>Orçamento por categoria</h3><p className="planningFormHint">Defina quanto pretende gastar. Deixe em branco as categorias sem limite; zero significa não reservar verba.</p>
    <div className="formGrid">{CATS.map(c=><label key={c}>{c}<input aria-label={`Orçamento de ${c}`} type="number" min="0" step="0.01" placeholder="Sem limite" value={values[c]??''} onChange={e=>setValues(v=>({...v,[c]:e.target.value}))}/></label>)}</div>
    <div className="modalActions"><button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="primary">Salvar orçamento</button></div>
  </form>;
}
function BudgetOverview({expenses,budgets,onEdit}) {
  const rows=categoryBudgets(expenses,budgets,CATS),visible=rows.filter(r=>r.budget!==null||r.contracted>0);
  const planned=rows.reduce((s,r)=>s+Math.round((r.budget||0)*100),0)/100,exceeded=rows.filter(r=>r.remaining!==null&&r.remaining<0).length;
  return <details className="planningBudget"><summary>Orçamento por categoria <span>{visible.length?money(planned)+' definido':'Definir limites'}{exceeded>0?` · ${exceeded} acima do limite`:''}</span></summary>
    <p className="planningFormHint">Compare o limite com todos os serviços contratados, incluindo os quitados. Os totais não dependem dos filtros abaixo.</p><button type="button" onClick={onEdit}>Editar orçamento</button>
    {visible.length?<div className="planningBudgetRows">{visible.map(r=><div key={r.category} className={'planningBudgetRow '+(r.remaining!==null&&r.remaining<0?'overBudget':'')}><b>{r.category}</b><span>Contratado: {money(r.contracted)}</span><span>{r.budget===null?'Sem limite definido':'Limite: '+money(r.budget)}</span>{r.budget!==null&&<><progress aria-label={`Uso do orçamento de ${r.category}`} max={Math.max(r.budget,r.contracted,1)} value={r.contracted}/><strong>{r.remaining<0?money(-r.remaining)+' acima do limite':money(r.remaining)+' disponível'}</strong></>}</div>)}</div>:<p className="planningFormHint">Defina os limites para acompanhar o orçamento do chá.</p>}
  </details>;
}
function Planning(){
  const[data,setData]=useState(readLocal),[modal,setModal]=useState(null),[sync,setSync]=useState('loading');
  const[taskSearch,setTaskSearch]=useState(''),[taskCat,setTaskCat]=useState('all'),[taskView,setTaskView]=useState('open'),[taskOwner,setTaskOwner]=useState('all'),[taskPeriod,setTaskPeriod]=useState('all'),[taskStatus,setTaskStatus]=useState('all');
  const[expenseSearch,setExpenseSearch]=useState(''),[expenseCat,setExpenseCat]=useState('all'),[expenseView,setExpenseView]=useState('open'),[expensePeriod,setExpensePeriod]=useState('all'),[expenseStatus,setExpenseStatus]=useState('all');
  const[currentDay,setCurrentDay]=useState(today);
  const[taskFiltersOpen,setTaskFiltersOpen]=useState(false),[expenseFiltersOpen,setExpenseFiltersOpen]=useState(false),[taskSort,setTaskSort]=useState('due'),[expenseSort,setExpenseSort]=useState('due');
  const ready=useRef(false),timer=useRef(null),taskPanel=useRef(null),expensePanel=useRef(null);
  useEffect(()=>{const refresh=()=>setCurrentDay(today()),clock=setInterval(refresh,60000);window.addEventListener('focus',refresh);return()=>{clearInterval(clock);window.removeEventListener('focus',refresh)}},[]);
  useEffect(()=>{let live=true;(async()=>{try{const remote=await planningApi('get');if(!live)return;if(remote.data&&Array.isArray(remote.data.tasks)&&Array.isArray(remote.data.expenses)){const n=normalize(remote.data);setData(n);localStorage.setItem(KEY,JSON.stringify(n));setSync('synced')}else{const local=readLocal();setData(local);await planningApi('save',local);if(live)setSync('synced')}}catch{if(live)setSync('offline')}finally{ready.current=true}})();return()=>{live=false;if(timer.current)clearTimeout(timer.current)}},[]);
  useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(data));if(!ready.current)return;setSync('saving');clearTimeout(timer.current);timer.current=setTimeout(async()=>{try{await planningApi('save',data);setSync('synced')}catch{setSync('offline')}},350);return()=>clearTimeout(timer.current)},[data]);
  const summary=useMemo(()=>planningSnapshot(data,currentDay),[data,currentDay]);
  const owners=[...new Set(data.tasks.map(t=>t.responsible?.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const taskCounts={open:data.tasks.filter(t=>t.status!=='done').length,done:data.tasks.filter(t=>t.status==='done').length};
  const tasks=data.tasks.filter(t=>
    (taskView==='done'?t.status==='done':t.status!=='done')&&
    (taskCat==='all'||t.category===taskCat)&&
    (taskOwner==='all'||(taskOwner==='unassigned'?!t.responsible?.trim():t.responsible?.trim()===taskOwner))&&
    searchText(`${t.title} ${t.responsible||''} ${t.notes||''}`).includes(searchText(taskSearch))&&
    matchesPeriod(t.due,taskPeriod,currentDay)&&
    (taskStatus==='all'||(taskStatus==='overdue'&&matchesPeriod(t.due,'overdue',currentDay))||(taskStatus==='undated'&&!t.due))
  ).sort((a,b)=>taskSort==='completed'?(b.completedAt||'').localeCompare(a.completedAt||''):(taskSort==='title'?a.title.localeCompare(b.title,'pt-BR'):taskSort==='priority'?({high:0,medium:1,low:2}[a.priority]??3)-({high:0,medium:1,low:2}[b.priority]??3)||(a.due||'9999').localeCompare(b.due||'9999'):(a.due||'9999').localeCompare(b.due||'9999')));
  // A service is settled only when every installment has no remaining balance.
  const allExpenses=data.expenses.map(e=>({...e,totals:expenseTotals(e,currentDay)}));
  const expenseCounts={open:allExpenses.filter(e=>e.totals.state!=='paid').length,paid:allExpenses.filter(e=>e.totals.state==='paid').length};
  const settledValue=allExpenses.filter(e=>e.totals.state==='paid').reduce((sum,e)=>sum+e.totals.paid,0);
  const expenses=allExpenses.filter(e=>{
    const settled=e.totals.state==='paid';
    if(expenseView==='paid'?!settled:settled)return false;
    if(expenseCat!=='all'&&e.category!==expenseCat)return false;
    if(!searchText(`${e.description} ${e.supplier||''} ${e.notes||''} ${(e.installments||[]).map(p=>p.label).join(' ')}`).includes(searchText(expenseSearch)))return false;
    if(expenseStatus==='overdue'&&!e.totals.overdue)return false;
    if(expenseStatus==='partial'&&!(e.totals.paid>0&&e.totals.balance>0))return false;
    if(expenseStatus==='unpaid'&&e.totals.paid>0)return false;
    if(expensePeriod==='all')return true;
    const payments=(e.installments||[]).filter(p=>settled?Number(p.paidAmount)>0:installmentBalance(p)>0);
    return payments.some(p=>matchesPeriod(settled?p.paidAt:p.due,expensePeriod,currentDay))||(expensePeriod==='undated'&&(e.totals.unallocated>0||!payments.length));
  }).sort((a,b)=>{
    const date=e=>(e.installments||[]).filter(p=>expenseView==='paid'?Number(p.paidAmount)>0:installmentBalance(p)>0).map(p=>(expenseView==='paid'?p.paidAt:p.due)||'9999').sort()[0]||'9999';
    return expenseSort==='balance'?b.totals.balance-a.totals.balance:expenseSort==='name'?a.description.localeCompare(b.description,'pt-BR'):expenseSort==='value'?b.totals.planned-a.totals.planned:date(a).localeCompare(date(b));
  });
  const clearTasks=()=>{setTaskSearch('');setTaskCat('all');setTaskOwner('all');setTaskPeriod('all');setTaskStatus('all')};
  const clearExpenses=()=>{setExpenseSearch('');setExpenseCat('all');setExpensePeriod('all');setExpenseStatus('all')};
  const focusPanel=ref=>requestAnimationFrame(()=>{ref.current?.scrollIntoView({behavior:'smooth',block:'start'});ref.current?.focus({preventScroll:true})});
  const filterAlert=(type,period)=>{
    if(type==='task'){clearTasks();setTaskView('open');setTaskPeriod(period);setTaskFiltersOpen(true);focusPanel(taskPanel)}
    else{clearExpenses();setExpenseView('open');setExpensePeriod(period);setExpenseFiltersOpen(true);focusPanel(expensePanel)}
  };
  const taskFilterCount=[taskCat!=='all',taskOwner!=='all',taskPeriod!=='all',taskStatus!=='all'].filter(Boolean).length;
  const expenseFilterCount=[expenseCat!=='all',expensePeriod!=='all',expenseStatus!=='all'].filter(Boolean).length;
  const taskFiltersActive=taskSearch||taskCat!=='all'||taskOwner!=='all'||taskPeriod!=='all'||taskStatus!=='all';
  const expenseFiltersActive=expenseSearch||expenseCat!=='all'||expensePeriod!=='all'||expenseStatus!=='all';
  const toggle=t=>setData(d=>({...d,tasks:d.tasks.map(x=>x.id===t.id?{...x,status:x.status==='done'?'todo':'done',completedAt:x.status==='done'?'':today()}:x)}));
  const saveTask=f=>{setData(d=>({...d,tasks:f.id?d.tasks.map(x=>x.id===f.id?f:x):[{...f,id:id(),status:'todo',completedAt:''},...d.tasks]}));setModal(null)};
  const saveExpense=f=>{const {totals,...expense}=f;setData(d=>({...d,expenses:expense.id?d.expenses.map(x=>x.id===expense.id?expense:x):[{...expense,id:id()},...d.expenses]}));setModal(null)};
  const alerts=[
    {type:'task',period:'overdue',tone:'overdue',count:summary.overdueTasks,value:`${summary.overdueTasks} ação${summary.overdueTasks===1?'':'s'}`,label:summary.overdueTasks===1?'atrasada':'atrasadas'},
    {type:'task',period:'next7',tone:'soon',count:summary.soonTasks,value:`${summary.soonTasks} ação${summary.soonTasks===1?'':'s'}`,label:summary.soonTasks===1?'vence em até 7 dias':'vencem em até 7 dias'},
    {type:'expense',period:'overdue',tone:'overdue',count:summary.overduePayments,value:money(summary.overdueValue),label:`vencidos · ${summary.overduePayments} pagamento(s)`},
    {type:'expense',period:'next7',tone:'soon',count:summary.soonPayments,value:money(summary.soonValue),label:`em até 7 dias · ${summary.soonPayments} pagamento(s)`}
  ];
  return <>
    <div className="planningIntro"><span className="eyebrow">PLANEJAMENTO DO EVENTO</span><h2>Organização do Chá do Oliver</h2><p>Ações, pagamentos e prazos para acompanhar até o dia do chá.</p><small className={'planningSync '+sync}>{sync==='loading'?'Carregando planejamento…':sync==='saving'?'Salvando…':sync==='synced'?'✓ Sincronizado entre dispositivos':'⚠ Offline — alterações salvas neste dispositivo'}</small></div>
    <section className="planningAttention" aria-label="Alertas do planejamento"><h3>Precisa da sua atenção</h3><p>Selecione um alerta para consultar as pendências. Os valores mostram o saldo das parcelas.</p><div className="planningAlertGrid">{alerts.map(a=><button key={a.type+a.period} type="button" disabled={!a.count} className={'planningAlertButton '+(a.count?a.tone:'clear')} onClick={()=>filterAlert(a.type,a.period)}><strong>{a.value}</strong><span>{a.label}</span>{a.count>0&&<small>Ver pendências →</small>}</button>)}</div>{!alerts.some(a=>a.count>0)&&<p className="planningAllClear">Tudo em dia: nenhuma pendência vencida ou nos próximos 7 dias.</p>}</section>
    <div className="planningSummary"><div><span>AÇÕES REALIZADAS</span><strong>{taskCounts.done}/{data.tasks.length}</strong><small>{taskCounts.open} a realizar</small></div><div><span>CONTRATADO</span><strong>{money(summary.planned)}</strong><small>total dos gastos</small></div><div><span>PAGO</span><strong>{money(summary.paid)}</strong><small>pagamentos realizados</small></div><div><span>A QUITAR</span><strong>{money(summary.open)}</strong><small>saldo dos serviços</small></div></div>
    <div className="planningColumns">
      <section className="planningPanel" ref={taskPanel} tabIndex={-1} aria-label="Ações do planejamento">
        <div className="planningPanelHead"><div><span className="eyebrow">AÇÕES</span><h3>Checklist</h3></div><button type="button" onClick={()=>setModal({type:'task'})}>+ Nova tarefa</button></div>
        <div className="filterPills planningViewSwitch" aria-label="Situação das ações">{[['open','A realizar'],['done','Realizadas']].map(([view,label])=><button key={view} type="button" aria-pressed={taskView===view} className={taskView===view?'active':''} onClick={()=>{setTaskView(view);setTaskSort(view==='done'?'completed':'due');setTaskStatus('all');setTaskPeriod('all')}}>{label} · {taskCounts[view]}</button>)}</div>
        <FilterToolbar search={taskSearch} onSearch={setTaskSearch} placeholder="Tarefa, responsável ou observação" open={taskFiltersOpen} onToggle={()=>setTaskFiltersOpen(x=>!x)} count={taskFilterCount} sort={taskSort} onSort={setTaskSort} sortLabel="Ordenar ações" filterId="planning-task-filters" options={[["due","Prazo"],["priority","Prioridade"],["title","Nome"],...(taskView==='done'?[["completed","Conclusão (recentes)"]]:[])]}/>
        {taskFiltersOpen&&<div id="planning-task-filters" className="planningFilters planningFiltersV2">
          <label>Categoria<select aria-label="Categoria" value={taskCat} onChange={e=>setTaskCat(e.target.value)}><option value="all">Todas as categorias</option>{CATS.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Responsável<select aria-label="Responsável" value={taskOwner} onChange={e=>setTaskOwner(e.target.value)}><option value="all">Todos os responsáveis</option><option value="unassigned">Sem responsável</option>{owners.map(x=><option key={x}>{x}</option>)}</select></label>
          <PeriodFilter value={taskPeriod} onChange={setTaskPeriod} label="Período do prazo"/>
          <label>Status<select aria-label="Status" value={taskStatus} onChange={e=>setTaskStatus(e.target.value)}><option value="all">{taskView==='open'?'Todas a realizar':'Todas realizadas'}</option>{taskView==='open'&&<option value="overdue">Atrasadas</option>}<option value="undated">Sem prazo</option></select></label>
        </div>}
        <div className="planningFilterMeta"><span aria-live="polite">{tasks.length} de {taskCounts[taskView]} ações</span>{taskFiltersActive&&<button type="button" className="planningClear" onClick={clearTasks}>Limpar filtros</button>}</div>
        <div className="taskList">{tasks.map(t=><article className={'taskItem '+(t.status==='done'?'done':'')} key={t.id}><button type="button" className="taskCheck" aria-label={`${t.status==='done'?'Reabrir':'Concluir'} ${t.title}`} aria-pressed={t.status==='done'} onClick={()=>toggle(t)}>{t.status==='done'?'✓':''}</button><div><b>{t.title}</b><span>{t.category} · {t.responsible||'Sem responsável'}{t.due?' · '+fmt(t.due):''}</span>{t.expenseId&&(()=>{const linked=data.expenses.find(e=>e.id===t.expenseId);if(!linked)return <span>Serviço vinculado indisponível</span>;const financial=expenseTotals(linked,currentDay);return <button type="button" className="planningTaskExpense" aria-label={`Abrir serviço ${linked.description} de ${t.title}`} onClick={()=>setModal({type:'expense',item:linked})}>{linked.description} · {financial.state==='paid'?'Quitado':'Saldo '+money(financial.balance)}</button>})()}{t.status==='done'?<span>Realizada{t.completedAt?' em '+fmt(t.completedAt):''}</span>:<DueBadge date={t.due} currentDay={currentDay}/>}</div><em className={'priority '+t.priority}>{t.priority==='high'?'Alta':t.priority==='medium'?'Média':'Baixa'}</em><button type="button" className="iconAction" aria-label={`Editar tarefa ${t.title}`} onClick={()=>setModal({type:'task',item:t})}>Editar</button></article>)}{!tasks.length&&<div className="planningEmpty">Nenhuma ação neste filtro.{taskFiltersActive?' Limpe os filtros para ampliar a consulta.':''}</div>}</div>
      </section>
      <section className="planningPanel" ref={expensePanel} tabIndex={-1} aria-label="Financeiro do planejamento">
        <div className="planningPanelHead"><div><span className="eyebrow">FINANCEIRO</span><h3>Controle de gastos</h3></div><button type="button" onClick={()=>setModal({type:'expense'})}>+ Novo gasto</button></div>
        <BudgetOverview expenses={data.expenses} budgets={data.budgets} onEdit={()=>setModal({type:'budget'})}/>
        <div className="filterPills planningViewSwitch" aria-label="Situação dos serviços">{[['open','A quitar',summary.open],['paid','Quitados',settledValue]].map(([view,label,value])=><button key={view} type="button" aria-pressed={expenseView===view} className={expenseView===view?'active':''} onClick={()=>{setExpenseView(view);setExpenseStatus('all');setExpensePeriod('all')}}>{label} · {expenseCounts[view]} · {money(value)}</button>)}</div>
        <FilterToolbar search={expenseSearch} onSearch={setExpenseSearch} placeholder="Gasto, fornecedor ou parcela" open={expenseFiltersOpen} onToggle={()=>setExpenseFiltersOpen(x=>!x)} count={expenseFilterCount} sort={expenseSort} onSort={setExpenseSort} sortLabel="Ordenar gastos" filterId="planning-expense-filters" options={[["due","Vencimento"],["balance","Maior saldo"],["name","Nome"],["value","Maior valor contratado"]]}/>
        {expenseFiltersOpen&&<div id="planning-expense-filters" className="planningFilters planningFiltersV2">
          <label>Categoria<select aria-label="Categoria" value={expenseCat} onChange={e=>setExpenseCat(e.target.value)}><option value="all">Todas as categorias</option>{CATS.map(x=><option key={x}>{x}</option>)}</select></label>
          <PeriodFilter value={expensePeriod} onChange={setExpensePeriod} paid={expenseView==='paid'} label={expenseView==='paid'?'Data do pagamento':'Período do vencimento'}/>
          {expenseView==='open'&&<label>Status do serviço<select aria-label="Status do serviço" value={expenseStatus} onChange={e=>setExpenseStatus(e.target.value)}><option value="all">Todos os status</option><option value="unpaid">Sem pagamento</option><option value="partial">Parcialmente pago</option><option value="overdue">Com parcela vencida</option></select></label>}
        </div>}
        <div className="planningFilterMeta"><span aria-live="polite">{expenses.length} de {expenseCounts[expenseView]} serviço(s)</span>{expenseFiltersActive&&<button type="button" className="planningClear" onClick={clearExpenses}>Limpar filtros</button>}</div>
        <div className="expenseList">{expenses.map(e=>{
          const next=(e.installments||[]).filter(p=>installmentBalance(p)>0&&p.due).sort((a,b)=>a.due.localeCompare(b.due))[0];
          const percent=e.totals.planned>0?Math.min(100,Math.round(e.totals.paid/e.totals.planned*100)):0;
          return <article className="planningExpenseCard" key={e.id}>
            <div className="planningExpenseHead"><div><b>{e.description}</b><span>{e.category}{e.supplier?' · '+e.supplier:''}</span><span className={'expenseStatus '+(e.totals.state==='paid'?'paid':e.totals.overdue?'overdue':'open')}>{e.totals.state==='paid'?'Quitado':e.totals.planned>0?'A quitar':'Valor a definir'}</span></div><button type="button" className="iconAction" aria-label={`Editar gasto ${e.description}`} onClick={()=>setModal({type:'expense',item:e})}>Editar</button></div>
            <div className="planningExpenseNumbers"><div><small>Contratado</small><strong>{money(e.totals.planned)}</strong></div><div><small>Pago</small><strong>{money(e.totals.paid)}</strong></div><div><small>Saldo a quitar</small><strong>{money(e.totals.balance)}</strong></div></div>
            {e.totals.planned>0&&<div className="planningPaidProgress"><progress max="100" value={percent} aria-label={`Percentual pago de ${e.description}`}/><span>{percent}% pago</span></div>}
            {next&&<div className="planningNextPayment"><span>{next.label||'Próxima parcela'} · {fmt(next.due)}</span><DueBadge date={next.due} currentDay={currentDay}/></div>}
            {e.totals.unallocated>0&&<p className="planningUnallocated">{money(e.totals.unallocated)} ainda sem programação <button type="button" onClick={()=>setModal({type:'expense',item:e})}>Programar</button></p>}
            {e.totals.balance>0&&<button type="button" className="planningRegisterPayment" aria-label={`Registrar pagamento de ${e.description}`} onClick={()=>setModal({type:'payment',item:e})}>Registrar pagamento</button>}
            <details className="planningPaymentDetails"><summary>Ver pagamentos · {(e.installments||[]).length}</summary><div className="planningPayments">
              {!(e.installments||[]).length&&<p className="planningEmpty">Nenhum pagamento programado. Edite o serviço para cadastrar parcelas.</p>}
              {(e.installments||[]).map((p,i)=>{
                const balance=installmentBalance(p),settled=balance===0&&Number(p.amount)>0;
                return <div className="planningPayment" key={p.id||i}><div><b>{p.label||'Pagamento'}</b><span>{settled?(p.paidAt?'Pago em '+fmt(p.paidAt):'Data de pagamento não informada'):(p.due?'Vencimento '+fmt(p.due):'Sem vencimento')}{settled?' · '+(p.payment||'Não informado'):''}</span>
                  {settled?<span className="expenseStatus paid">Quitado</span>:<><span className={'expenseStatus '+(Number(p.paidAmount)>0?'partial':'open')}>{Number(p.paidAmount)>0?'Pagamento parcial':'A quitar'}</span>{balance>0&&<DueBadge date={p.due} currentDay={currentDay}/>}</>}
                  {paymentHistory(p).length>0&&<ul className="planningPaymentHistory" aria-label={`Histórico de ${p.label||'pagamento'}`}>{paymentHistory(p).map(h=><li key={h.id} className={h.reversedAt?'reversed':''}>
                    <span>{money(h.amount)} · {h.paidAt?fmt(h.paidAt):'Data não informada'} · {h.payment||'Outros'}</span>
                    {h.reversedAt?<small>Estornado · {fmt(eventToday(new Date(h.reversedAt)))} · {h.reversalReason}</small>:<div className="planningHistoryActions"><button type="button" aria-label={`Editar pagamento ${h.id}`} onClick={()=>setModal({type:'revision',item:e,installmentId:p.id,paymentId:h.id,action:'edit'})}>Editar</button><button type="button" aria-label={`Estornar pagamento ${h.id}`} onClick={()=>setModal({type:'revision',item:e,installmentId:p.id,paymentId:h.id,action:'reverse'})}>Estornar</button></div>}
                    {h.changes?.length>0&&<details className="planningPaymentChanges"><summary>Correções · {h.changes.length}</summary>{h.changes.map((change,j)=><small key={j}>Anterior: {money(change.amount)} · {change.paidAt?fmt(change.paidAt):'Data não informada'} · {change.payment} · {change.reason||'Correção do lançamento'}</small>)}</details>}
                  </li>)}</ul>}

                </div><div className="planningPaymentValue"><strong>{money(settled?p.paidAmount:balance)}</strong><small>{settled?'valor pago':'saldo a quitar'}{!settled&&Number(p.paidAmount)>0?' · '+money(p.paidAmount)+' já pagos':''}</small></div></div>;
              })}
            </div></details>
          </article>;
        })}{!expenses.length&&<div className="planningEmpty">Nenhum serviço neste filtro.{expenseFiltersActive?' Limpe os filtros para ampliar a consulta.':''}</div>}</div>
      </section>
    </div>
    {modal&&<Modal onClose={()=>setModal(null)}>{modal.type==='budget'?<BudgetForm budgets={data.budgets} onSave={budgets=>{setData(d=>({...d,budgets}));setModal(null)}} onClose={()=>setModal(null)}/>:modal.type==='task'?<TaskForm item={modal.item} expenses={data.expenses} onClose={()=>setModal(null)} onSave={saveTask} onDelete={()=>{if(confirm('Excluir esta tarefa?')){setData(d=>({...d,tasks:d.tasks.filter(x=>x.id!==modal.item.id)}));setModal(null)}}}/>:modal.type==='revision'?<PaymentRevisionForm item={modal.item} installmentId={modal.installmentId} paymentId={modal.paymentId} action={modal.action} onSave={saveExpense} onClose={()=>setModal(null)}/>:modal.type==='payment'?<PaymentForm item={modal.item} onSave={saveExpense} onClose={()=>setModal(null)}/>:<ExpenseForm item={modal.item} linkedTasks={data.tasks.filter(t=>t.expenseId===modal.item?.id)} onOpenTask={t=>setModal({type:'task',item:t})} onClose={()=>setModal(null)} onSave={saveExpense} onDelete={()=>{if(confirm('Excluir este gasto?')){setData(d=>({...d,expenses:d.expenses.filter(x=>x.id!==modal.item.id),tasks:d.tasks.map(t=>t.expenseId===modal.item.id?{...t,expenseId:''}:t)}));setModal(null)}}}/>}</Modal>}
  </>;
}
let mounted=false;function mount(){if(mounted)return;const host=document.querySelector('.planningOverview');if(!host)return;mounted=true;host.innerHTML='';createRoot(host).render(<Planning/>)}document.addEventListener('admin-sections-ready',mount);window.addEventListener('pageshow',mount);new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});setTimeout(mount,100);
