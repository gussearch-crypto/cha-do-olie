export const shoppingStatuses={pending:'A comprar',ordered:'Encomendado',bought:'Comprado'};
const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterShopping(items,tasks,{search='',status='all',owner='all',action='all'}={}) {
  const map=new Map(tasks.map(t=>[t.id,t]));
  return items.filter(i=>(status==='all'||i.status===status)&&(owner==='all'||(owner==='unassigned'?!i.responsible?.trim():i.responsible===owner))&&(action==='all'||action==='unlinked'&&!i.taskId||action==='unavailable'&&i.taskId&&!map.has(i.taskId)||action.startsWith('id:')&&i.taskId===action.slice(3))&&clean([i.title,i.responsible,i.notes,map.get(i.taskId)?.title].join(' ')).includes(clean(search.trim())));
}

export function linkExistingPurchase(data,task,purchaseId,previousTaskId='') {
  const purchase=(data.shopping||[]).find(item=>item.id===purchaseId);
  if(!purchase)throw new Error('Esta compra não está mais disponível. Selecione outro item.');
  if((purchase.taskId||'')!==previousTaskId)throw new Error('O vínculo desta compra foi alterado. Selecione o item novamente antes de vincular.');
  if(!task.id||!task.title?.trim())throw new Error('Preencha a ação antes de vincular uma compra.');
  if(purchase.taskId===task.id)throw new Error('Esta compra já está vinculada à ação.');
  const exists=data.tasks.some(item=>item.id===task.id);
  if(!exists&&data.tasks.length>=500)throw new Error('O planejamento atingiu 500 ações.');
  return {...data,tasks:exists?data.tasks.map(item=>item.id===task.id?task:item):[task,...data.tasks],shopping:data.shopping.map(item=>item.id===purchaseId?{...item,taskId:task.id}:item)};
}

export function updatePurchaseStatus(data,purchaseId,status,expectedStatus) {
  if(!Object.hasOwn(shoppingStatuses,status))throw new Error('Selecione um status válido para a compra.');
  const item=data.shopping.find(item=>item.id===purchaseId);
  if(!item)throw new Error('Esta compra não está mais disponível.');
  if(expectedStatus!==undefined&&item.status!==expectedStatus)throw new Error('O status desta compra foi alterado. Confira o status atual antes de continuar.');
  if(item.status===status)return data;
  return {...data,shopping:data.shopping.map(item=>item.id===purchaseId?{...item,status}:item)};
}
