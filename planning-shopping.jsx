import React,{useState} from 'react';
import {RecordHistory} from './planning-history.jsx';
import {filterShopping,shoppingStatuses} from './planning-shopping-utils.mjs';
import {ShoppingPrint} from './planning-shopping-print.jsx';
export const purchaseStatuses=shoppingStatuses;
export function ShoppingForm({item,tasks,expenses,history,onSave,onDelete,onClose}) {
  const [f,setF]=useState({title:'',quantity:1,unit:'unidades',responsible:'',status:'pending',taskId:'',expenseId:'',notes:'',...item});
  const change=(key,value)=>setF(x=>({...x,[key]:value}));
  return <form onSubmit={e=>{e.preventDefault();if(f.title.trim())onSave({...f,title:f.title.trim(),quantity:Number(f.quantity)})}}><h3>{item?.id?'Editar compra':'Nova compra'}</h3>
    <label>Item<input required maxLength={200} value={f.title} onChange={e=>change('title',e.target.value)}/></label>
    <div className="formGrid"><label>Quantidade<input type="number" required min="0.001" max="1000000" step="0.001" value={f.quantity} onChange={e=>change('quantity',e.target.value)}/></label><label>Unidade<input required maxLength={40} value={f.unit} onChange={e=>change('unit',e.target.value)}/></label></div>
    <label>Responsável<input maxLength={120} value={f.responsible} onChange={e=>change('responsible',e.target.value)}/></label>
    <label>Status da compra<select aria-label="Status da compra" value={f.status} onChange={e=>change('status',e.target.value)}>{Object.entries(purchaseStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label>Ação vinculada<select aria-label="Ação vinculada" value={f.taskId} onChange={e=>change('taskId',e.target.value)}><option value="">Não vincular ação</option>{f.taskId&&!tasks.some(t=>t.id===f.taskId)&&<option value={f.taskId}>Ação indisponível</option>}{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
    <label>Serviço vinculado<select aria-label="Serviço vinculado" value={f.expenseId} onChange={e=>change('expenseId',e.target.value)}><option value="">Não vincular serviço</option>{f.expenseId&&!expenses.some(t=>t.id===f.expenseId)&&<option value={f.expenseId}>Serviço indisponível</option>}{expenses.map(t=><option key={t.id} value={t.id}>{t.description}</option>)}</select></label>
    <p className="planningFormHint">O vínculo permite consultar o financeiro. O status da compra não registra pagamento nem altera a conclusão da ação.</p>
    <label>Observação<textarea maxLength={1500} value={f.notes} onChange={e=>change('notes',e.target.value)}/></label>
    <RecordHistory entries={history} section="shopping" recordId={item?.id}/>
    <div className="modalActions">{item?.id&&<button type="button" className="danger" onClick={onDelete}>Excluir</button>}<button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="primary">Salvar</button></div>
  </form>;
}
export function ShoppingList({items,tasks,expenses,onEdit,onTask,onExpense}) {
  const [search,setSearch]=useState(''),[status,setStatus]=useState('all'),[owner,setOwner]=useState('all'),[action,setAction]=useState('all'),[printOpen,setPrintOpen]=useState(false);
  const owners=[...new Set(items.map(i=>i.responsible).filter(value=>value?.trim()))].sort();
  const rows=filterShopping(items,tasks,{search,status,owner,action});
  const active=!!search.trim()||status!=='all'||owner!=='all'||action!=='all';
  const actionLabel=action==='unlinked'?'Sem ação vinculada':action==='unavailable'?'Ação indisponível':tasks.find(t=>'id:'+t.id===action)?.title||'Ação indisponível';
  const description=[search.trim()?'Busca: '+search.trim():'',status!=='all'?'Status: '+purchaseStatuses[status]:'',owner!=='all'?'Responsável: '+(owner==='unassigned'?'Sem responsável':owner):'',action!=='all'?'Ação: '+actionLabel:''].filter(Boolean).join(' · ');
  return <section className="planningShopping" aria-label="Lista de compras"><p className="planningFormHint">{items.filter(i=>i.status==='bought').length} de {items.length} itens comprados</p>
    <label>Buscar compras<input type="search" placeholder="Item, ação ou responsável" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <details className="planningShoppingFilters"><summary>Filtros da lista</summary><div className="formGrid"><label>Status da compra<select aria-label="Status da compra" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todos</option>{Object.entries(purchaseStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Responsável pela compra<select aria-label="Responsável pela compra" value={owner} onChange={e=>setOwner(e.target.value)}><option value="all">Todos</option><option value="unassigned">Sem responsável</option>{owners.map(o=><option key={o}>{o}</option>)}</select></label><label>Ação da compra<select aria-label="Ação da compra" value={action} onChange={e=>setAction(e.target.value)}><option value="all">Todas as ações</option><option value="unlinked">Sem ação vinculada</option><option value="unavailable">Ação indisponível</option>{action.startsWith('id:')&&!tasks.some(t=>'id:'+t.id===action)&&<option value={action}>Ação selecionada indisponível</option>}{tasks.map(t=><option key={t.id} value={'id:'+t.id}>{t.title}</option>)}</select></label></div></details>
    <div className="planningFilterMeta"><span role="status">{rows.length} de {items.length} itens</span>{active&&<button type="button" onClick={()=>{setSearch('');setStatus('all');setOwner('all');setAction('all')}}>Limpar filtros</button>}</div>
    <div className="planningShoppingList">{rows.map(i=>{const task=tasks.find(t=>t.id===i.taskId),expense=expenses.find(e=>e.id===i.expenseId);return <article className="planningShoppingItem" key={i.id}><div><b>{i.title}</b><span>{Number(i.quantity).toLocaleString('pt-BR')} {i.unit} · {i.responsible||'Sem responsável'}</span><strong>{purchaseStatuses[i.status]}</strong>{i.taskId&&(task?<button type="button" onClick={()=>onTask(task)}>Ação: {task.title}</button>:<span>Ação indisponível · revise o vínculo</span>)}{i.expenseId&&(expense?<button type="button" onClick={()=>onExpense(expense)}>Serviço: {expense.description}</button>:<span>Serviço indisponível · revise o vínculo</span>)}</div><button type="button" aria-label={`Editar compra ${i.title}`} onClick={()=>onEdit(i)}>Editar</button></article>})}{!rows.length&&<p className="planningEmpty">{items.length?'Nenhuma compra neste filtro.':'Adicione os itens que precisam ser comprados para o chá.'}</p>}</div>
    <div className="planningSchedulePrintAction"><button type="button" disabled={!items.length} onClick={()=>setPrintOpen(true)}>Imprimir / salvar PDF</button></div>
    {printOpen&&<ShoppingPrint all={items} filtered={rows} tasks={tasks} expenses={expenses} hasFilters={active} filterDescription={description} onClose={()=>setPrintOpen(false)}/>}
  </section>;
}
