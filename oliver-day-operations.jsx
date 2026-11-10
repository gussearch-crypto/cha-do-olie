import React,{useEffect,useMemo,useState} from 'react';
import {CalendarDays,Users,CheckCircle2,ClipboardList,Printer,Download,Package,Gamepad2,RefreshCw} from 'lucide-react';
import {eventToday} from './planning-utils.mjs';
import {productionReference,productionReferenceCsv} from './oliver-production-reference.mjs';
import {DAY_CHECKS,DAY_CHECKLIST_KEY,PRODUCTION_BASE_KEY,safeDayChecks,safeProductionBaseline,compareProductionBase,dayKitData,dayKitCsv} from './oliver-day-utils.mjs';
import './oliver-day-operations.css';

const prodHost='cha-oliver-mvp.vercel.app';
const canModifyOfficial=()=>window.location.hostname===prodHost;
function download(name,content,type){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function getChecks(){try{return safeDayChecks(JSON.parse(window.localStorage.getItem(DAY_CHECKLIST_KEY)||'[]'))}catch{return []}}
function getBase(){try{const raw=window.localStorage.getItem(PRODUCTION_BASE_KEY);return raw?safeProductionBaseline(JSON.parse(raw)):null}catch{return null}}
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const delta=n=>(n>0?'+':'')+String(n);
function navigate(tab){
 document.querySelector('[data-admin-tab="'+tab+'"]')?.click();
 window.scrollTo({top:0,behavior:'smooth'});
}
export default function OliverDayOperations({families=[]}){
 const [planning,setPlanning]=useState(null),[fetching,setFetching]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [checks,setChecks]=useState(getChecks),[base,setBase]=useState(getBase);
 const [section,setSection]=useState('all');
 const today=eventToday();
 const kit=useMemo(()=>planning?dayKitData({planning,families,today}):null,[planning,families,today]);
 const reference=useMemo(()=>planning?productionReference(families,planning,today):null,[planning,families,today]);
 const difference=reference&&base?compareProductionBase(base,reference):null;
 const day=kit?.schedule;
 const readPlanning=async()=>{
  const adminCode=sessionStorage.getItem('oliverAdmin');
  const origin=import.meta.env.VITE_SUPABASE_URL;
  if(!adminCode||!origin){setError('É necessário acessar o painel com o código administrativo.');return}
  setFetching(true);setError('');
  try{
   const response=await fetch(origin.replace(/\/$/,'')+'/functions/v1/planning-api',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'get',adminCode}),cache:'no-store'
   });
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.data?.tasks)||!Array.isArray(result.data?.expenses))throw Error('Servidor indisponível.');
   setPlanning(result.data);
  }catch{setError('Não foi possível atualizar os dados do Planejamento. Use Atualizar ou confira o módulo Ações.')}
  finally{setFetching(false)}
 };
 useEffect(()=>{
  const handler=e=>{if(Array.isArray(e.detail?.data?.tasks))setPlanning(e.detail.data)};
  const saved=()=>readPlanning();
  window.addEventListener('oliver-prep-planning',handler);
  window.addEventListener('oliver-planning-saved',saved);
  readPlanning();
  return()=>{window.removeEventListener('oliver-prep-planning',handler);window.removeEventListener('oliver-planning-saved',saved)};
 },[]);
 useEffect(()=>{try{window.localStorage.setItem(DAY_CHECKLIST_KEY,JSON.stringify(checks))}catch{setError('Checklist não foi salvo neste navegador.')}},[checks]);
 const registerBase=()=>{
  if(!reference)return;
  const message=base?'Substituir a base de produção atual por uma nova captura de '+today+'? A versão anterior será perdida neste navegador. Exporte-a antes, se necessário.':'Registrar os números atuais como base de produção com data real de '+today+'?';
  if(!window.confirm(message))return;
  try{window.localStorage.setItem(PRODUCTION_BASE_KEY,JSON.stringify(reference));setBase(safeProductionBaseline(reference));setNotice('Base registrada neste navegador em '+today+'. Ela não bloqueia a lista de convidados.')}
  catch{setError('Não foi possível guardar a base de produção. Exporte a versão atual em CSV.')}
 };
 const toggleCheck=id=>setChecks(old=>old.includes(id)?old.filter(x=>x!==id):safeDayChecks([...old,id]));
 const toggleTask=task=>{
  if(!canModifyOfficial()){setNotice('Em Preview, a conclusão das tarefas oficiais fica bloqueada para proteger os dados reais.');return}
  if(task.status!=='done'&&(task.pendingSteps>0||task.conflict)){setNotice('Revise etapas e conflitos na aba Ações antes de concluir.');navigate('planning');return}
  if(!window.confirm((task.status==='done'?'Reabrir':'Concluir')+' a atividade "'+task.title+'"?'))return;
  window.dispatchEvent(new CustomEvent('oliver-day-toggle-task',{detail:{taskId:task.id,expectedStatus:task.status}}));
  setNotice('Atualização solicitada. Confirme o registro no módulo Ações; o resumo será atualizado ao salvar.');
 };
 const byPhase=phase=>day?.entries.filter(t=>phase==='all'||t.phase===phase)||[];
 const countDone=day?.entries.filter(t=>t.status==='done').length||0;
 const checkCount=DAY_CHECKS.filter(t=>checks.includes(t.id)).length;
 return <section id="oliver-day-operations" className="olieDayOps adminTabbedBlock" aria-label="Operação do Chá do Oliver">
  <div className="olieDayTop">
   <div><span className="eyebrow">SPRINT 6 · RETA FINAL</span><h2><CalendarDays size={25}/> Operação do Chá do Oliver</h2>
    <p>Sexta-feira, 04/12/2026 · 18h às 22h. Resumo do evento, cronograma, jogos e materiais em um só lugar.</p></div>
   <button type="button" className="olieDayRefresh" disabled={fetching} onClick={readPlanning}><RefreshCw size={16}/>{fetching?'Atualizando...':'Atualizar dados'}</button>
  </div>
  {!canModifyOfficial()&&<p className="olieDayPreview" role="note"><strong>Preview:</strong> leitura dos dados oficiais. Marcar tarefas do Planejamento como concluídas está bloqueado para não modificar o banco real. O checklist de apoio e a base de produção ficam somente neste navegador.</p>}
  {error&&<p role="alert" className="olieDayError">{error}</p>}
  {notice&&<p role="status" className="olieDayNotice">{notice}</p>}
  <div className="olieDayStats">
   <article><Users size={20}/><strong>{kit?kit.rsvp.counted:'—'}</strong><small>Confirmados contabilizados</small></article>
   <article><Users size={20}/><strong>{kit?kit.rsvp.available:'—'}</strong><small>Vagas disponíveis de 100</small></article>
   <article><ClipboardList size={20}/><strong>{day?day.pending:'—'}</strong><small>Atividades pendentes</small></article>
   <article><CheckCircle2 size={20}/><strong>{day?countDone:'—'}</strong><small>Atividades concluídas</small></article>
  </div>

  <div className="olieDaySection">
   <div className="olieDaySectionHead"><div><h3>6.1 · Convidados e vagas</h3><p>30/11 é somente a referência de produção; novas inclusões e confirmações podem continuar até 04/12, respeitando a capacidade.</p></div><button type="button" onClick={()=>navigate('guests')}>Abrir convidados</button></div>
   <div className="olieDayPills">
    <span><b>{kit?.rsvp.confirmedUnderFive??'—'}</b> menores de 5 anos (não ocupam vaga)</span>
    <span><b>{kit?.rsvp.waiting??'—'}</b> aguardando resposta</span>
    <span><b>{kit?.rsvp.waitingFamilies??'—'}</b> núcleos com pendências</span>
    <span><b>{kit?.rsvp.available??'—'}</b> novas vagas disponíveis</span>
   </div>
   <small>Famílias pendentes podem ser revisadas para substituição. O painel não exclui automaticamente ninguém.</small>
  </div>

  <div className="olieDaySection">
   <div className="olieDaySectionHead"><div><h3>6.2 · Base de produção</h3><p>Guarde uma fotografia agregada de custos e convidados. Compare as mudanças após 30/11, sem congelar o RSVP.</p></div></div>
   <div className="olieDayPills">
    <span><b>{reference?.confirmedCounted??'—'}</b> na lista atual</span>
    <span><b>{reference?.childrenUnderFive??'—'}</b> crianças menores de 5</span>
    <span><b>{kit?money(kit.finance.planned):'—'}</b> contratado</span>
    <span><b>{kit?money(kit.finance.paid):'—'}</b> pago</span>
   </div>
   {base?<div className="olieDayBase">
      <div><strong>Base registrada em {base.captureDate.split('-').reverse().join('/')}</strong><small>{difference?.officialDay?'Captura realizada em 30/11':'Captura em outro dia — não substitui a fotografia oficial de 30/11'}</small></div>
      <div><strong>{base.confirmedCounted} → {reference?.confirmedCounted??'—'}</strong><small>Participantes contabilizados · variação {difference?delta(difference.countedChange):'—'}</small></div>
      <div><strong>{difference?money(difference.contractChange):'—'}</strong><small>Variação do custo contratado</small></div>
    </div>:<p className="olieDayMuted">Ainda não existe uma base registrada neste navegador. Para ter os números exatos de 30/11, registre-os nesse dia; capturas posteriores não reconstruem o passado.</p>}
   <div className="olieDayActions">
    <button type="button" disabled={!reference} onClick={registerBase}><ClipboardList size={16}/>{base?'Atualizar base registrada':'Registrar base atual'}</button>
    <button type="button" disabled={!base} onClick={()=>download('base-producao-oliver-'+base.captureDate+'.json',JSON.stringify({format:'olie-base-producao-v1',base},null,2),'application/json;charset=utf-8')}><Download size={16}/>Backup da base</button>
    <button type="button" disabled={!reference} onClick={()=>download('producao-oliver-'+today+'.csv',productionReferenceCsv(reference),'text/csv;charset=utf-8')}><Download size={16}/>Exportar base atual CSV</button>
   </div>
   <small>Base de produção registrada localmente; faça backup se precisar consultá-la em outro dispositivo.</small>
  </div>

  <div className="olieDaySection">
   <div className="olieDaySectionHead"><div><h3>6.3 · Cronograma de 04/12</h3><p>Atividades reais da aba Ações, com responsáveis, horários e situação. Conclua cada atividade somente quando executada.</p></div><button type="button" onClick={()=>navigate('planning')}>Abrir Ações</button></div>
   <div className="olieDayPills"><span><b>{day?.scheduled??'—'}</b> no cronograma</span><span><b>{day?.missingOwners??'—'}</b> sem responsável</span><span><b>{day?.conflicts?.length??'—'}</b> conflito(s) de horário</span></div>
   <div className="olieDayFilters">{[['all','Todos'],['before','Montagem'],['during','18h–22h'],['after','Encerramento']].map(([k,label])=><button key={k} type="button" aria-pressed={section===k} className={section===k?'active':''} onClick={()=>setSection(k)}>{label}</button>)}</div>
   {!day?<p>Carregando cronograma...</p>:byPhase(section).length===0?<p className="olieDayMuted">Nenhuma atividade cadastrada nesse período. Acrescente horários na aba Ações.</p>:<div className="olieDayTimeline">{byPhase(section).map(task=><article key={task.id} className={task.status==='done'?'olieDayTaskDone':''}>
    <time>{task.eventTime}{task.eventEnd?'–'+task.eventEnd:''}</time>
    <div><strong>{task.title}</strong><small>{task.responsible||'Responsável a definir'}{task.place?' · '+task.place:''}</small>
     {(task.conflict||task.missingOwner||task.pendingSteps>0)&&<p className="olieDayTaskFlags">{task.conflict?'Horário sobreposto · ':''}{task.missingOwner?'Sem responsável · ':''}{task.pendingSteps>0?task.pendingSteps+' etapa(s) pendente(s)':''}</p>}
    </div>
    <button type="button" disabled={!canModifyOfficial()||task.status!=='done'&&task.pendingSteps>0} title={!canModifyOfficial()?'Bloqueado na Preview para proteger dados reais':'Atualizar tarefa no Planejamento'} onClick={()=>toggleTask(task)}>
     {task.status==='done'?'Reabrir':'Concluir'}
    </button>
   </article>)}</div>}
  </div>

  <div className="olieDaySection">
   <div className="olieDaySectionHead"><div><h3>6.4 · Jogos e checklist do dia</h3><p>Checklist de apoio independente do estado real dos jogos. Marcar uma etapa aqui não abre, fecha nem revela resultados.</p></div><button type="button" onClick={()=>navigate('games')}>Abrir Jogos</button></div>
   <p className="olieDayProgress">{checkCount} de {DAY_CHECKS.length} verificações realizadas neste navegador</p>
   <div className="olieDayChecklist">{DAY_CHECKS.map(c=><label key={c.id}><input type="checkbox" checked={checks.includes(c.id)} onChange={()=>toggleCheck(c.id)}/><span>{c.label}</span></label>)}</div>
   <div className="olieDayActions">
    <a href="/games/qr" target="_blank" rel="noopener noreferrer"><Gamepad2 size={16}/> QR Codes e impressão</a>
    <a href="/games/teste" target="_blank" rel="noopener noreferrer">Laboratório dos Jogos</a>
    <button type="button" onClick={()=>navigate('games')}>Painel dos Jogos</button>
   </div>
  </div>

  <div className="olieDaySection olieDayKit">
   <div className="olieDaySectionHead"><div><h3>6.5 · Kit do Organizador</h3><p>Consulte pagamentos e compras pendentes, exporte o resumo ou imprima como apoio durante o evento.</p></div></div>
   <div className="olieDayPills">
    <span><b>{kit?.shopping.length??'—'}</b> compras a concluir</span>
    <span><b>{kit?.payments.length??'—'}</b> parcelas com saldo</span>
    <span><b>{kit?money(kit.finance.open):'—'}</b> a quitar</span>
   </div>
   <div className="olieDayActions">
    <button type="button" disabled={!kit} onClick={()=>download('kit-organizador-oliver-'+today+'.csv',dayKitCsv(kit),'text/csv;charset=utf-8')}><Download size={16}/>Exportar kit CSV</button>
    <button type="button" onClick={()=>window.print()}><Printer size={16}/>Imprimir resumo / salvar PDF</button>
    <button type="button" onClick={()=>navigate('guests')}>Lista de convidados (CSV)</button>
   </div>
   <small>O kit é uma fotografia atual. Para impressão dos QR Codes oficiais, utilize a página específica dos Jogos.</small>
  </div>
 </section>;
}
