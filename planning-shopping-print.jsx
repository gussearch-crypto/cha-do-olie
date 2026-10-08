import React,{useState} from 'react';
import {PrintPreview} from './planning-print.jsx';
import {shoppingPrintHtml} from './planning-shopping-print.mjs';
export function ShoppingPrint({all,filtered,tasks,expenses,hasFilters,filterDescription,onClose}) {
  const [scope,setScope]=useState(hasFilters?'filtered':'all');
  const rows=scope==='all'?all:filtered;
  return <PrintPreview heading="Imprimir lista de compras" previewTitle="Prévia da lista de compras para impressão" count={rows.length} html={shoppingPrintHtml(rows,{tasks,expenses,scope:scope==='all'?'Todos os itens':'Filtros: '+filterDescription})} onClose={onClose} controls={<label>Conteúdo da impressão<select aria-label="Conteúdo da impressão" value={scope} onChange={e=>setScope(e.target.value)}><option value="all">Todos os itens · {all.length}</option>{hasFilters&&<option value="filtered">Somente os resultados filtrados · {filtered.length}</option>}</select></label>}/>;
}
