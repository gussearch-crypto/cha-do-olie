import React,{useEffect,useMemo,useState} from 'react';
import {Package,Gift,Download,Save,Trash2,FileUp,Plus,Wallet} from 'lucide-react';
import {expenseTotals} from './planning-utils.mjs';
import {POST_EVENT_SIZES,postEventSummary,postEventCsv,postEventBackup,parsePostEventBackup,validatePostEventItem} from './oliver-post-event-utils.mjs';
import {inventoryApiUrl,inventoryApiRequest,inventoryStateResponse,mergeInventoryRows,enxovalTransferCsv,enxovalTransferJson} from './oliver-inventory-sync.mjs';
// Estilos do inventário carregados estaticamente pelo index.html.

const KEY='oliver-post-event-local-draft-v1';
const empty=()=>({type:'fralda',description:'Pacote de fraldas',size:'M',brand:'',quantity:1,unitsPerPackage:'',unitValue:'',notes:''});
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
 const [localRows,setLocalRows]=useState(initial);
 const endpoint=inventoryApiUrl(window.location.hostname,import.meta.env.VITE_SUPABASE_URL);
 const [remote,setRemote]=useState({status:endpoint?'checking':'unavailable',items:[],revision:0,updatedAt:null});
 const [mode,setMode]=useState('local'),[saving,setSaving]=useState(false);
 const rows=mode==='shared'?remote.items:localRows;
 const [form,setForm]=useState(empty),[editing,setEditing]=useState(null);
 const [notice,setNotice]=useState(''),[cost,setCost]=useState(null),[costError,setCostError]=useState(false);
 const sum=useMemo(()=>postEventSummary(rows),[rows]);
 useEffect(()=>{try{localStorage.setItem(KEY,postEventBackup(localRows))}catch{setNotice('Não foi possível guardar neste navegador. Exporte um backup agora.') }},[localRows]);
 useEffect(()=>{
  if(!endpoint)return;
  const code=sessionStorage.getItem('oliverAdmin');
  if(!code){setRemote(r=>({...r,status:'unavailable'}));return}
  let active=true;
  inventoryApiRequest(endpoint,code,{action:'get'})
   .then(x=>{if(!active)return;const state=inventoryStateResponse(x);
     setRemote({...state,status:'ready'});
     if(localRows.length===0)setMode('shared');
   })
   .catch(()=>{if(active)setRemote(r=>({...r,status:'offline'}))});
  return()=>{active=false};
 },[endpoint]);
 const refreshRemote=async()=>{
  const code=sessionStorage.getItem('oliverAdmin');
  if(!endpoint||!code)return;
  setSaving(true);
  try{
   const state=inventoryStateResponse(await inventoryApiRequest(endpoint,code,{action:'get'}));
   setRemote({...state,status:'ready'});
   setNotice('Inventário compartilhado atualizado. Confira os itens antes de editar.');
  }catch{setRemote(r=>({...r,status:'offline'}));setMode('local');setNotice('Servidor compartilhado indisponível. Seu rascunho local continua preservado.')}
  finally{setSaving(false)}
 };
 const persist=async next=>{
  if(mode!=='shared'){setLocalRows(next);return true}
  if(remote.status!=='ready'||!endpoint)throw Error('Sincronização indisponível. Nenhuma alteração foi salva.');
  const code=sessionStorage.getItem('oliverAdmin');
  try{
   const result=await inventoryApiRequest(endpoint,code,{action:'save',expectedRevision:remote.revision,items:next});
   setRemote(r=>({...r,items:(result.items||next).map(validatePostEventItem),revision:result.revision,status:'ready',updatedAt:result.updatedAt||null}));
   return true;
  }catch(e){
   if(e.status===409){setRemote(r=>({...r,status:'conflict'}));throw Error('Outra pessoa atualizou o inventário. Seus dados não foram salvos. Atualize a versão compartilhada e confira as alterações.')}
   throw Error('Falha ao salvar no servidor compartilhado. Nenhuma alteração foi confirmada. Exporte um backup se necessário.');
  }
 };
 const mergeDraft=async()=>{
  if(remote.status!=='ready'||saving||!endpoint||!localRows.length)return;
  const result=mergeInventoryRows(remote.items,localRows);
  if(result.conflicts){setNotice('Existem '+result.conflicts+' item(ns) com mesmo identificador e conteúdo diferente. Confira as versões antes de migrar; nada foi alterado.');return}
  if(!result.added){setMode('shared');setNotice('Os itens do rascunho já estão no inventário compartilhado. Não foram duplicados.');return}
  if(!window.confirm('Adicionar '+result.added+' item(ns) do rascunho local ao inventário compartilhado? Uma cópia local será mantida.'))return;
  setSaving(true);
  try{
   const code=sessionStorage.getItem('oliverAdmin');
   const out=await inventoryApiRequest(endpoint,code,{action:'save',expectedRevision:remote.revision,items:result.items});
   setRemote(r=>({...r,items:(out.items||result.items).map(validatePostEventItem),revision:out.revision,updatedAt:out.updatedAt||null,status:'ready'}));
   setMode('shared');setNotice('Rascunho mesclado. Os IDs repetidos não foram duplicados; o backup local permanece disponível.');
  }catch(e){if(e.status===409)setRemote(r=>({...r,status:'conflict'}));setNotice(e.status===409?'Conflito com outra sessão: recarregue a versão compartilhada antes de mesclar.':'Não foi possível sincronizar. Os itens locais foram preservados.')}
  finally{setSaving(false)}
 };
 useEffect(()=>{
  let active=true;const code=sessionStorage.getItem('oliverAdmin'),url=import.meta.env.VITE_SUPABASE_URL;
  if(!code||!url)return;
  fetch(url.replace(/\/$/,'')+'/functions/v1/planning-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get',adminCode:code})})
   .then(async r=>{const d=await r.json();if(!r.ok)throw Error('read_failed');return d})
   .then(d=>{if(active&&Array.isArray(d.data?.expenses))setCost(d.data.expenses.reduce((a,e)=>{const t=expenseTotals(e);return {contracted:a.contracted+t.planned,paid:a.paid+t.paid,open:a.open+t.open}}, {contracted:0,paid:0,open:0}))})
   .catch(()=>{if(active)setCostError(true)});
  return()=>{active=false};
 },[]);
 const update=(key,value)=>setForm(s=>({...s,[key]:value}));
 const submit=async e=>{
  e.preventDefault();if(saving)return;setNotice('');
  setSaving(true);
  try{
   const clean=validatePostEventItem({...form,id:editing||crypto.randomUUID()},{requireDiaperUnits:true});
   const next=editing?rows.map(x=>x.id===editing?clean:x):[...rows,clean];
   await persist(next);
   setForm(empty());setEditing(null);
   setNotice((editing?'Item atualizado':'Item adicionado')+(mode==='shared'?' no inventário compartilhado.':' no rascunho local.'));
  }catch(err){setNotice(err.message||'Não foi possível salvar.')}
  finally{setSaving(false)}
 };
 const edit=item=>{setEditing(item.id);setForm({...item,unitsPerPackage:item.unitsPerPackage??'',unitValue:item.unitValue||''});document.querySelector('#olie-post-item-form')?.scrollIntoView({block:'center',behavior:'smooth'})};
 const remove=async id=>{
  if(saving||!window.confirm('Remover este registro do inventário '+(mode==='shared'?'compartilhado':'local')+'?'))return;
  setSaving(true);
  try{await persist(rows.filter(x=>x.id!==id));
    if(editing===id){setEditing(null);setForm(empty())}
    setNotice('Item excluído '+(mode==='shared'?'do compartilhado.':'do rascunho local.'));
  }catch(e){setNotice(e.message)}
  finally{setSaving(false)}
 };
 const importBackup=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(file.size>3000000){setNotice('O backup deve ter até 3 MB.');return}
  try{
   const data=parsePostEventBackup(await file.text());
   if(!window.confirm('Substituir o inventário local atual por '+data.length+' registro(s) do backup?'))return;
   setLocalRows(data);setMode('local');setEditing(null);setForm(empty());setNotice('Backup importado no rascunho local. Para compartilhar, use Mesclar rascunho.');
  }catch{setNotice('Não foi possível importar: o arquivo não corresponde a um backup válido.')}
 };
 const amount=sum.estimate,net=cost!=null?Math.round((amount-cost.contracted)*100)/100:null;
 return <section id="oliver-post-event-inventory" className="oliePostInventory adminTabbedBlock" aria-label="Inventário pós-chá">
  <div className="oliePostHeader"><div><span className="eyebrow">APÓS O CHÁ · INVENTÁRIO</span><h2>O que recebemos para o Oliver 💛</h2><p>Registre quantos pacotes recebeu e quantas fraldas há em cada pacote, sem vincular itens aos convidados.</p></div><span className="oliePostTag">{mode==='shared'?'Sincronizado · revisão '+remote.revision:'Rascunho local'}</span></div>
  <div className="oliePostCaution" role="note">
    <strong>{mode==='shared'?'Inventário compartilhado · protegido pelo painel administrativo':endpoint?'Modo local — conexão compartilhada não disponível':'Preview em modo local — sem alterações no Supabase real'}</strong>
    {mode==='shared'?'As alterações só são confirmadas após salvar no servidor. Outros dispositivos podem atualizar o inventário; conflitos exigem revisão.':'Os registros deste modo ficam somente neste navegador. Faça backup JSON. O compartilhamento será ativado após homologação e implantação do backend separado.'} Não há controle de quem presenteou.
   </div>
   {endpoint&&<div className="oliePostSyncControls" aria-label="Modo de armazenamento">
     <div className="oliePostSyncStatus">
       <strong>Situação da sincronização</strong>
       <span>{remote.status==='ready'?'Servidor disponível · revisão '+remote.revision:remote.status==='checking'?'Verificando servidor...':remote.status==='conflict'?'Conflito de edição: atualize antes de continuar':'Servidor indisponível — rascunho local preservado'}</span>
     </div>
     <div className="oliePostButtons">
       <button type="button" onClick={()=>{setMode('local');setEditing(null);setForm(empty())}} disabled={saving||mode==='local'}>Ver rascunho local</button>
       <button type="button" onClick={()=>{setMode('shared');setEditing(null);setForm(empty())}} disabled={saving||remote.status!=='ready'||mode==='shared'}>Ver compartilhado</button>
       <button type="button" onClick={refreshRemote} disabled={saving||remote.status==='checking'}>Atualizar compartilhado</button>
       <button type="button" onClick={mergeDraft} disabled={saving||!localRows.length||remote.status!=='ready'}>Mesclar rascunho ({localRows.length})</button>
     </div>
   </div>}
  <div className="oliePostStats">
   <div><Package size={21}/><strong>{sum.diaperPacks}</strong><small>Pacotes de fraldas</small></div>
   <div><Package size={21}/><strong>{sum.diaperUnits.toLocaleString('pt-BR')}</strong><small>Fraldas contabilizadas</small></div>
   <div><Gift size={21}/><strong>{sum.giftUnits}</strong><small>Outros presentes</small></div>
   <div><Wallet size={21}/><strong>{currency(sum.estimate)}</strong><small>Valor estimado informado</small></div>
  </div>
  <div className="oliePostSizes" aria-label="Fraldas por tamanho">{POST_EVENT_SIZES.map(size=><span key={size}><b>{size}</b><strong>{sum.sizes[size].toLocaleString('pt-BR')}</strong><small>fraldas</small><em>{sum.packsBySize[size]} pacote(s)</em>{sum.unknownPacksBySize[size]>0&&<small className="oliePostSizePending">+ {sum.unknownPacksBySize[size]} pacote(s) sem quantidade interna</small>}</span>)}</div>
  {sum.uncountedPacks>0&&<p className="oliePostMissing" role="status"><strong>{sum.uncountedPacks} pacote(s) sem informação de fraldas por pacote.</strong> Eles já estão incluídos no total de pacotes, mas ainda não entram na contagem de fraldas. Edite os registros antigos para completar esse dado.</p>}
  <form id="olie-post-item-form" className="oliePostForm" onSubmit={submit}>
   <h3>{editing?'Editar item':'Adicionar item recebido'}</h3>
   <div className="oliePostFields">
    <label>Categoria<select value={form.type} onChange={e=>{update('type',e.target.value);if(e.target.value==='presente')setForm(s=>({...s,type:'presente',size:'',unitsPerPackage:'',description:''}));else setForm(s=>({...s,type:'fralda',size:'M',unitsPerPackage:'',description:'Pacote de fraldas'}))}}><option value="fralda">Fraldas</option><option value="presente">Outro presente</option></select></label>
    {form.type==='fralda'&&<label>Tamanho<select value={form.size} onChange={e=>update('size',e.target.value)}>{POST_EVENT_SIZES.map(size=><option key={size}>{size}</option>)}</select></label>}
    <label>Descrição<input required maxLength={120} value={form.description} onChange={e=>update('description',e.target.value)} placeholder={form.type==='fralda'?'Pacote de fraldas':'Ex.: manta, roupinha, toalha'}/></label>
    <label>Marca (opcional)<input maxLength={80} value={form.brand} onChange={e=>update('brand',e.target.value)} placeholder="Marca do item"/></label>
    <label>{form.type==='fralda'?'Quantidade de pacotes':'Quantidade de presentes'}<input required type="number" min="1" max="100000" step="1" inputMode="numeric" value={form.quantity} onChange={e=>update('quantity',e.target.value)}/></label>
    {form.type==='fralda'&&<label>Fraldas por pacote<input required type="number" min="1" max="1000" step="1" inputMode="numeric" value={form.unitsPerPackage} onChange={e=>update('unitsPerPackage',e.target.value)} placeholder="Ex.: 32, 56..." /></label>}
    <label>Valor estimado por {form.type==='fralda'?'pacote':'presente'} (opcional)<input type="number" min="0" max="1000000" step="0.01" inputMode="decimal" value={form.unitValue} onChange={e=>update('unitValue',e.target.value)} placeholder="R$ 0,00"/></label>
    <label className="oliePostWide">Observações (opcional)<input maxLength={240} value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="Observações sobre o produto, sem identificação de pessoas"/></label>
   </div>
   {form.type==='fralda'&&Number.isSafeInteger(Number(form.quantity))&&Number(form.quantity)>0&&Number.isSafeInteger(Number(form.unitsPerPackage))&&Number(form.unitsPerPackage)>0&&<p className="oliePostCalculation" role="status"><strong>{Number(form.quantity)} pacote(s) × {Number(form.unitsPerPackage)} fraldas</strong> = {(Number(form.quantity)*Number(form.unitsPerPackage)).toLocaleString('pt-BR')} fraldas {form.size}</p>}
   <div className="oliePostButtons"><button type="submit" className="oliePostPrimary" disabled={saving||mode==='shared'&&remote.status!=='ready'}><Plus size={17}/>{editing?'Salvar alterações locais':'Adicionar ao inventário'}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty())}}>Cancelar edição</button>}</div>
  </form>
  {notice&&<p className="oliePostNotice" role="status">{notice}</p>}
  <div className="oliePostList">
   <div className="oliePostListHead"><h3>Inventário registrado <small>({rows.length} itens)</small></h3></div>
   {rows.length===0?<p className="oliePostEmpty">Nenhum item registrado. Após o chá, preencha as quantidades reais recebidas.</p>:<div className="oliePostRows">{rows.map(item=><article key={item.id}><div><strong>{item.description}</strong><small>{item.type==='fralda'?'Fralda '+item.size:'Presente'}{item.brand?' · '+item.brand:''} · {item.type==='fralda'?item.quantity+' pacote(s)':item.quantity+' unidade(s)'}{item.unitValue>0?' · '+currency(item.unitValue*item.quantity):''}</small>
    {item.type==='fralda'&&<small className={item.unitsPerPackage===null?'oliePostRowPending':'oliePostRowTotal'}>{item.unitsPerPackage===null?'Fraldas por pacote não informadas — editar para completar':item.quantity+' × '+item.unitsPerPackage+' = '+(item.quantity*item.unitsPerPackage).toLocaleString('pt-BR')+' fraldas '+item.size}</small>}{item.notes&&<small>{item.notes}</small>}</div><div className="oliePostRowActions"><button type="button" disabled={saving||mode==='shared'&&remote.status!=='ready'} onClick={()=>edit(item)}>Editar</button><button type="button" disabled={saving||mode==='shared'&&remote.status!=='ready'} onClick={()=>remove(item.id)} aria-label={'Remover '+item.description}><Trash2 size={16}/></button></div></article>)}</div>}
  </div>
  <div className="oliePostExport"><div><h3>Exportação e recuperação</h3><p>CSV completo e backup JSON do modo selecionado; arquivo para conferir a transferência ao Enxoval do Oliver.</p></div><div className="oliePostButtons"><button type="button" disabled={!rows.length} onClick={()=>download('inventario-oliver.csv',postEventCsv(rows),'text/csv;charset=utf-8')}><Download size={16}/>Inventário CSV</button><button type="button" disabled={!rows.length} onClick={()=>download('enxoval-oliver-unidades.csv',enxovalTransferCsv(rows),'text/csv;charset=utf-8')}><Download size={16}/>Fraldas para Enxoval CSV</button><button type="button" disabled={!rows.length} onClick={()=>download('transferencia-enxoval-oliver.json',enxovalTransferJson(rows),'application/json;charset=utf-8')}><Download size={16}/>Transferência JSON</button><button type="button" onClick={()=>download('backup-inventario-oliver.json',postEventBackup(rows),'application/json;charset=utf-8')}><Save size={16}/>Backup JSON</button><label className="oliePostImport"><FileUp size={16}/>Importar backup<input type="file" accept=".json,application/json" onChange={importBackup} hidden/></label></div><p className="oliePostExportHelp">A transferência ao Enxoval ainda exige conferência/importação na aplicação de destino. Gerar o arquivo não atualiza automaticamente o estoque do Enxoval.</p></div>
  <div className="oliePostBalance"><h3>Balanço estimado do chá</h3><p>Comparativo de planejamento familiar, não representa lucro nem avalia individualmente os presentes.</p><div><span><small>Valor estimado dos itens recebidos</small><strong>{currency(amount)}</strong></span><span><small>Custo contratado</small><strong>{cost===null?'—':currency(cost.contracted)}</strong></span><span><small>Já pago</small><strong>{cost===null?'—':currency(cost.paid)}</strong></span><span><small>Diferença estimada frente ao contratado</small><strong>{net===null?'—':currency(net)}</strong></span></div><small>{costError?'Não foi possível consultar o Financeiro neste acesso.':cost===null?'Aguardando leitura do Financeiro.':'Saldo ainda a quitar: '+currency(cost.open)+'. O custo contratado não equivale ao custo final até o encerramento dos pagamentos.'}</small></div>
 </section>;
}
