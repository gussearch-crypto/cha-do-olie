import AdminGames from './admin-games.jsx';
import OliverPostEventInventory from './oliver-post-event-inventory.jsx';
import OliverMessageCenter from './oliver-message-center.jsx';
import OliverDayOperations from './oliver-day-operations.jsx';
import {familyMessage,readMessageTemplates} from './oliver-message-templates.mjs';
import {guestFamilyStatus,guestFilterCounts,guestGroups,filterGuestFamilies,guestOverview} from './guest-filters.mjs';
import './admin-guest-refresh.css';
import {isPreviewGamesHost} from './game-environment.mjs';
import{RSVP_DEADLINE_LABEL}from'./guest-review-utils.mjs';
import React,{useEffect,useMemo,useState}from'react';
import{createRoot}from'react-dom/client';
import{Baby,Users,Plus,Copy,RefreshCw,MessageCircle,ArrowLeft,Pencil,Gift,CheckCircle2,Clock3,XCircle,Mail}from'lucide-react';
import'./style.css';import'./admin-panel.css';
const API=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/invite-api',APP_URL='https://cha-oliver-mvp.vercel.app/';
async function api(payload){if(!import.meta.env.VITE_SUPABASE_URL)throw new Error('Supabase não configurado');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),d=await r.json();if(!r.ok)throw new Error(d.error||'Erro');return d}const newPin=()=>String(Math.floor(1000+Math.random()*9000));
const normalizeGuestName=v=>String(v||'').normalize('NFD').split('').filter(ch=>ch.charCodeAt(0)<768||ch.charCodeAt(0)>879).join('').trim().toLowerCase().split(' ').filter(Boolean).join(' ');
function guestAlerts(families){const names=new Map();for(const family of families)for(const guest of family.guests||[]){const key=normalizeGuestName(guest.name);if(key)names.set(key,[...(names.get(key)||[]),family.id])}return families.map(f=>{const guests=f.guests||[],problems=[];const yes=guests.filter(g=>g.attendance==='yes'),no=guests.filter(g=>g.attendance==='no');const actual=no.length===guests.length&&guests.length?'declined':yes.length===guests.length&&guests.length?'confirmed':yes.length||no.length?'partial':'waiting';const stored=f.invite_status||'waiting';if(actual!==stored&&!(actual==='waiting'&&stored==='invited'))problems.push({key:'status',message:'Status do núcleo divergente das respostas individuais.'});const children=yes.filter(g=>g.person_type==='child'&&!['under_5','five_or_more'].includes(g.child_age_group));if(children.length)problems.push({key:'age',message:'Crianças confirmadas sem faixa etária: '+children.map(g=>g.name).join(', ')});const duplicated=[...new Set(guests.filter(g=>(names.get(normalizeGuestName(g.name))||[]).some(id=>id!==f.id)).map(g=>g.name))];if(duplicated.length)problems.push({key:'duplicate',message:'Possíveis nomes duplicados entre núcleos: '+duplicated.join(', ')});const expected=f.gift_mode==='per_adult'?yes.filter(g=>g.person_type==='adult').length:f.gift_mode==='family'?(yes.length?1:0):null;if(expected!==null&&(f.diapers||[]).length!==expected)problems.push({key:'diapers',message:'Sugestões de fraldas: '+(f.diapers||[]).length+' registradas; '+expected+' esperadas.'});return {family:f,problems}}).filter(x=>x.problems.length)}
function AdminPanel(){const[exportStatus,setExportStatus]=useState('all'),[alertsOpen,setAlertsOpen]=useState(false),[code,setCode]=useState(sessionStorage.getItem('oliverAdmin')||''),[families,setFamilies]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[filter,setFilter]=useState(''),[statusFilter,setStatusFilter]=useState('all'),[showAdd,setShowAdd]=useState(false),[editing,setEditing]=useState(null),[displayName,setDisplayName]=useState(''),[groupName,setGroupName]=useState(''),[newGuests,setNewGuests]=useState([{name:'',isChild:false}]),[saving,setSaving]=useState(false),[sentFilter,setSentFilter]=useState('all'),[guestGroup,setGuestGroup]=useState('all'),[personFilter,setPersonFilter]=useState('all'),[sortOrder,setSortOrder]=useState('number'),[visibleCount,setVisibleCount]=useState(12),[expandedFamilies,setExpandedFamilies]=useState([]),[exportScope,setExportScope]=useState('filtered'),[attendanceHistory,setAttendanceHistory]=useState([]),[historyLoading,setHistoryLoading]=useState(false),[historyOpen,setHistoryOpen]=useState(false),[ignoredAlerts,setIgnoredAlerts]=useState([]),[showIgnored,setShowIgnored]=useState(false),[reminderFamily,setReminderFamily]=useState(null),[reminderText,setReminderText]=useState(''),[reminderRevision,setReminderRevision]=useState(null),[reminderHistory,setReminderHistory]=useState([]),[sharedMessageData,setSharedMessageData]=useState(null),[validatedAdminCode,setValidatedAdminCode]=useState(null),[messageCopyDialog,setMessageCopyDialog]=useState(null),[messageCopyStatus,setMessageCopyStatus]=useState('');
useEffect(()=>{const focus=e=>{setFilter(e.detail?.name||'');setStatusFilter('all');setSentFilter('all');setGuestGroup('all');setPersonFilter('all');setVisibleCount(12);window.dispatchEvent(new Event('oliver-clear-advanced'));setTimeout(()=>document.querySelector('.guestList')?.scrollIntoView({behavior:'smooth',block:'start'}),100)};window.addEventListener('oliver-focus-family',focus);return()=>window.removeEventListener('oliver-focus-family',focus)},[]);
const loadReminders=async(adminCode=code)=>{try{const d=await api({action:'adminReminderHistory',adminCode});setReminderHistory(d.items||[])}catch{}};
const load=async(adminCode=code)=>{setLoading(true);setError('');try{const d=await api({action:'adminList',adminCode});setFamilies(d.families||[]);setValidatedAdminCode(adminCode);loadReminders(adminCode);sessionStorage.setItem('oliverAdmin',adminCode)}catch(e){setValidatedAdminCode(null);setSharedMessageData(null);sessionStorage.removeItem('oliverAdmin');setError(e.message==='unauthorized'?'O Supabase recusou o código administrativo. Apague o preenchimento automático e digite o código novamente.':'Falha de conexão ou carregamento do painel. Tente novamente sem alterar sua senha.')}finally{setLoading(false)}};useEffect(()=>{if(code&&sessionStorage.getItem('oliverAdmin'))load(code)},[]);useEffect(()=>{const h=()=>{if(code&&sessionStorage.getItem('oliverAdmin'))load(code)};window.addEventListener('oliver-admin-refresh',h);return()=>window.removeEventListener('oliver-admin-refresh',h)},[code]);
const loadIgnoredAlerts=async(adminCode=code)=>{try{const d=await api({action:'adminValidationAlerts',adminCode});setIgnoredAlerts(d.ignored||[])}catch{setError('Não foi possível carregar as preferências de alertas.')}};useEffect(()=>{if(families.length)loadIgnoredAlerts()},[families.length]);
const toggleAlert=async(familyId,alertKey,ignore)=>{try{await api({action:'adminToggleValidationAlert',adminCode:code,familyId,alertKey,ignore});setIgnoredAlerts(current=>ignore?[...current.filter(x=>!(x.family_id===familyId&&x.alert_key===alertKey)),{family_id:familyId,alert_key:alertKey}]:current.filter(x=>!(x.family_id===familyId&&x.alert_key===alertKey)))}catch{setError('Não foi possível atualizar este alerta.')}};
const loadAttendanceHistory=async()=>{setHistoryLoading(true);try{const d=await api({action:'adminAttendanceHistory',adminCode:code});setAttendanceHistory(d.events||[])}catch{setError('Não foi possível consultar o histórico de presenças.')}finally{setHistoryLoading(false)}};
const presenceLabel=v=>v==='yes'?'Confirmado':v==='no'?'Não irá':'A confirmar';
const resetToken=async f=>{if(!confirm(`Gerar um novo token para ${f.display_name}? O token anterior deixará de funcionar.`))return;const pin=newPin();try{await api({action:'adminSetPin',adminCode:code,familyId:f.id,pin});setFamilies(v=>v.map(x=>x.id===f.id?{...x,invite_pin_plain:pin}:x))}catch{setError('Não foi possível resetar o token.')}};
const setInviteSent=async(f,next)=>{setFamilies(v=>v.map(x=>x.id===f.id?{...x,invite_sent:next,invite_sent_at:next?new Date().toISOString():null}:x));try{await api({action:'adminSetInviteSent',adminCode:code,familyId:f.id,inviteSent:next})}catch{setFamilies(v=>v.map(x=>x.id===f.id?{...x,invite_sent:!next,invite_sent_at:f.invite_sent_at}:x));setError('Não foi possível atualizar o controle de envio.')}};
const deleteFamily=async f=>{if(!confirm(`Excluir o núcleo “${f.display_name}” e todos os seus convidados? Esta ação não pode ser desfeita.`))return;try{await api({action:'adminDeleteFamily',adminCode:code,familyId:f.id});setFamilies(v=>v.filter(x=>x.id!==f.id));if(editing?.id===f.id)setEditing(null)}catch{setError('Não foi possível excluir o núcleo familiar.')}};
const addFamily=async()=>{const guests=newGuests.filter(g=>g.name.trim()).map(g=>({name:g.name.trim(),isChild:g.isChild}));if(!displayName.trim()||!guests.length){setError('Informe o nome do núcleo e pelo menos um convidado.');return}setSaving(true);setError('');let created=false;try{
 await api({action:'adminCreateFamily',adminCode:code,displayName:displayName.trim(),groupName:groupName.trim(),guests,pin:newPin()});
 created=true;
 // Releitura oficial imediata: atualiza a lista React e todos os indicadores
 // sem depender de recarregar a página ou do observador de DOM.
 const refreshed=await api({action:'adminList',adminCode:code});
 if(!Array.isArray(refreshed.families))throw Error('invalid_family_list');
 setFamilies(refreshed.families);
 setFilter('');setStatusFilter('all');setSentFilter('all');setGuestGroup('all');setPersonFilter('all');setSortOrder('number');
 setVisibleCount(Math.max(12,refreshed.families.length));
 window.dispatchEvent(new Event('oliver-clear-advanced'));
 window.dispatchEvent(new Event('oliver-admin-guests'));
 setDisplayName('');setGroupName('');setNewGuests([{name:'',isChild:false}]);setShowAdd(false);
 scrollToPanel('.guestList');
 }catch{
  setError(created?'Núcleo cadastrado, mas não foi possível atualizar a lista automaticamente. Use Atualizar dados para conferir o cadastro antes de tentar novamente.':'Não foi possível adicionar o novo núcleo.');
 }finally{setSaving(false)}};
const scrollToPanel=(selector,offset=18)=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.querySelector(selector);if(!el)return;const y=el.getBoundingClientRect().top+window.scrollY-offset;window.scrollTo({top:y,behavior:'smooth'})}));
const beginEdit=f=>{
 setEditing({id:f.id,displayName:f.display_name,groupName:f.group_name||'',
  expectedGuestIds:(f.guests||[]).map(g=>g.id),guests:(f.guests||[]).map(g=>({id:g.id,name:g.name,isChild:g.person_type==='child',
   childAgeGroup:g.child_age_group||null,attendance:g.attendance||'pending',expectedAttendance:g.attendance||'pending'}))});
 setError('');setShowAdd(false);scrollToPanel('.editBox');
};
const saveEdit=async()=>{
 const valid=editing.guests.filter(g=>g.name.trim());
 if(!editing.displayName.trim()||!valid.length)return setError('O núcleo precisa ter nome e pelo menos um convidado.');
 const changed=valid.filter(g=>(g.attendance||'pending')!==(g.expectedAttendance||'pending'));
 if(valid.some(g=>(g.attendance||'pending')==='yes'&&g.isChild&&!['under_5','five_or_more'].includes(g.childAgeGroup)))
  return setError('Informe a faixa etária de cada criança confirmada antes de salvar.');
 if(changed.length&&window.location.hostname!=='cha-oliver-mvp.vercel.app')
  return setError('Na Preview, salve apenas alterações sem mudança de presença. As confirmações e reversões ficarão disponíveis após publicação do backend.');
 let confirmationCode;
 if(changed.length){
  const labels={yes:'Confirmado',no:'Não irá',pending:'A confirmar'};
  const summary=changed.map(g=>g.name+': '+(labels[g.expectedAttendance]||'A confirmar')+' → '+labels[g.attendance||'pending']).join('\n');
  confirmationCode=window.prompt('Salvar '+changed.length+' alteração(ões) de presença em '+editing.displayName+'?\n\n'+summary+'\n\nDigite a senha administrativa UMA VEZ para confirmar e salvar todas as alterações. Elas serão registradas individualmente no histórico:');
  if(confirmationCode===null)return;
  if(!confirmationCode.trim())return setError('A senha administrativa é necessária para alterar presenças.');
 }
 setSaving(true);setError('');
 try{
  const saved=await api({action:'adminUpdateFamily',adminCode:code,
   ...(changed.length?{confirmationCode}:{}),
   familyId:editing.id,displayName:editing.displayName.trim(),groupName:editing.groupName.trim(),
   expectedGuestIds:editing.expectedGuestIds,
   guests:valid.map(g=>({id:g.id,name:g.name,isChild:!!g.isChild,
    childAgeGroup:g.isChild?g.childAgeGroup||null:null,
    attendance:g.attendance||'pending',...(g.id?{expectedAttendance:g.expectedAttendance}:{} )}))});
  if(changed.length&&saved.attendanceChanges!==changed.length)throw new Error('attendance_not_persisted');
  // Atualiza o estado React a partir da leitura oficial, antes de fechar o editor.
  // Não depende de novo login, do observador de DOM nem de recarregamentos concorrentes.
  const refreshed=await api({action:'adminList',adminCode:code});
  const updatedFamily=(refreshed.families||[]).find(f=>f.id===editing.id);
  if(!updatedFamily)throw new Error('attendance_verification_failed');
  const mismatch=valid.filter(g=>g.id).some(g=>updatedFamily.guests?.find(row=>row.id===g.id)?.attendance!==(g.attendance||'pending'));
  if(mismatch)throw new Error('attendance_not_persisted');
  setFamilies(refreshed.families||[]);
  setEditing(null);
  loadReminders(code);
  if(historyOpen)loadAttendanceHistory();
 }catch(e){
  const errors={
   attendance_not_persisted:'A atualização não foi confirmada na nova leitura. Recarregue os dados antes de tentar novamente.',
   attendance_verification_failed:'Não foi possível verificar o núcleo atualizado. Recarregue os dados antes de tentar novamente.',
   attendance_changed_since_edit:'O status foi alterado em outro acesso. Atualize o núcleo e tente novamente.',
   guest_list_changed_since_edit:'A lista do núcleo mudou em outro acesso. Atualize os dados antes de salvar.',
   confirmation_password_invalid:'Senha administrativa incorreta. Nenhum status foi alterado.',
   event_capacity_reached:'Não há vagas contabilizadas suficientes. Revise as confirmações antes de salvar.',
   capacity_check_failed:'Não foi possível conferir a capacidade. Tente novamente.',
   child_age_required:'Informe a faixa etária da criança antes de confirmar a presença.',
   attendance_changed_elsewhere:'A situação de um convidado mudou em outro acesso. Atualize a lista antes de editar novamente.',
   guest_list_changed_elsewhere:'O núcleo foi alterado em outro acesso. Atualize a lista antes de salvar novamente.',
   attendance_update_partial:'Algumas alterações podem ter sido salvas. Atualize os dados antes de tentar novamente.',
   family_status_partial:'Algumas alterações podem ter sido salvas. Atualize os dados antes de tentar novamente.',
   diaper_update_partial:'As presenças foram salvas, mas houve falha ao ajustar as sugestões de fraldas. Atualize e confira.',
   guest_update_partial:'Algumas alterações de cadastro podem ter sido salvas. Atualize os dados antes de tentar novamente.'
  };
  setError(errors[e.message]||'Não foi possível salvar a edição do núcleo. Nenhuma nova tentativa automática será feita.');
 }finally{setSaving(false)}
};
// Modelos oficiais carregados ANTES do clique. Evita perder a permissão de cópia após fetch assíncrono.
useEffect(()=>{
 if(!validatedAdminCode){setSharedMessageData(null);return}
 let mounted=true;
 const refresh=async()=>{
  try{
   const data=await api({action:'adminGetMessageTemplates',adminCode:validatedAdminCode});
   if(!mounted)return;
   if(!data.templates||!Number.isInteger(data.revision)||data.revision<1)throw Error('missing_templates');
   setSharedMessageData(old=>old?.revision>data.revision?old:{templates:data.templates,revision:data.revision});
  }catch{if(mounted){setSharedMessageData(null);setError('Não foi possível carregar as mensagens compartilhadas; cópia desabilitada. Atualize o painel.');}}
 };
 refresh();
 const changed=e=>{
  if(e.detail?.templates&&Number.isInteger(e.detail.revision))setSharedMessageData({templates:e.detail.templates,revision:e.detail.revision});
  else refresh();
 };
 window.addEventListener('oliver-messages-changed',changed);
 window.addEventListener('focus',refresh);
 return()=>{mounted=false;window.removeEventListener('oliver-messages-changed',changed);window.removeEventListener('focus',refresh)};
},[validatedAdminCode]);
// Exibe exatamente a mensagem da última revisão oficial ANTES da cópia.
// O usuário verifica o texto e clica no segundo botão, preservando a ativação do Clipboard API.
const showOfficialMessage=async(f,kind,label)=>{
 setMessageCopyStatus('');setError('');
 try{
  const data=await api({action:'adminGetMessageTemplates',adminCode:code});
  if(!data.templates||!Number.isInteger(data.revision)||data.revision<1)throw Error('missing_templates');
  const text=familyMessage(f,kind,data.templates);
  setSharedMessageData({templates:data.templates,revision:data.revision});
  setMessageCopyDialog({text,label,kind,revision:data.revision,name:f.display_name||'Família'});
 }catch{setError('Não foi possível carregar a mensagem oficial atualizada. Não foi copiado nenhum texto.')}
};
// O botão da barra de contagem regressiva solicita o mesmo modelo oficial usado no React.
useEffect(()=>{
 const onCountdownReminder=e=>{
  const family=families.find(f=>String(f.id)===String(e.detail?.familyId||''));
  if(!family){setError('Não foi possível identificar o núcleo deste lembrete. Atualize o painel.');return}
  const guests=family.guests||[];
  const hasPending=guests.some(g=>!['yes','no'].includes(g.attendance));
  const hasConfirmed=guests.some(g=>g.attendance==='yes');
  if(hasPending)showOfficialMessage(family,'reminder','Lembrete de confirmação');
  else if(hasConfirmed)showOfficialMessage(family,'eventReminder','Lembrete do evento');
  else setError('Este núcleo não possui participantes confirmados nem confirmações pendentes. Não há lembrete para copiar.');
 };
 window.addEventListener('oliver-copy-official-reminder',onCountdownReminder);
 return()=>window.removeEventListener('oliver-copy-official-reminder',onCountdownReminder);
},[families,code]);
const copyOfficialMessage=()=>{
 if(!messageCopyDialog)return;
 const text=messageCopyDialog.text;
 if(!navigator.clipboard?.writeText){
  setMessageCopyStatus('Cópia automática indisponível. Use Selecionar texto e copie manualmente.');
  return;
 }
 // Sem fetch/await entre o clique e a escrita: evita perda da permissão de transferência.
 navigator.clipboard.writeText(text).then(
  ()=>setMessageCopyStatus('Mensagem da revisão '+messageCopyDialog.revision+' copiada com sucesso.'),
  ()=>setMessageCopyStatus('O navegador bloqueou a cópia. Use Selecionar texto para copiar manualmente.')
 );
};
const copy=f=>showOfficialMessage(f,'invitation','Convite');
const copyConfirmationReminder=f=>showOfficialMessage(f,'reminder','Lembrete de confirmação');
const copyEventReminder=f=>showOfficialMessage(f,'eventReminder','Lembrete do evento');
const prepareReminder=async f=>{
 const pending=(f.guests||[]).filter(g=>!['yes','no'].includes(g.attendance));
 if(!f.invite_sent||!pending.length)return;
 const oldInvite=f.invite_sent_at&&new Date(f.invite_sent_at).getTime()<Date.parse('2026-12-01T00:00:00-03:00');
 if(oldInvite&&new Date().getTime()>=Date.parse('2026-12-01T00:00:00-03:00')){setError('O prazo inicial deste convite antigo terminou. Revise a possibilidade de participação antes de reenviar.');return}
 try{
  const data=await api({action:'adminGetMessageTemplates',adminCode:code});
  if(!data.templates||!Number.isInteger(data.revision))throw Error('missing_templates');
  setSharedMessageData({templates:data.templates,revision:data.revision});
  setReminderRevision(data.revision);
  setReminderFamily(f);setReminderText(familyMessage(f,'reminder',data.templates));
 }catch{setError('Não foi possível obter o lembrete oficial atualizado. Verifique a conexão e tente novamente.')}
};
const confirmReminder=async()=>{if(!reminderFamily)return;try{await api({action:'adminRecordReminder',adminCode:code,familyId:reminderFamily.id});await loadReminders();setReminderFamily(null)}catch{setError('Não foi possível registrar o lembrete.')}};
const getFamilyStatus=guestFamilyStatus;
const familyStatusLabel=f=>{const status=getFamilyStatus(f);return status==='declined'?'Não irá':status==='confirmed'?'Confirmado':status==='partial'?(f.guests||[]).some(g=>g.attendance==='no')?'Ausência parcial':'Parcial':'Aguardando'};
const clearGuestFilters=()=>{setFilter('');setStatusFilter('all');setSentFilter('all');setGuestGroup('all');setPersonFilter('all');setSortOrder('number');setVisibleCount(12);window.dispatchEvent(new Event('oliver-clear-advanced'))};
const exportGuests=()=>{const value=v=>{let x=String(v??'').replace(/^\s*([=+@-])/,'\u0027$1');return '"'+x.replace(/"/g,'""')+'"'};const lines=[['Nome convidado','Núcleo','Grupo','Status de Confirmação']];for(const family of (exportScope==='filtered'?shown:families)){if(family.is_test===true||String(family.group_name||'').trim().toLowerCase()==='teste')continue;for(const guest of family.guests||[]){const status=guest.attendance==='yes'?'Confirmado':guest.attendance==='no'?'Não irá':'Aguardando';if(exportStatus!=='all'&&status!==({confirmed:'Confirmado',pending:'Aguardando',declined:'Não irá'}[exportStatus]))continue;lines.push([guest.name||'',family.display_name||'',family.group_name||'',status])}}const csv='\uFEFF'+lines.map(line=>line.map(value).join(';')).join(String.fromCharCode(13,10));const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='convidados-oliver-'+exportStatus+'-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const shown=filterGuestFamilies(families,{search:filter,status:statusFilter,sent:sentFilter,group:guestGroup,person:personFilter,sort:sortOrder});
const guestSummary=useMemo(()=>guestOverview(families),[families]);
const jumpToGuestStatus=(status='all')=>{setFilter('');setStatusFilter(status);setSentFilter('all');setGuestGroup('all');setPersonFilter('all');setSortOrder('number');setVisibleCount(12);window.dispatchEvent(new Event('oliver-clear-advanced'));document.querySelector('.guestFilterPanel')?.scrollIntoView({behavior:'smooth',block:'start'})};
const stats=useMemo(()=>{const guests=families.flatMap(f=>f.guests||[]),confirmed=guests.filter(g=>g.attendance==='yes').length,declined=guests.filter(g=>g.attendance==='no').length,pending=guests.length-confirmed-declined,countedConfirmed=guests.filter(g=>g.attendance==='yes'&&!(g.person_type==='child'&&g.child_age_group==='under_5')).length,children=guests.filter(g=>g.person_type==='child').length,diapers=families.flatMap(f=>f.diapers||[]),sizes={P:0,M:0,G:0,XG:0};diapers.forEach(d=>sizes[d.diaper_size]!==undefined&&sizes[d.diaper_size]++);return{invites:families.length,total:guests.length,confirmed,declined,pending,countedConfirmed,children,diapers:diapers.length,mimos:diapers.length,sizes}},[families]);const validations=useMemo(()=>guestAlerts(families),[families]);const activeValidations=validations.map(v=>({...v,problems:v.problems.filter(p=>!ignoredAlerts.some(x=>x.family_id===v.family.id&&x.alert_key===p.key))})).filter(v=>v.problems.length);const ignoredCount=validations.reduce((n,v)=>n+v.problems.filter(p=>ignoredAlerts.some(x=>x.family_id===v.family.id&&x.alert_key===p.key)).length,0);const statusCounts=useMemo(()=>guestFilterCounts(families),[families]);const groups=useMemo(()=>guestGroups(families),[families]);const hasGuestFilters=!!filter.trim()||statusFilter!=='all'||sentFilter!=='all'||guestGroup!=='all'||personFilter!=='all'||sortOrder!=='number';
if(!families.length)return <div className="adminPage"><div className="adminLogin"><Baby/><h1>Painel do Chá do Oliver</h1><p>Acesso reservado aos organizadores.</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Código administrativo" onKeyDown={e=>e.key==='Enter'&&load()}/><button className="primary" onClick={()=>load()} disabled={!code||loading}>{loading?'Entrando...':'Acessar painel'}</button>{error&&<div className="error">{error}</div>}<a href="/"><ArrowLeft/> Voltar ao convite</a></div></div>;
const guestEditor=(guests,setter,withAttendance=false)=><div className="full editGuests">
 <div className="guestEditorHeading"><strong>Convidados</strong>{withAttendance&&<small>Atualize a presença de cada integrante; a senha será solicitada uma única vez ao salvar.</small>}</div>
 {guests.map((g,i)=><div className={'editGuest guestTypeEditor'+(withAttendance?' guestEditWithAttendance '+(g.isChild?'guestEditChild':'guestEditAdult'):'')} key={g.id||i}>
  <input aria-label={`Nome do convidado ${i+1}`} value={g.name} onChange={e=>setter(guests.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="Nome"/>
  <label className="childToggle"><input type="checkbox" checked={!!g.isChild} onChange={e=>setter(guests.map((x,j)=>j===i?{...x,isChild:e.target.checked,childAgeGroup:e.target.checked?x.childAgeGroup:null}:x))}/><span>Criança</span></label>
  {g.isChild&&<select className="guestAgeSelect" aria-label={`Faixa etária de ${g.name||'criança'}`} value={g.childAgeGroup||''} onChange={e=>setter(guests.map((x,j)=>j===i?{...x,childAgeGroup:e.target.value||null}:x))}><option value="">Idade não informada</option><option value="under_5">Menor de 5 anos</option><option value="five_or_more">5 anos ou mais</option></select>}
  {!g.isChild&&!withAttendance&&<span className="guestAgeSpacer" aria-hidden="true"/>}
  {withAttendance&&<select className="guestAttendanceSelect" aria-label={`Status de presença de ${g.name||'novo convidado'}`} value={g.attendance||'pending'} onChange={e=>setter(guests.map((x,j)=>j===i?{...x,attendance:e.target.value}:x))}>
   <option value="pending">A confirmar</option><option value="yes">Confirmado</option><option value="no">Não irá</option>
  </select>}
  <button type="button" className="guestRemoveButton" onClick={()=>setter(guests.filter((_,j)=>j!==i))}>Remover</button>
 </div>)}
 <button className="addPerson" type="button" onClick={()=>setter([...guests,{name:'',isChild:false,...(withAttendance?{attendance:'pending',expectedAttendance:'pending'}:{})}])}><Plus/> Adicionar integrante</button>
 </div>;
return <div className="adminPage"><header className="adminSiteHeader"><a className="brand" href="/">Chá do Oliver</a><nav><a href="/">Início</a><a href="/#confirmar">Confirmar</a><a href="/#presente">Presentes</a><a href="/#local">Local</a><a className="adminNav active" href="/?painel=1">Painel</a></nav></header><div className="adminWrap">{isPreviewGamesHost(window.location.hostname)&&<div role="alert" style={{padding:'13px 16px',margin:'12px 0',background:'#fff8e9',color:'#70592f',border:'1px solid #dcc69b',borderLeft:'4px solid #b28c4f',borderRadius:12,fontSize:13,lineHeight:1.5}}><strong>Ambiente Preview · cuidado com dados reais.</strong> Este painel continua conectado ao Supabase da produção. Para testar cadastros e resultados, utilize o Laboratório dos Jogos. Não altere dados oficiais ou convidados nesta versão.</div>}<div className="adminHeading"><div><span className="eyebrow">CHÁ DO OLIVER</span><h1>Gerenciador de convidados</h1><p>Acompanhe convites, confirmações e sugestões de presentes.</p></div></div>
<OliverDayOperations families={families}/>
<div id="oliver-games-admin-root" className="adminTabbedBlock adminTabHidden"><AdminGames/></div>
<section className="dashboard"><div className="statCard"><Mail/><span>CONVITES</span><strong>{stats.invites}</strong><small>núcleos familiares</small></div><div className="statCard"><Users/><span>CONVIDADOS</span><strong>{stats.total}</strong><small>{stats.children} criança(s) cadastrada(s)</small></div><div className="statCard success"><CheckCircle2/><span>CONFIRMADOS</span><strong>{stats.countedConfirmed}</strong><small>contabilizados · menores de 5 não contam</small></div><div className="statCard pending"><Clock3/><span>A CONFIRMAR</span><strong>{stats.pending}</strong><small>aguardando resposta</small></div><div className="statCard declined"><XCircle/><span>RECUSADOS</span><strong>{stats.declined}</strong><small>não irão</small></div></section>
<section className="giftDashboard"><div className="giftSummary"><div className="giftSummaryIcon"><Gift/></div><div><span className="eyebrow">CONTROLE DE PRESENTES</span><h2>Sugestões esperadas</h2><p>Baseado nas confirmações e na modalidade escolhida.</p></div></div><div className="giftNumbers"><div><strong>{stats.diapers}</strong><span>pacotes de fraldas</span></div><div><strong>{stats.mimos}</strong><span>mimos esperados</span></div></div><div className="diaperSizes">{Object.entries(stats.sizes).map(([s,n])=><div key={s}><b>{s}</b><strong>{n}</strong><span>pacote{n===1?'':'s'}</span></div>)}</div></section>
<OliverPostEventInventory/>
<section className="adminManagerBar"><div><span className="eyebrow">GERENCIADOR DE CONVIDADOS</span><h2>Convites e núcleos familiares</h2><p>Marque aqui quais integrantes são crianças. A idade será informada na confirmação do convite.</p></div><div className="adminTopActions"><button className="primary" onClick={()=>{const opening=!showAdd;setShowAdd(opening);setEditing(null);if(opening)scrollToPanel('.adminAdd:not(.editBox)')}}><Plus/> Novo convidado</button><a href="/">Ver convite</a><button onClick={()=>{sessionStorage.removeItem('oliverAdmin');setFamilies([]);setCode('')}}>Sair</button></div></section>
{editing&&<section className="adminAdd editBox"><div><span className="eyebrow">EDITAR CONVITE</span><h2>Editar núcleo familiar</h2><p>Atualize os dados e selecione a situação de cada pessoa. Pode alterar vários status sem interrupção: <strong>uma única senha será solicitada apenas ao salvar</strong>, caso haja mudanças de presença.</p></div><div className="adminForm"><label>Nome do núcleo<input value={editing.displayName} onChange={e=>setEditing({...editing,displayName:e.target.value})}/></label><label>Grupo<input value={editing.groupName} onChange={e=>setEditing({...editing,groupName:e.target.value})}/></label>{guestEditor(editing.guests,g=>setEditing({...editing,guests:g}),true)}
{(()=>{const count=editing.guests.filter(g=>(g.attendance||'pending')!==(g.expectedAttendance||'pending')).length;
 return <p className="full guestAttendanceSaveHint" role="status">{count>0
 ?`${count} mudança(s) de presença aguardando salvamento. Uma única senha será solicitada ao clicar em “Salvar alterações”.`
 :'Sem mudanças de presença: é possível salvar as edições do cadastro sem informar outra senha.'}</p>})()}
<div className="full formActions editFormActions"><button className="deleteFamilyBtn" onClick={()=>deleteFamily(families.find(f=>f.id===editing.id)||{id:editing.id,display_name:editing.displayName})}><XCircle/> Excluir núcleo</button><div className="editFormActionsMain"><button onClick={()=>setEditing(null)}>Cancelar</button><button className="primary" onClick={saveEdit} disabled={saving}>{saving?'Salvando...':'Salvar alterações'}</button></div></div></div></section>}
{showAdd&&<section className="adminAdd"><div><span className="eyebrow">NOVO NÚCLEO</span><h2>Adicionar convidados</h2><p>Cadastre cada integrante e marque quais são crianças.</p></div><div className="adminForm"><label>Nome do núcleo<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Ex.: Família Silva"/></label><label>Grupo<input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Ex.: Amigos"/></label>{guestEditor(newGuests,setNewGuests)}<div className="full formActions"><button onClick={()=>setShowAdd(false)}>Cancelar</button><button className="primary" onClick={addFamily} disabled={saving}>{saving?'Adicionando...':'Adicionar núcleo'}</button></div></div></section>}{error&&<div className="error adminError">{error}</div>}

<OliverMessageCenter families={families} adminCode={validatedAdminCode} messageApi={api}/>
{messageCopyDialog&&<div className="reminderOverlay" onClick={()=>setMessageCopyDialog(null)}><section className="reminderDialog" role="dialog" aria-modal="true" aria-label={'Prévia oficial: '+messageCopyDialog.label} onClick={e=>e.stopPropagation()}>
<h3>{messageCopyDialog.label} — {messageCopyDialog.name}</h3>
<p>Texto oficial do Supabase · revisão <strong>{messageCopyDialog.revision}</strong>. Confira abaixo antes de copiar.</p>
<textarea readOnly value={messageCopyDialog.text} rows={14} aria-label="Mensagem oficial para copiar"/>
{messageCopyStatus&&<p role="status">{messageCopyStatus}</p>}
<div className="reminderDialogActions">
<button type="button" onClick={()=>setMessageCopyDialog(null)}>Fechar</button>
<button type="button" onClick={e=>{const area=e.currentTarget.closest('.reminderDialog')?.querySelector('textarea');area?.focus();area?.select();setMessageCopyStatus('Texto selecionado. Use Ctrl+C (ou Copiar no celular).')}}>Selecionar texto</button>
<button type="button" className="primary" onClick={copyOfficialMessage}><Copy size={16}/> Copiar mensagem</button>
</div><small>Prévia e cópia não registram envio. O texto exibido vem do modelo oficial, não do cache do navegador.</small>
</section></div>}
{reminderFamily&&<div className="reminderOverlay" onClick={()=>setReminderFamily(null)}><section className="reminderDialog" role="dialog" aria-modal="true" aria-label="Lembrete de confirmação" onClick={e=>e.stopPropagation()}><h3>Lembrete para {reminderFamily.display_name}</h3><p>Modelo de confirmação — revisão {reminderRevision||'indisponível'}. Revise o texto e copie manualmente. Um lembrete já aberto não muda automaticamente quando o modelo é editado.</p><textarea value={reminderText} onChange={e=>setReminderText(e.target.value)} rows={14} aria-label="Texto do lembrete"/><div className="reminderDialogActions"><button type="button" onClick={()=>setReminderFamily(null)}>Fechar</button><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(reminderText);alert('Lembrete copiado! Cole e envie manualmente.')}catch{alert('Não foi possível copiar a mensagem. Selecione o texto e copie manualmente.')}}}>Copiar mensagem</button><button type="button" className="primary" onClick={confirmReminder}>Marcar como enviado</button></div><small>Copiar não registra envio. Marque como enviado somente depois de encaminhar a mensagem ao destinatário.</small></section></div>}
<section className="guestConsolidated" aria-label="Visão consolidada de convidados">
  <div className="guestConsolidatedHeader">
    <div><span className="eyebrow">VISÃO CONSOLIDADA</span><h2>Resumo de convidados</h2><p>Dados oficiais por pessoa e por núcleo · meta de {guestSummary.capacity} vagas para adultos e crianças a partir de 5 anos.</p></div>
    <button type="button" className="guestConsolidatedClear" onClick={()=>jumpToGuestStatus('all')}>Ver todos os núcleos</button>
  </div>
  <div className="guestConsolidatedCards">
    <button type="button" className="guestConsolidatedCard" onClick={()=>jumpToGuestStatus('confirmed')} title="Filtrar núcleos totalmente confirmados">
      <span>Confirmados contabilizados</span><strong>{guestSummary.counted} <small>/ {guestSummary.capacity}</small></strong><em>{guestSummary.confirmed} pessoas confirmadas · {guestSummary.confirmedUnderFive} menor(es) de 5</em>
    </button>
    <div className="guestConsolidatedCard" aria-label={'Vagas disponíveis: '+guestSummary.available}>
      <span>Vagas disponíveis</span><strong>{guestSummary.available}</strong><em>{guestSummary.overCapacity?guestSummary.overCapacity+' acima da capacidade':'Apenas presenças confirmadas ocupam vagas'}</em>
    </div>
    <button type="button" className="guestConsolidatedCard" onClick={()=>jumpToGuestStatus('pending')} title="Filtrar núcleos aguardando resposta">
      <span>Aguardando resposta</span><strong>{guestSummary.pending}</strong><em>Pessoas com confirmação pendente</em>
    </button>
    <button type="button" className="guestConsolidatedCard" onClick={()=>jumpToGuestStatus('declined')} title="Filtrar núcleos que não irão">
      <span>Ausências registradas</span><strong>{guestSummary.declined}</strong><em>Pessoas que informaram ausência</em>
    </button>
  </div>
  <div className="guestConsolidatedDetails">
    <span><strong>{guestSummary.families}</strong> núcleos</span>
    <span><strong>{guestSummary.people}</strong> pessoas cadastradas</span>
    <span><strong>{guestSummary.adults}</strong> adultos</span>
    <span><strong>{guestSummary.olderChildren}</strong> crianças 5+</span>
    <span><strong>{guestSummary.underFive}</strong> crianças menores de 5</span>
  </div>
  <div className="guestConsolidatedFamily">
    <span>Situação dos núcleos</span>
    {[['confirmed','Confirmados'],['pending','Aguardando'],['partial','Parciais'],['declined','Não irão']].map(([key,label])=><button type="button" key={key} onClick={()=>jumpToGuestStatus(key)} aria-label={label+': '+guestSummary.states[key]+' núcleos. Filtrar lista.'}>{label} <strong>{guestSummary.states[key]}</strong></button>)}
  </div>
  {guestSummary.unknownChildAge>0&&<p className="guestConsolidatedWarning">Atenção: {guestSummary.unknownChildAge} criança(s) confirmada(s) sem faixa etária definida. Contabilizadas provisoriamente nas vagas até a classificação.</p>}
  <small>Cartões de status aplicam filtros por núcleo; indicadores de pessoas e capacidade mostram totais gerais. Núcleos marcados como teste não entram neste resumo.</small>
</section>
<section className="confirmationFilter guestFilterPanel"><div className="guestFilterHead"><div><span className="eyebrow">CONVIDADOS</span><h2>Buscar e filtrar núcleos</h2><p>Busque por nome, grupo ou integrante e encontre rapidamente quem precisa de atenção.</p></div><button type="button" className="guestFilterClear" disabled={!hasGuestFilters} onClick={clearGuestFilters}>Limpar filtros</button></div>
<div className="adminTools"><div className="guestSearchField"><input value={filter} onChange={e=>{setFilter(e.target.value);setVisibleCount(12)}} placeholder="Buscar número, núcleo ou convidado" aria-label="Buscar convidado ou núcleo"/>{filter&&<button type="button" className="guestSearchClearInline" onClick={()=>{setFilter('');setVisibleCount(12)}} aria-label="Limpar campo de busca">×</button>}</div><span aria-live="polite">{shown.length} de {families.length} núcleos</span></div>
<div className="statusFilters" role="group" aria-label="Filtrar status">{[['all','Todos'],['confirmed','Confirmados'],['pending','Aguardando'],['partial','Parciais'],['declined','Não irão']].map(([key,label])=><button type="button" key={key} className={statusFilter===key?'active':''} aria-pressed={statusFilter===key} onClick={()=>{setStatusFilter(key);setVisibleCount(12)}}>{label}<b>{statusCounts[key]}</b></button>)}</div>
<details className="guestAdvancedFilters"><summary>Mais filtros e ordenação{(sentFilter!=='all'||guestGroup!=='all'||personFilter!=='all'||sortOrder!=='number')?' · ativos':''}</summary><div className="guestAdvancedGrid"><label>Grupo<select aria-label="Filtrar convidados por grupo" value={guestGroup} onChange={e=>{setGuestGroup(e.target.value);setVisibleCount(12)}}><option value="all">Todos os grupos</option>{groups.map(g=><option value={g} key={g}>{g}</option>)}</select></label><label>Envio<select aria-label="Status de envio" value={sentFilter} onChange={e=>{setSentFilter(e.target.value);setVisibleCount(12)}}><option value="all">Todos</option><option value="sent">Enviados</option><option value="not_sent">Não enviados</option></select></label><label>Tipo de integrante<select aria-label="Tipo de integrante" value={personFilter} onChange={e=>{setPersonFilter(e.target.value);setVisibleCount(12)}}><option value="all">Todos</option><option value="adult">Com adultos</option><option value="under_5">Com menores de 5</option><option value="five_or_more">Com crianças de 5+</option></select></label><label>Ordenação<select aria-label="Ordenar convidados" value={sortOrder} onChange={e=>{setSortOrder(e.target.value);setVisibleCount(12)}}><option value="number">Número do núcleo</option><option value="name">Nome A–Z</option><option value="attention">Pendências primeiro</option></select></label></div></details>
{hasGuestFilters&&<div className="guestActiveFilters"><span>{shown.length} núcleo{shown.length===1?'':'s'} encontrado{shown.length===1?'':'s'} · filtros combinados ativos</span><button type="button" onClick={clearGuestFilters}>Mostrar todos</button></div>}</section>
<details className="guestExportBar guestExportDisclosure"><summary>Exportar lista de convidados (CSV)</summary><div className="guestExportControls"><label>Alcance<select aria-label="Alcance da exportação" value={exportScope} onChange={e=>setExportScope(e.target.value)}><option value="filtered">Núcleos filtrados</option><option value="all">Todos os núcleos</option></select></label><label>Presença<select aria-label="Status individual na exportação" value={exportStatus} onChange={e=>setExportStatus(e.target.value)}><option value="all">Todos os status</option><option value="confirmed">Confirmado</option><option value="pending">Aguardando</option><option value="declined">Não irá</option></select></label><button type="button" onClick={exportGuests}>Baixar CSV</button></div></details>
<div className="guestList">{shown.length===0&&<div className="guestEmptyFilters"><strong>Nenhum núcleo encontrado.</strong><p>Tente outro filtro ou limpe a busca.</p><button type="button" onClick={clearGuestFilters}>Mostrar todos</button></div>}{shown.slice(0,visibleCount).map((f,i)=>{const people=f.guests||[],yes=people.filter(g=>g.attendance==='yes').length,no=people.filter(g=>g.attendance==='no').length,pending=people.length-yes-no,open=expandedFamilies.includes(f.id);return <article className="guestRow guestRowCompact" data-family-id={f.id} key={f.id}><div className="guestNumber">#{String(f.number||f.family_number||i+1).padStart(2,'0')}</div><div className="guestMain"><div className="guestTitle"><h3>{f.display_name}</h3><span className={'status '+getFamilyStatus(f)}>{familyStatusLabel(f)}</span></div><div className="guestSummary"><span>{people.length} integrante{people.length===1?'':'s'}</span>{f.group_name&&<span>· {f.group_name}</span>}{yes>0&&<span>· {yes} confirmado(s)</span>}{pending>0&&<span>· {pending} aguardando</span>}{no>0&&<span>· {no} ausência(s)</span>}</div><button type="button" className="guestDetailsToggle" aria-expanded={open} onClick={()=>setExpandedFamilies(v=>open?v.filter(id=>id!==f.id):[...v,f.id])}>{open?'Ocultar detalhes':'Ver integrantes e detalhes'}</button>{open&&<div className="guestDetails"><div className="guestPeople">{people.map(g=><span key={g.id} className={'personStatus '+(g.attendance==='yes'?'yes':g.attendance==='no'?'no':'waiting')}>{g.name}{g.person_type==='child'&&<em> · Criança{g.child_age_group==='under_5'?' < 5 anos':g.child_age_group==='five_or_more'?' ≥ 5 anos':''}</em>}<small>{g.attendance==='yes'?'Confirmado':g.attendance==='no'?'Ausência registrada':'A confirmar'}</small></span>)}</div><div className="guestMeta"><span>Token: <b>{f.invite_pin_plain||'— — — —'}</b></span><span>Fraldas: <b>{(f.diapers||[]).map(d=>d.diaper_size).join(', ')||'—'}</b></span></div></div>}</div><div className="guestActions"><button className="primary" onClick={()=>beginEdit(f)}><Pencil/> Editar</button>{f.invite_sent&&pending>0?<button type="button" className="reminderButton" onClick={()=>prepareReminder(f)}><MessageCircle/> Preparar lembrete</button>:yes>0?<button type="button" onClick={()=>copyEventReminder(f)} disabled={!sharedMessageData}><MessageCircle/> Lembrete do evento</button>:!f.invite_sent?<button type="button" onClick={()=>copy(f)} disabled={!sharedMessageData}><Copy/> Copiar convite</button>:null}<details className="guestMoreActions"><summary>Mais opções</summary><div className="guestMoreMenu">{(f.invite_sent||yes>0)&&<button type="button" onClick={()=>copy(f)} disabled={!f.invite_pin_plain||!sharedMessageData}><Copy/> Copiar convite</button>}{pending>0&&f.invite_sent&&<button type="button" onClick={()=>copyConfirmationReminder(f)} disabled={!sharedMessageData}>Copiar lembrete de confirmação</button>}{yes>0&&<button type="button" onClick={()=>copyEventReminder(f)} disabled={!sharedMessageData}>Copiar lembrete do evento</button>}{reminderHistory.some(h=>h.family_id===f.id)&&<small className="reminderMeta">Último lembrete: {new Date(reminderHistory.find(h=>h.family_id===f.id).created_at).toLocaleDateString('pt-BR')}</small>}<label className={'inviteSentControl '+(f.invite_sent?'sent':'')}><input type="checkbox" checked={!!f.invite_sent} onChange={e=>setInviteSent(f,e.target.checked)}/><span>{f.invite_sent?'Convite enviado':'Convite não enviado'}</span></label><button type="button" onClick={()=>resetToken(f)}><RefreshCw/> Gerar novo código</button></div></details></div></article>})}{shown.length>visibleCount&&<div className="guestShowMoreWrap"><button type="button" className="guestShowMore" onClick={()=>setVisibleCount(n=>n+12)}>Mostrar mais núcleos</button><span className="guestShowMoreHint">Exibindo {Math.min(visibleCount,shown.length)} de {shown.length}</span></div>}</div>
<section className="guestHistoryPanel" style={{background:'#fffdf7',border:'1px solid #e5dfc9',borderRadius:16,padding:'16px 20px',margin:'18px 0'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><span className="eyebrow">RASTREABILIDADE</span><h2 style={{margin:'5px 0'}}>Histórico de alterações de presença</h2><p style={{margin:0}}>Consulte quem mudou de status, quando e por qual origem.</p></div><button type="button" onClick={()=>{if(!historyOpen)loadAttendanceHistory();setHistoryOpen(!historyOpen)}}>{historyOpen?'Ocultar histórico':'Consultar histórico'}</button></div>{historyOpen&&<div style={{marginTop:16}}><button type="button" onClick={loadAttendanceHistory} disabled={historyLoading}>{historyLoading?'Atualizando...':'Atualizar histórico'}</button>{!historyLoading&&attendanceHistory.length===0&&<p>Nenhuma alteração registrada desde a ativação do histórico.</p>}<div style={{maxHeight:400,overflowY:'auto',marginTop:10}}>{attendanceHistory.map(h=><div key={h.id} style={{padding:'11px 0',borderBottom:'1px solid #ece6d6'}}><strong>{h.guest_name}</strong> <span style={{fontSize:12,color:'#777'}}>· {families.find(f=>f.id===h.family_id)?.display_name||'Núcleo'}</span><div style={{fontSize:13,marginTop:3}}>{presenceLabel(h.old_attendance)} → <strong>{presenceLabel(h.new_attendance)}</strong></div><small>{new Date(h.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · {h.source==='administrador'?'Painel administrativo':h.source==='convidado'?'Resposta do convidado':'Alteração do sistema'}</small></div>)}</div></div>}</section>
{(activeValidations.length>0||ignoredCount>0)&&<section className="guestValidation" style={{background:'#fffdf7',border:'1px solid #ded2ad',borderRadius:16,padding:'16px 20px',margin:'16px 0'}}><span className="eyebrow">VALIDAÇÃO AUTOMÁTICA</span><h3>Cadastros que precisam de atenção</h3><p>{activeValidations.length} núcleo(s) com avisos ativos. A validação não bloqueia confirmações.</p>{activeValidations.length>0&&<div className="guestValidationDetails"><button type="button" className="guestValidationSummary" aria-expanded={alertsOpen} onClick={()=>setAlertsOpen(v=>!v)}>{alertsOpen?"Ocultar alertas":"Ver alertas"} ({activeValidations.reduce((n,v)=>n+v.problems.length,0)})</button>{alertsOpen&&<div className="guestValidationDetailsBody">{activeValidations.map(({family,problems})=><div key={family.id} className="guestValidationItem"><strong>{family.display_name}</strong>{problems.map(p=><div key={p.key} className="guestValidationIssue"><span>{p.message}</span><button type="button" className="guestValidationButton guestValidationButtonMuted" onClick={()=>toggleAlert(family.id,p.key,true)}>Ignorar alerta</button></div>)}<button type="button" className="guestValidationButton guestValidationButtonPrimary" onClick={()=>{setStatusFilter('all');setSentFilter('all');setFilter(family.display_name);scrollToPanel('.guestList')}}>Localizar núcleo</button></div>)}</div>}</div>}{ignoredCount>0&&<div style={{marginTop:12}}><button type="button" className="guestValidationButton guestValidationButtonMuted" onClick={()=>setShowIgnored(v=>!v)}>{showIgnored?'Ocultar ignorados':'Ver alertas ignorados'} ({ignoredCount})</button>{showIgnored&&validations.map(({family,problems})=>problems.filter(p=>ignoredAlerts.some(x=>x.family_id===family.id&&x.alert_key===p.key)).map(p=><div key={family.id+p.key} className="guestValidationIgnoredItem"><strong>{family.display_name}</strong>: {p.message} <button type="button" className="guestValidationButton guestValidationButtonPrimary" onClick={()=>toggleAlert(family.id,p.key,false)}>Restaurar alerta</button></div>))}</div>}</section>}
</div></div>}
createRoot(document.getElementById('root')).render(<AdminPanel/>);