import React from 'react';
export function ScheduleConflictAlerts({conflicts,onEdit}) {
  if(!conflicts.length)return null;
  const time=task=>task.eventTime+(task.eventEnd?' até '+task.eventEnd:'');
  return <details className="planningScheduleConflicts"><summary>Horários sobrepostos · {conflicts.length} conflito(s)</summary><p>Mesmo responsável e mesma data. A verificação inclui ações fora dos filtros. Sem horário final, considera apenas o início, sem presumir duração.</p><ul>{conflicts.map(({first,second})=><li key={first.id+':'+second.id}><b>{first.responsible.trim()}</b><button type="button" aria-label={`Ajustar conflito de ${first.title} com ${second.title}`} onClick={()=>onEdit(first)}>{first.title} · {time(first)}</button><button type="button" aria-label={`Ajustar conflito de ${second.title} com ${first.title}`} onClick={()=>onEdit(second)}>{second.title} · {time(second)}</button></li>)}</ul></details>;
}
