import React from 'react';
import {purchaseStatuses} from './planning-shopping.jsx';
export function TaskShopping({taskId,shopping}) {
  const items=taskId?shopping.filter(item=>item.taskId===taskId):[],bought=items.filter(item=>item.status==='bought').length;
  return <details className="planningTaskShopping"><summary>Compras desta ação · {bought} de {items.length} comprados</summary>
    <p className="planningFormHint">Os botões abaixo salvam a ação antes de abrir a compra. O status da compra não altera a conclusão da ação ou os pagamentos.</p>
    {items.length?<ul>{items.map(item=><li key={item.id}><div><b>{item.title}</b><span>{Number(item.quantity).toLocaleString('pt-BR')} {item.unit} · {item.responsible||'Sem responsável'}</span><strong>{purchaseStatuses[item.status]}</strong></div><button type="submit" data-shopping={item.id} aria-label={`Salvar ação e editar compra ${item.title}`}>Salvar e editar</button></li>)}</ul>:<p className="planningFormHint">Nenhuma compra vinculada a esta ação.</p>}
    <button type="submit" data-shopping="__new__" disabled={shopping.length>=500}>Salvar e adicionar compra</button>
  </details>;
}
