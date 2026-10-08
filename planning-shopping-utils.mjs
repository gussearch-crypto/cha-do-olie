export const shoppingStatuses={pending:'A comprar',ordered:'Encomendado',bought:'Comprado'};
const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterShopping(items,tasks,{search='',status='all',owner='all',action='all'}={}) {
  const map=new Map(tasks.map(t=>[t.id,t]));
  return items.filter(i=>(status==='all'||i.status===status)&&(owner==='all'||(owner==='unassigned'?!i.responsible?.trim():i.responsible===owner))&&(action==='all'||action==='unlinked'&&!i.taskId||action==='unavailable'&&i.taskId&&!map.has(i.taskId)||action.startsWith('id:')&&i.taskId===action.slice(3))&&clean([i.title,i.responsible,i.notes,map.get(i.taskId)?.title].join(' ')).includes(clean(search.trim())));
}
