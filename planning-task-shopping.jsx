import React,{useState} from 'react';
import {purchaseStatuses} from './planning-shopping.jsx';
export function TaskShopping({taskId,shopping,tasks,link,onLink,initiallyOpen=false}) {
  const [open,setOpen]=useState(initiallyOpen);
  const available=shopping.filter(item=>!taskId||item.taskId!==taskId),selected=link&&shopping.find(item=>item.id===link.id);
  const changed=link&&(!selected||(selected.taskId||'')!==link.previousTaskId);
  const previous=selected?.taskId&&tasks.find(task=>task.id===selected.taskId);
  const items=taskId?shopping.filter(item=>item.taskId===taskId):[],bought=items.filter(item=>item.status==='bought').length;
  return <details className="planningTaskShopping" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Compras desta ação · {bought} de {items.length} comprados</summary>
    <p className="planningFormHint">Os botões abaixo salvam a ação antes de abrir a compra. O status da compra não altera a conclusão da ação ou os pagamentos.</p>
    {items.length?<ul>{items.map(item=><li key={item.id}><div><b>{item.title}</b><span>{Number(item.quantity).toLocaleString('pt-BR')} {item.unit} · {item.responsible||'Sem responsável'}</span><strong>{purchaseStatuses[item.status]}</strong></div><button type="submit" data-shopping={item.id} aria-label={`Salvar ação e editar compra ${item.title}`}>Salvar e editar</button></li>)}</ul>:<p className="planningFormHint">Nenhuma compra vinculada a esta ação.</p>}
    <div className="planningExistingPurchase"><label>Compra existente<select aria-label="Compra existente" value={link?.id||''} onChange={e=>{const item=shopping.find(item=>item.id===e.target.value);onLink(item?{id:item.id,previousTaskId:item.taskId||'',confirmed:false}:null)}}><option value="">Selecionar compra cadastrada</option>{link&&!available.some(item=>item.id===link.id)&&<option value={link.id}>Compra indisponível para vínculo</option>}{available.map(item=><option key={item.id} value={item.id}>{item.title} · {item.taskId?tasks.find(task=>task.id===item.taskId)?.title||'Ação indisponível':'Sem ação vinculada'}</option>)}</select></label>
    {!available.length&&<p className="planningFormHint">Não há outras compras disponíveis para vincular.</p>}
    {selected&&<p className="planningFormHint">{Number(selected.quantity).toLocaleString('pt-BR')} {selected.unit} · {purchaseStatuses[selected.status]} · {selected.responsible||'Sem responsável'}</p>}
    {selected?.taskId&&<><p className="planningPurchaseTransfer">Vínculo atual: <b>{previous?.title||'Ação indisponível'}</b>. A transferência remove esta compra da ação anterior.</p><label className="checkLine"><input type="checkbox" aria-label="Confirmar transferência da compra" checked={!!link.confirmed} onChange={e=>onLink({...link,confirmed:e.target.checked})}/> Confirmo transferir esta compra para a ação aberta.</label></>}
    {changed&&<p className="error" role="alert">A compra ou seu vínculo foi alterado. Selecione novamente.</p>}
    <button type="submit" data-link-shopping={link?.id||''} data-previous-task={link?.previousTaskId||''} disabled={!selected||changed||!!selected.taskId&&!link.confirmed}>{selected?.taskId?'Salvar e transferir compra':'Salvar e vincular compra'}</button>
    </div>
    <button type="submit" data-shopping="__new__" disabled={shopping.length>=500}>Salvar e adicionar compra</button>
  </details>;
}
