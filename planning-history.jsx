import React,{useState} from 'react';

export function PlanningHistory({entries,onClose}) {
  const [filter,setFilter]=useState('all');
  const labels={tasks:'Ações',expenses:'Financeiro',quotes:'Cotações',budgets:'Orçamento',guestSettings:'Público'};
  const rows=entries.filter(e=>filter==='all'||e.section===filter);
  return <div><h3>Histórico do planejamento</h3>
    <p className="planningFormHint">Alterações salvas a partir desta atualização. São mantidos os 500 registros mais recentes. O acesso compartilhado registra a alteração, sem identificar a pessoa.</p>
    <label>Tipo de alteração<select aria-label="Tipo de alteração" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    {rows.length?<ol className="planningHistoryList">{rows.map(entry=><li key={entry.id}><time>{new Date(entry.at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</time><b>{entry.title}</b><span>{labels[entry.section]} · {entry.action}</span>{entry.changes?.length>0&&<details><summary>Ver alterações</summary>{entry.changes.map((change,i)=><p key={i}><strong>{change.label}:</strong> {change.before||'Não informado'} → {change.after||'Não informado'}</p>)}</details>}</li>)}</ol>:<p className="planningEmpty">Nenhuma alteração salva neste filtro.</p>}
    <div className="modalActions"><button type="button" onClick={onClose}>Fechar</button></div>
  </div>;
}
