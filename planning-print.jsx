import React,{useEffect,useRef,useState} from 'react';
import {PlanningDialog} from './planning-dialog.jsx';
import {schedulePrintHtml} from './planning-print.mjs';
export function SchedulePrint({all,filtered,date,tasks,filterDescription,hasFilters,onClose}) {
  const [scope,setScope]=useState('all');
  const rows=scope==='all'?all:filtered;
  const html=schedulePrintHtml(rows,date,{tasks,scope:scope==='all'?'Todos os horários do dia':'Filtros: '+filterDescription});
  return <PrintPreview heading="Imprimir cronograma" previewTitle="Prévia do cronograma para impressão" html={html} count={rows.length} onClose={onClose} controls={<label>Conteúdo da impressão<select aria-label="Conteúdo da impressão" value={scope} onChange={e=>setScope(e.target.value)}><option value="all">Todos os horários do dia · {all.length}</option>{hasFilters&&<option value="filtered">Somente os resultados filtrados · {filtered.length}</option>}</select></label>}/>;
}
export function PrintPreview({heading,previewTitle,html,count,controls,onClose}) {
  const frame=useRef(null),[loaded,setLoaded]=useState(null),[error,setError]=useState('');
  useEffect(()=>{setLoaded(null);setError('')},[html]);
  return <PlanningDialog onClose={onClose}><div className="planningPrint"><h3>{heading}</h3><p className="planningFormHint">Na janela de impressão, escolha a impressora ou “Salvar como PDF”. Os checks são para marcar à mão.</p>
    {controls}
    {!count&&<p role="status" className="planningFormHint">Nenhum registro para imprimir neste filtro.</p>}
    <iframe ref={frame} title={previewTitle} srcDoc={html} tabIndex={-1} onLoad={()=>{setLoaded(html);frame.current.contentDocument.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();onClose()}})}}/>
    {error&&<p className="error" role="alert">{error}</p>}<div className="modalActions"><button type="button" onClick={onClose}>Fechar</button><button type="button" className="primary" disabled={loaded!==html||!count} onClick={()=>{try{frame.current.contentWindow.print()}catch{setError('Não foi possível abrir a impressão. Tente novamente neste navegador.')}}}>Imprimir / salvar PDF</button></div>
  </div></PlanningDialog>;
}
