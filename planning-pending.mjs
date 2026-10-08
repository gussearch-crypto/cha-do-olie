import {daysUntil,taskDependencies} from './planning-utils.mjs';
export const responsibleKey=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function planningResponsibles(data) {
  const names=new Map();
  for(const item of [...(data.tasks||[]),...(data.shopping||[])]){const name=item.responsible?.trim();if(name&&!names.has(responsibleKey(name)))names.set(responsibleKey(name),name)}
  return [...names].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
}
export function personalPending(data,today,{owner='__all__',type='all',period='all'}={}) {
  const tasks=data.tasks||[],taskMap=new Map(tasks.map(t=>[t.id,t]));
  const hasSchedule=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t.eventTime||'')&&daysUntil(t.eventDate,today)!==null;
  const earliest=dates=>dates.filter(date=>daysUntil(date,today)!==null).sort()[0]||'';
  const rows=tasks.filter(t=>t.status!=='done').map(t=>{
    const scheduled=hasSchedule(t);
    return {key:'task:'+t.id,type:scheduled?'schedule':'tasks',item:t,title:t.title,date:earliest([t.due,scheduled?t.eventDate:'']),dateSource:'task',blocked:taskDependencies(t,tasks).length>0};
  });
  for(const item of data.shopping||[]){if(item.status==='bought')continue;const task=taskMap.get(item.taskId),date=task?earliest([task.due,hasSchedule(task)?task.eventDate:'']):'';rows.push({key:'shopping:'+item.id,type:'shopping',item,title:item.title,date,dateSource:'linkedTask',linkedTask:task,blocked:false})}
  return rows.filter(row=>{
    const days=daysUntil(row.date,today),name=responsibleKey(row.item.responsible);
    return (owner==='__all__'||(owner==='__unassigned__'?!name:name===owner))&&(type==='all'||row.type===type)&&(period==='all'||period==='overdue'&&days!==null&&days<0||period==='today'&&days===0||period==='next7'&&days!==null&&days>=0&&days<=7||period==='undated'&&days===null);
  }).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.item.eventTime||'').localeCompare(b.item.eventTime||'')||a.title.localeCompare(b.title,'pt-BR')||a.key.localeCompare(b.key));
}
