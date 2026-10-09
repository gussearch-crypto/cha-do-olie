import {daysUntil} from './planning-utils.mjs';
const minutes=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'')?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
const owner=value=>String(value||'').trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function scheduleConflicts(tasks,date) {
  if(daysUntil(date,date)===null)return [];
  const rows=tasks.filter(task=>task.eventDate===date&&owner(task.responsible)&&minutes(task.eventTime)!==null).map(task=>{const start=minutes(task.eventTime),end=minutes(task.eventEnd);return {task,owner:owner(task.responsible),start,end:end!==null&&end>start?end:start}});
  const conflicts=[];
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j];if(a.owner!==b.owner||a.task.id===b.task.id)continue;
    const overlap=a.start===b.start||(a.start===a.end?a.start>=b.start&&a.start<b.end:b.start===b.end?b.start>=a.start&&b.start<a.end:a.start<b.end&&b.start<a.end);
    if(overlap)conflicts.push({first:a.task,second:b.task});
  }
  return conflicts;
}
