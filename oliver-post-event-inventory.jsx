import React,{useEffect,useMemo,useState} from 'react';
import {Package,Gift,Download,Save,Trash2,FileUp,Plus,Wallet} from 'lucide-react';
import {expenseTotals} from './planning-utils.mjs';
import {POST_EVENT_SIZES,postEventSummary,postEventCsv,postEventBackup,parsePostEventBackup,validatePostEventItem} from './oliver-post-event-utils.mjs';
// Estilos do inventário carregados estaticamente pelo index.html.

const KEY='oliver-post-event-local-draft-v1';
const empty=()=>({type:'fralda',description:'Pacote de fraldas',size:'M',brand:'',quantity:1,unitValue:'',notes:''});
const currency=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function download(name,text,type){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function initial(){
 try{const stored=localStorage.getItem(KEY);if(!stored)return [];
  return parsePostEventBackup(stored);
 }catch{return []}
}

export default function OliverPostEventInventory(){
 const [rows,setRows]=useState(initial);
 const [form,setForm]=useState(empty),[editing,setEditing]=useState(null);
 const [notice,setNotice]=useState(''),[cost,setCost]=useState(null),[costError,setCostError]=useState(false);
 const sum=useMemo(()=>postEventSummary(rows),[rows]);
 useEffect(()=>{try{localStorage.setItem(KEY,postEventBackup(rows))}catch{setNotice('Não foi possível guardar neste navegador. Exporte um backup agora.') }},[rows]);
 useEffect(()=>{
  let active=true;const code=sessionStorage.getItem('oliverAdmin'),url=import.meta.env.VITE_SUPABASE_URL;
  if(!code||!url)return;
  fetch(url.replace(/\/$/,'')+'/functions/v1/planning-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get',adminCode:code})})
   .then(async r=>{const d=await r.json();if(!r.ok)throw Error('read_failed');return d})
   .then(d=>{if(active&&Array.isArray(d.data?.expenses))setCost(d.data.expenses.reduce((a,e)=>a+Math.round(expenseTotals(e).planned*100),0)/100)})
   .catch(()=>{if(active)setCostError(true)});
  return()=>{active=false};
 },[]);
 const update=(key,value)=>setForm(s=>({...s,[key]:value}));
 const submit=e=>{
  e.preventDefault();setNotice('');
  try{
   const clean=validatePostEventItem({...form,id:editing||crypto.randomUUID()});
   setRows(old=>editing?old.map(x=>x.id===editing?clean:x):[...old,clean]);
   setForm(empty());setEditing(null);setNotice(editing?'Item atualizado no rascunho local.':'Item adicionado ao rascunho local.');
  }catch(err){setNotice(err.message)}
 };
 const edit=item=>{setEditing(item.id);setForm({...item,unitValue:item.unitValue||''});document.querySelector('#olie-post-item-form')?.scrollIntoView({block:'center',behavior:'smooth'})};
 const remove=id=>{
  if(!window.confirm('Remover este registro do inventário local?'))return;
  setRows(a=>a.filter(x=>x.id!==id));if(editing===id){setEditing(null);setForm(empty())}
 };
 const importBackup=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(file.size>3000000){setNotice('O backup deve ter até 3 MB.');return}
  try{
   const data=parsePostEventBackup(await file.text());
   if(!window.confirm('Substituir o inventário local atual por '+data.length+' registro(s) do backup?'))return;
   setRows(data);setEditing(null);setForm(empty());setNotice('Backup importado neste navegador.');
  }catch{setNotice('Não foi possível importar: o arquivo não corresponde a um backup válido.')}
 };
 const amount=sum.estimate,net=cost!=null?Math.round((amount-cost)*100)/100:null;
 return <section id="oliver-post-event-inventory" className="oliePostInventory adminTabbedBlock" aria-label="Inventário pós-chá">
  <div className="oliePostHeader"><div><span className="eyebrow">APÓS O CHÁ · INVENTÁRIO</span><h2>O que recebemos para o Oliver 💛</h2><p>Registre quantidades de fraldas e presentes por categoria, sem vincular itens aos convidados.</p></div><span className="oliePostTag">Rascunho local</span></div>
  <div className="oliePostCaution" role="note"><strong>Este inventário ainda não sincroniza com o Supabase.</strong> Os registros ficam somente neste navegador. Exporte o backup JSON para não perder seus dados e o CSV para importar em outras plataformas. Não há controle de quem presenteou.</div>
  <div className="oliePostStats">
   <div><Package size={21}/><strong>{sum.diaperPacks}</strong><small>Pacotes de fraldas</small></div>
   <div><Gift size={21}/><strong>{sum.giftUnits}</strong><small>Outros presentes</small></div>
   <div><Wallet size={21}/><strong>{currency(sum.estimate)}</strong><small>Valor estimado informado</small></div>
  </div>
  <div className="oliePostSizes">{POST_EVENT_SIZES.map(size=><span key={size}><b>{size}</b><strong>{sum.sizes[size]}</strong></span>)}</div>
  <form id="olie-post-item-form" className="oliePostForm" onSubmit={submit}>
   <h3>{editing?'Editar item':'Adicionar item recebido'}</h3>
   <div className="oliePostFields">
    <label>Categoria<select value={form.type} onChange={e=>{update('type',e.target.value);if(e.target.value==='presente')setForm(s=>({...s,type:'presente',size:'',description:''}));else setForm(s=>({...s,type:'fralda',size:'M',description:'Pacote de fraldas'}))}}><option value="fralda">Fraldas</option><option value="presente">Outro presente</option></select></label>
    {form.type==='fralda'&&<label>Tamanho<select value={form.size} onChange={e=>update('size',e.target.value)}>{POST_EVENT_SIZES.map(size=><option key={size}>{size}</option>)}</select></label>}
    <label>Descrição<input required maxLength={120} value={form.description} onChange={e=>update('description',e.target.value)} placeholder={form.type==='fralda'?'Pacote de fraldas':'Ex.: manta, roupinha, toalha'}/></label>
    <label>Marca (opcional)<input maxLength={80} value={form.brand} onChange={e=>update('brand',e.target.value)} placeholder="Marca do item"/></label>
    <label>Quantidade<input required type="number" min="1" max="100000" step="1" inputMode="numeric" value={form.quantity} onChange={e=>update('quantity',e.target.value)}/></label>
    <label>Valor estimado por unidade (opcional)<input type="number" min="0" max="1000000" step="0.01" inputMode="decimal" value={form.unitValue} onChange={e=>update('unitValue',e.target.value)} placeholder="R$ 0,00"/></label>
    <label className="oliePostWide">Observações (opcional)<input maxLength={240} value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="Observações sobre o produto, sem identificação de pessoas"/></label>
   </div>
   <div className="oliePostButtons"><button type="submit" className="oliePostPrimary"><Plus size={17}/>{editing?'Salvar alterações locais':'Adicionar ao inventário'}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty())}}>Cancelar edição</button>}</div>
  </form>
  {notice&&<p className="oliePostNotice" role="status">{notice}</p>}
  <div className="oliePostList">
   <div className="oliePostListHead"><h3>Inventário registrado <small>({rows.length} itens)</small></h3></div>
   {rows.length===0?<p className="oliePostEmpty">Nenhum item registrado. Após o chá, preencha as quantidades reais recebidas.</p>:<div className="oliePostRows">{rows.map(item=><article key={item.id}><div><strong>{item.description}</strong><small>{item.type==='fralda'?'Fralda '+item.size:'Presente'}{item.brand?' · '+item.brand:''} · {item.quantity} unidade(s){item.unitValue>0?' · '+currency(item.unitValue*item.quantity):''}</small>{item.notes&&<small>{item.notes}</small>}</div><div className="oliePostRowActions"><button type="button" onClick={()=>edit(item)}>Editar</button><button type="button" onClick={()=>remove(item.id)} aria-label={'Remover '+item.description}><Trash2 size={16}/></button></div></article>)}</div>}
  </div>
  <div className="oliePostExport"><div><h3>Exportação e recuperação</h3><p>CSV para Excel e Enxoval do Oliver; JSON como cópia de segurança completa.</p></div><div className="oliePostButtons"><button type="button" disabled={!rows.length} onClick={()=>download('inventario-oliver.csv',postEventCsv(rows),'text/csv;charset=utf-8')}><Download size={16}/>Exportar CSV</button><button type="button" onClick={()=>download('backup-inventario-oliver.json',postEventBackup(rows),'application/json;charset=utf-8')}><Save size={16}/>Backup JSON</button><label className="oliePostImport"><FileUp size={16}/>Importar backup<input type="file" accept=".json,application/json" onChange={importBackup} hidden/></label></div></div>
  <div className="oliePostBalance"><h3>Balanço estimado do chá</h3><p>Comparativo de planejamento familiar, não representa lucro nem avalia individualmente os presentes.</p><div><span><small>Valor estimado dos itens recebidos</small><strong>{currency(amount)}</strong></span><span><small>Custo contratado no Financeiro</small><strong>{cost===null?'—':currency(cost)}</strong></span><span><small>Diferença estimada</small><strong>{net===null?'—':currency(net)}</strong></span></div><small>{costError?'Não foi possível consultar o Financeiro neste acesso.':'O valor do Financeiro reflete contratos cadastrados, não necessariamente o custo final efetivamente pago.'}</small></div>
 </section>;
}
