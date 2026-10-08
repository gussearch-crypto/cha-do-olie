import React,{useRef,useState} from 'react';
import {PlanningDialog} from './planning-dialog.jsx';
import {schedulePrintHtml} from './planning-print.mjs';
export function SchedulePrint({all,filtered,date,tasks,filterDescription,hasFilters,onClose}) {
  const [scope,setScope]=useState('all'),[ready,setReady]=useState(false),[error,setError]=useState('');
  const frame=useRef(null),rows=scope==='all'?all:filtered;
  const html=schedulePrintHtml(rows,date,{tasks,scope:scope==='all'?'Todos os horários do dia':'Filtros: '+filterDescription});
  return <PlanningDialog onClose={onClose}><div className="planningPrint"><h3>Imprimir cronograma</h3><p className="planningFormHint">Na janela de impressão, escolha a impressora ou “Salvar como PDF”.</p>
    <label>Conteúdo da impressão<select aria-label="Conteúdo da impressão" value={scope} onChange={e=>{setReady(false);setScope(e.target.value);setError('')}}><option value="all">Todos os horários do dia · {all.length}</option>{hasFilters&&<option value="filtered">Somente os resultados filtrados · {filtered.length}</option>}</select></label>
    {!rows.length&&<p role="status" className="planningFormHint">Nenhum horário para imprimir neste filtro.</p>}
    <iframe ref={frame} title="Prévia do cronograma para impressão" srcDoc={html} tabIndex={-1} onLoad={()=>{setReady(true);frame.current.contentDocument.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();onClose()}})}}/>
    {error&&<p className="error" role="alert">{error}</p>}<div className="modalActions"><button type="button" onClick={onClose}>Fechar</button><button type="button" className="primary" disabled={!ready||!rows.length} onClick={()=>{try{frame.current.contentWindow.print()}catch{setError('Não foi possível abrir a impressão. Tente novamente neste navegador.')}}}>Imprimir / salvar PDF</button></div>
  </div></PlanningDialog>;
}
