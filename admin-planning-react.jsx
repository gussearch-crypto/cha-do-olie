import React,{useEffect,useMemo,useRef,useState}from'react';import{createRoot}from'react-dom/client';
import {eventToday, matchesPeriod, deadline, installmentBalance, expenseTotals, planningSnapshot} from './planning-utils.mjs';
import './admin-planning.css';
const KEY='oliverEventPlanningV2',API=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/planning-api';
const CATS=['Local','Alimentação','Bebidas','Decoração','Convites','Lembrancinhas','Bolo e doces','Foto/Vídeo','Estrutura','Outros'],PAY=['Pix','Débito','Crédito','Dinheiro','Outros'];
const seed={tasks:[{id:'t1',title:'Fechar quantidade final de convidados',category:'Convites',due:'2026-11-20',status:'todo',priority:'high',responsible:'',notes:'',cost:false},{id:'t2',title:'Definir cardápio e quantidades',category:'Alimentação',due:'2026-11-20',status:'todo',priority:'high',responsible:'',notes:'',cost:true},{id:'t3',title:'Confirmar decoração e montagem',category:'Decoração',due:'2026-11-27',status:'todo',priority:'medium',responsible:'',notes:'',cost:true}],expenses:[]};
const normalize=d=>({tasks:(d?.tasks||[]).map(t=>({...t,completedAt:t.completedAt||''})),expenses:(d?.expenses||[]).map(e=>({...e,installments:Array.isArray(e.installments)?e.installments:(e.planned||e.paid||e.due?[{id:'legacy-'+e.id,label:'Pagamento',amount:Number(e.planned)||0,due:e.due||'',paidAmount:Number(e.paid)||0,paidAt:Number(e.paid)>0?(e.due||''):'',payment:e.payment||'Pix'}]:[])}))});
const readLocal=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return normalize(x&&Array.isArray(x.tasks)&&Array.isArray(x.expenses)?x:seed)}catch{return normalize(seed)}};
const planningApi=async(action,data)=>{const adminCode=sessionStorage.getItem('oliverAdmin')||'';if(!API||!adminCode)throw new Error('not_configured');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,adminCode,data})}),j=await r.json();if(!r.ok)throw new Error(j.error||'planning_error');return j};
const money=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),id=()=>crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('pt-BR'):'',today=eventToday;
function Modal({children,onClose}){useEffect(()=>{const h=e=>e.key==='Escape'&&onClose();document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[onClose]);return <div className="planningModal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="planningDialog">{children}</div></div>}
function TaskForm({item,onSave,onDelete,onClose}){const[f,setF]=useState(item||{title:'',category:'Outros',due:'',priority:'medium',responsible:'',notes:'',cost:false});const change=(k,v)=>setF(x=>({...x,[k]:v}));return <form onSubmit={e=>{e.preventDefault();if(f.title.trim())onSave({...f,title:f.title.trim()})}}><h3>{item?'Editar':'Nova'} tarefa</h3><label>Tarefa<input autoFocus required value={f.title} onChange={e=>change('title',e.target.value)}/></label><div className="formGrid"><label>Categoria<select value={f.category} onChange={e=>change('category',e.target.value)}>{CATS.map(x=><option key={x}>{x}</option>)}</select></label><label>Prazo<input type="date" value={f.due} onChange={e=>change('due',e.target.value)}/></label><label>Prioridade<select value={f.priority} onChange={e=>change('priority',e.target.value)}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label>Responsável<input value={f.responsible} onChange={e=>change('responsible',e.target.value)}/></label></div><label>Observação<textarea value={f.notes} onChange={e=>change('notes',e.target.value)}/></label><label className="checkLine"><input type="checkbox" checked={!!f.cost} onChange={e=>change('cost',e.target.checked)}/> Esta tarefa envolve um gasto</label><div className="modalActions">{item&&<button type="button" className="danger" onClick={onDelete}>Excluir</button>}<button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="primary">Salvar</button></div></form>}
function ExpenseForm({item,onSave,onDelete,onClose}){const base=item||{description:'',category:'Outros',supplier:'',notes:'',installments:[]};const[f,setF]=useState({...base,installments:(base.installments||[]).map(x=>({...x}))});const change=(k,v)=>setF(x=>({...x,[k]:v})),add=()=>change('installments',[...f.installments,{id:id(),label:`Parcela ${f.installments.length+1}`,amount:'',due:'',paidAmount:0,paidAt:'',payment:'Pix'}]),setInst=(i,k,v)=>change('installments',f.installments.map((x,j)=>j===i?{...x,[k]:v}:x)),remove=i=>change('installments',f.installments.filter((_,j)=>j!==i));const total=f.installments.reduce((a,x)=>a+(Number(x.amount)||0),0);return <form onSubmit={e=>{e.preventDefault();if(!f.description.trim())return;onSave({...f,description:f.description.trim(),installments:f.installments.map(x=>({...x,amount:Number(x.amount)||0,paidAmount:Number(x.paidAmount)||0})),planned:total,paid:f.installments.reduce((a,x)=>a+(Number(x.paidAmount)||0),0)})}}><h3>{item?'Editar':'Novo'} gasto</h3><label>Descrição<input autoFocus required value={f.description} onChange={e=>change('description',e.target.value)}/></label><div className="formGrid"><label>Categoria<select value={f.category} onChange={e=>change('category',e.target.value)}>{CATS.map(x=><option key={x}>{x}</option>)}</select></label><label>Fornecedor<input value={f.supplier||''} onChange={e=>change('supplier',e.target.value)}/></label></div><div className="installmentHead"><div><b>Pagamentos / parcelas</b><small>Total contratado: {money(total)}</small></div><button type="button" onClick={add}>+ Adicionar pagamento</button></div><div className="installmentEditor">{f.installments.map((p,i)=><div className="installmentRow" key={p.id||i}><input placeholder="Ex.: Sinal" value={p.label||''} onChange={e=>setInst(i,'label',e.target.value)}/><input type="number" min="0" step="0.01" placeholder="Valor" value={p.amount} onChange={e=>setInst(i,'amount',e.target.value)}/><input type="date" value={p.due||''} onChange={e=>setInst(i,'due',e.target.value)}/><input type="number" min="0" step="0.01" placeholder="Pago" value={p.paidAmount||''} onChange={e=>setInst(i,'paidAmount',e.target.value)}/><input type="date" title="Data do pagamento" value={p.paidAt||''} onChange={e=>setInst(i,'paidAt',e.target.value)}/><select value={p.payment||'Pix'} onChange={e=>setInst(i,'payment',e.target.value)}>{PAY.map(x=><option key={x}>{x}</option>)}</select><button type="button" className="removeInstallment" onClick={()=>remove(i)}>×</button></div>)}</div>{!f.installments.length&&<div className="planningEmpty">Adicione o sinal ou a primeira parcela deste gasto.</div>}<label>Observação<textarea value={f.notes||''} onChange={e=>change('notes',e.target.value)}/></label><div className="modalActions">{item&&<button type="button" className="danger" onClick={onDelete}>Excluir</button>}<button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="primary">Salvar</button></div></form>}
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
function Planning(){
  const[data,setData]=useState(readLocal),[modal,setModal]=useState(null),[sync,setSync]=useState('loading');
  const[taskSearch,setTaskSearch]=useState(''),[taskCat,setTaskCat]=useState('all'),[taskView,setTaskView]=useState('open'),[taskOwner,setTaskOwner]=useState('all'),[taskPeriod,setTaskPeriod]=useState('all'),[taskStatus,setTaskStatus]=useState('all');
  const[expenseSearch,setExpenseSearch]=useState(''),[expenseCat,setExpenseCat]=useState('all'),[expenseView,setExpenseView]=useState('open'),[expensePeriod,setExpensePeriod]=useState('all'),[expenseStatus,setExpenseStatus]=useState('all');
  const[currentDay,setCurrentDay]=useState(today);
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
  ).sort((a,b)=>taskView==='done'?(b.completedAt||'').localeCompare(a.completedAt||''):(a.due||'9999').localeCompare(b.due||'9999'));
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
    return payments.some(p=>matchesPeriod(settled?p.paidAt:p.due,expensePeriod,currentDay))||(!payments.length&&expensePeriod==='undated');
  }).sort((a,b)=>{
    const date=e=>(e.installments||[]).filter(p=>expenseView==='paid'?Number(p.paidAmount)>0:installmentBalance(p)>0).map(p=>(expenseView==='paid'?p.paidAt:p.due)||'9999').sort()[0]||'9999';
    return date(a).localeCompare(date(b));
  });
  const clearTasks=()=>{setTaskSearch('');setTaskCat('all');setTaskOwner('all');setTaskPeriod('all');setTaskStatus('all')};
  const clearExpenses=()=>{setExpenseSearch('');setExpenseCat('all');setExpensePeriod('all');setExpenseStatus('all')};
  const focusPanel=ref=>requestAnimationFrame(()=>{ref.current?.scrollIntoView({behavior:'smooth',block:'start'});ref.current?.focus({preventScroll:true})});
  const filterAlert=(type,period)=>{
    if(type==='task'){clearTasks();setTaskView('open');setTaskPeriod(period);focusPanel(taskPanel)}
    else{clearExpenses();setExpenseView('open');setExpensePeriod(period);focusPanel(expensePanel)}
  };
  const taskFiltersActive=taskSearch||taskCat!=='all'||taskOwner!=='all'||taskPeriod!=='all'||taskStatus!=='all';
  const expenseFiltersActive=expenseSearch||expenseCat!=='all'||expensePeriod!=='all'||expenseStatus!=='all';
  const toggle=t=>setData(d=>({...d,tasks:d.tasks.map(x=>x.id===t.id?{...x,status:x.status==='done'?'todo':'done',completedAt:x.status==='done'?'':today()}:x)}));
  const saveTask=f=>{setData(d=>({...d,tasks:f.id?d.tasks.map(x=>x.id===f.id?f:x):[{...f,id:id(),status:'todo',completedAt:''},...d.tasks]}));setModal(null)};
  const saveExpense=f=>{setData(d=>({...d,expenses:f.id?d.expenses.map(x=>x.id===f.id?f:x):[{...f,id:id()},...d.expenses]}));setModal(null)};
  const alerts=[
    {type:'task',period:'overdue',tone:'overdue',count:summary.overdueTasks,value:`${summary.overdueTasks} ação${summary.overdueTasks===1?'':'s'}`,label:summary.overdueTasks===1?'atrasada':'atrasadas'},
    {type:'task',period:'next7',tone:'soon',count:summary.soonTasks,value:`${summary.soonTasks} ação${summary.soonTasks===1?'':'s'}`,label:summary.soonTasks===1?'vence em até 7 dias':'vencem em até 7 dias'},
    {type:'expense',period:'overdue',tone:'overdue',count:summary.overduePayments,value:money(summary.overdueValue),label:`vencidos · ${summary.overduePayments} pagamento(s)`},
    {type:'expense',period:'next7',tone:'soon',count:summary.soonPayments,value:money(summary.soonValue),label:`em até 7 dias · ${summary.soonPayments} pagamento(s)`}
  ];
  return <>
    <div className="planningIntro"><span className="eyebrow">PLANEJAMENTO DO EVENTO</span><h2>Organização do Chá do Oliver</h2><p>Ações, pagamentos e prazos para acompanhar até o dia do chá.</p><small className={'planningSync '+sync}>{sync==='loading'?'Carregando planejamento…':sync==='saving'?'Salvando…':sync==='synced'?'✓ Sincronizado entre dispositivos':'⚠ Offline — alterações salvas neste dispositivo'}</small></div>
    <section className="planningAttention" aria-label="Alertas do planejamento"><h3>Precisa da sua atenção</h3><p>Selecione um alerta para consultar as pendências. Os valores mostram o saldo das parcelas.</p><div className="planningAlertGrid">{alerts.map(a=><button key={a.type+a.period} type="button" disabled={!a.count} className={'planningAlertButton '+(a.count?a.tone:'clear')} onClick={()=>filterAlert(a.type,a.period)}><strong>{a.value}</strong><span>{a.label}</span>{a.count>0&&<small>Ver pendências →</small>}</button>)}</div>{!alerts.some(a=>a.count>0)&&<p className="planningAllClear">Tudo em dia: nenhuma pendência vencida ou nos próximos 7 dias.</p>}</section>
    <div className="planningSummary"><div><span>AÇÕES REALIZADAS</span><strong>{taskCounts.done}/{data.tasks.length}</strong><small>{taskCounts.open} a realizar</small></div><div><span>CONTRATADO</span><strong>{money(summary.planned)}</strong><small>total dos gastos</small></div><div><span>PAGO</span><strong>{money(summary.paid)}</strong><small>pagamentos realizados</small></div><div><span>A QUITAR</span><strong>{money(summary.open)}</strong><small>saldo das parcelas</small></div></div>
    <div className="planningColumns">
      <section className="planningPanel" ref={taskPanel} tabIndex={-1} aria-label="Ações do planejamento">
        <div className="planningPanelHead"><div><span className="eyebrow">AÇÕES</span><h3>Checklist</h3></div><button type="button" onClick={()=>setModal({type:'task'})}>+ Nova tarefa</button></div>
        <div className="filterPills planningViewSwitch" aria-label="Situação das ações">{[['open','A realizar'],['done','Realizadas']].map(([view,label])=><button key={view} type="button" aria-pressed={taskView===view} className={taskView===view?'active':''} onClick={()=>{setTaskView(view);setTaskStatus('all');setTaskPeriod('all')}}>{label} · {taskCounts[view]}</button>)}</div>
        <div className="planningFilters planningFiltersV2">
          <label className="planningSearch">Buscar<input aria-label="Buscar" placeholder="Tarefa, responsável ou observação" value={taskSearch} onChange={e=>setTaskSearch(e.target.value)}/></label>
          <label>Categoria<select aria-label="Categoria" value={taskCat} onChange={e=>setTaskCat(e.target.value)}><option value="all">Todas as categorias</option>{CATS.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Responsável<select aria-label="Responsável" value={taskOwner} onChange={e=>setTaskOwner(e.target.value)}><option value="all">Todos os responsáveis</option><option value="unassigned">Sem responsável</option>{owners.map(x=><option key={x}>{x}</option>)}</select></label>
          <PeriodFilter value={taskPeriod} onChange={setTaskPeriod} label="Período do prazo"/>
          <label>Status<select aria-label="Status" value={taskStatus} onChange={e=>setTaskStatus(e.target.value)}><option value="all">{taskView==='open'?'Todas a realizar':'Todas realizadas'}</option>{taskView==='open'&&<option value="overdue">Atrasadas</option>}<option value="undated">Sem prazo</option></select></label>
        </div>
        <div className="planningFilterMeta"><span aria-live="polite">{tasks.length} de {taskCounts[taskView]} ações</span>{taskFiltersActive&&<button type="button" className="planningClear" onClick={clearTasks}>Limpar filtros</button>}</div>
        <div className="taskList">{tasks.map(t=><article className={'taskItem '+(t.status==='done'?'done':'')} key={t.id}><button type="button" className="taskCheck" aria-label={`${t.status==='done'?'Reabrir':'Concluir'} ${t.title}`} aria-pressed={t.status==='done'} onClick={()=>toggle(t)}>{t.status==='done'?'✓':''}</button><div><b>{t.title}</b><span>{t.category} · {t.responsible||'Sem responsável'}{t.due?' · '+fmt(t.due):''}</span>{t.status==='done'?<span>Realizada{t.completedAt?' em '+fmt(t.completedAt):''}</span>:<DueBadge date={t.due} currentDay={currentDay}/>}</div><em className={'priority '+t.priority}>{t.priority==='high'?'Alta':t.priority==='medium'?'Média':'Baixa'}</em><button type="button" className="iconAction" aria-label={`Editar tarefa ${t.title}`} onClick={()=>setModal({type:'task',item:t})}>Editar</button></article>)}{!tasks.length&&<div className="planningEmpty">Nenhuma ação neste filtro.{taskFiltersActive?' Limpe os filtros para ampliar a consulta.':''}</div>}</div>
      </section>
      <section className="planningPanel" ref={expensePanel} tabIndex={-1} aria-label="Financeiro do planejamento">
        <div className="planningPanelHead"><div><span className="eyebrow">FINANCEIRO</span><h3>Controle de gastos</h3></div><button type="button" onClick={()=>setModal({type:'expense'})}>+ Novo gasto</button></div>
        <div className="filterPills planningViewSwitch" aria-label="Situação dos serviços">{[['open','A quitar',summary.open],['paid','Quitados',settledValue]].map(([view,label,value])=><button key={view} type="button" aria-pressed={expenseView===view} className={expenseView===view?'active':''} onClick={()=>{setExpenseView(view);setExpenseStatus('all');setExpensePeriod('all')}}>{label} · {expenseCounts[view]} · {money(value)}</button>)}</div>
        <div className="planningFilters planningFiltersV2">
          <label className="planningSearch">Buscar<input aria-label="Buscar" placeholder="Gasto, fornecedor ou parcela" value={expenseSearch} onChange={e=>setExpenseSearch(e.target.value)}/></label>
          <label>Categoria<select aria-label="Categoria" value={expenseCat} onChange={e=>setExpenseCat(e.target.value)}><option value="all">Todas as categorias</option>{CATS.map(x=><option key={x}>{x}</option>)}</select></label>
          <PeriodFilter value={expensePeriod} onChange={setExpensePeriod} paid={expenseView==='paid'} label={expenseView==='paid'?'Data do pagamento':'Período do vencimento'}/>
          {expenseView==='open'&&<label>Status do serviço<select aria-label="Status do serviço" value={expenseStatus} onChange={e=>setExpenseStatus(e.target.value)}><option value="all">Todos os status</option><option value="unpaid">Sem pagamento</option><option value="partial">Parcialmente pago</option><option value="overdue">Com parcela vencida</option></select></label>}
        </div>
        <div className="planningFilterMeta"><span aria-live="polite">{expenses.length} de {expenseCounts[expenseView]} serviço(s)</span>{expenseFiltersActive&&<button type="button" className="planningClear" onClick={clearExpenses}>Limpar filtros</button>}</div>
        <div className="expenseList">{expenses.map(e=><article className="planningExpenseCard" key={e.id}>
          <div className="planningExpenseHead"><div><b>{e.description}</b><span>{e.category}{e.supplier?' · '+e.supplier:''}</span><span className={'expenseStatus '+(e.totals.state==='paid'?'paid':'open')}>{e.totals.state==='paid'?'Quitado':e.totals.planned>0?'A quitar':'Valor a definir'}</span></div><button type="button" className="iconAction" aria-label={`Editar gasto ${e.description}`} onClick={()=>setModal({type:'expense',item:e})}>Editar</button></div>
          <p className="planningExpenseTotals">Contratado {money(e.totals.planned)} · Pago {money(e.totals.paid)} · Saldo {money(e.totals.balance)}</p>
          <div className="planningPayments">{!(e.installments||[]).length&&<p className="planningEmpty">Gasto sem valor definido. Edite para adicionar um pagamento.</p>}{(e.installments||[]).map((p,i)=>{
            const balance=installmentBalance(p),settled=balance===0&&Number(p.amount)>0;
            return <div className="planningPayment" key={p.id||i}><div><b>{p.label||'Pagamento'}</b>
              <span>{settled?(p.paidAt?'Pago em '+fmt(p.paidAt):'Data de pagamento não informada'):(p.due?'Vencimento '+fmt(p.due):'Sem vencimento')}{settled?' · '+(p.payment||'Não informado'):''}</span>
              {settled?<span className="expenseStatus paid">Quitado</span>:<><span className={'expenseStatus '+(Number(p.paidAmount)>0?'partial':'open')}>{Number(p.paidAmount)>0?'Pagamento parcial':'A quitar'}</span>{balance>0&&<DueBadge date={p.due} currentDay={currentDay}/>}</>}
            </div><div className="planningPaymentValue"><strong>{money(settled?p.paidAmount:balance)}</strong><small>{settled?'valor pago':'saldo a quitar'}{!settled&&Number(p.paidAmount)>0?' · '+money(p.paidAmount)+' já pagos':''}</small></div></div>;
          })}</div>
        </article>)}{!expenses.length&&<div className="planningEmpty">Nenhum serviço neste filtro.{expenseFiltersActive?' Limpe os filtros para ampliar a consulta.':''}</div>}</div>
      </section>
    </div>
    {modal&&<Modal onClose={()=>setModal(null)}>{modal.type==='task'?<TaskForm item={modal.item} onClose={()=>setModal(null)} onSave={saveTask} onDelete={()=>{if(confirm('Excluir esta tarefa?')){setData(d=>({...d,tasks:d.tasks.filter(x=>x.id!==modal.item.id)}));setModal(null)}}}/>:<ExpenseForm item={modal.item} onClose={()=>setModal(null)} onSave={saveExpense} onDelete={()=>{if(confirm('Excluir este gasto?')){setData(d=>({...d,expenses:d.expenses.filter(x=>x.id!==modal.item.id)}));setModal(null)}}}/>}</Modal>}
  </>;
}
let mounted=false;function mount(){if(mounted)return;const host=document.querySelector('.planningOverview');if(!host)return;mounted=true;host.innerHTML='';createRoot(host).render(<Planning/>)}document.addEventListener('admin-sections-ready',mount);window.addEventListener('pageshow',mount);new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});setTimeout(mount,100);
