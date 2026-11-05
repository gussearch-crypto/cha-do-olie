/* Sprint 3 — Central de Preparação: somente leitura dos módulos existentes. */
import {eventToday,daysUntil} from './planning-utils.mjs';
import {EVENT_DATE,RSVP_DEADLINE,eventRsvpReadiness,eventScheduleReadiness,eventFinanceReadiness} from './admin-final-readiness.mjs';

(function(){
 const API=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/planning-api';
 let planning=null,planningReady=false,guests=null,loading=false,error='',last=0,seq=0,renderQueued=false;
 const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.slice(8,10)+'/'+value.slice(5,7):'Sem data';
 const navTo=tab=>document.querySelector('[data-admin-tab="'+tab+'"]')?.click();
 const navigate=e=>{const btn=e.target.closest('[data-prep-tab]');if(btn){navTo(btn.dataset.prepTab);return}if(e.target.closest('[data-prep-refresh]'))refresh(true)};
 function guestCache(){
   try{
     const cache=JSON.parse(sessionStorage.getItem('oliverAdminListCache')||'null');
     const code=sessionStorage.getItem('oliverAdmin');
     if(code&&cache?.data&&Array.isArray(cache.data.families)&&Date.now()-Number(cache.at)<30000)return cache.data.families;
   }catch{}
   return null;
 }
 const syncGuestCache=()=>{const fs=guestCache();if(fs){guests=fs;schedule()}};
 async function refresh(force=false){
   const code=sessionStorage.getItem('oliverAdmin');
   if(!code||!API||loading||(!force&&last&&Date.now()-last<45000))return;
   loading=true;error='';schedule();
   const ticket=++seq;
   try{
     const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get',adminCode:code})});
     const payload=await r.json();
     if(!r.ok||!Array.isArray(payload.data?.tasks)||!Array.isArray(payload.data?.expenses))throw Error('Resposta inválida');
     if(ticket!==seq)return;
     planning=payload.data;planningReady=true;last=Date.now();window.dispatchEvent(new CustomEvent('oliver-prep-planning',{detail:{data:planning,at:last}}));
   }catch{error='Não foi possível sincronizar o planejamento. Tente atualizar.'}
   finally{loading=false;schedule()}
 }
 function schedule(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render()})}
 const tile=(label,value,hint,tab)=>'<article><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><p>'+esc(hint)+'</p><button type="button" data-prep-tab="'+tab+'">Abrir '+({guests:'convidados',finance:'financeiro',planning:'ações'}[tab]||tab)+' →</button></article>';
 const taskRow=(task,today)=>{
   const due=daysUntil(task.due,today),owner=task.responsible?' · '+task.responsible:' · Responsável a definir';
   const label=due===null?'Sem prazo':due<0?'Atrasada há '+(-due)+' dia(s)':due===0?'Vence hoje':'Prazo '+date(task.due);
   return '<li><span>'+esc(task.title||'Ação sem título')+'</span><small>'+esc(label+owner)+'</small></li>';
 };
 const paymentRow=(item,today)=>{
   const days=daysUntil(item.due,today),label=days!==null&&days<0?' · ATRASADO':'';
   return '<li><span>'+esc(item.expense.description||'Serviço')+'</span><small>'+esc(date(item.due)+' · '+money(item.balance)+label)+'</small></li>';
 };
 function scheduleRow(task){
   const owner=task.responsible||'Responsável a definir';
   const info=[owner,task.place||'',task.stepsTotal?'Etapas pendentes: '+task.pendingSteps+'/'+task.stepsTotal:''].filter(Boolean).join(' · ');
   const badge=task.status==='done'?'Concluída':task.conflict?'Conflito de horário':task.missingOwner?'Sem responsável':'A realizar';
   const tag=task.status==='done'?'done':task.conflict?'conflict':task.missingOwner?'attention':'pending';
   return '<li class="oliverDayTask oliverDayTask-'+tag+'"><time datetime="'+esc(task.eventTime)+'">'+esc(task.eventTime+(task.eventEnd?'–'+task.eventEnd:''))+'</time><div><strong>'+esc(task.title||'Atividade')+'</strong><small>'+esc(info)+'</small></div><span class="oliverDayStatus">'+esc(badge)+'</span></li>';
 }
 function section(label,items){
   return '<section class="oliverDayPeriod"><h4>'+esc(label)+' <small>('+items.length+')</small></h4>'+(items.length?'<ol>'+items.map(scheduleRow).join('')+'</ol>':'<p>Nenhuma atividade programada para este período.</p>')+'</section>';
 }
 function render(){
   const anchor=document.querySelector('.adminWrap .dashboard'),nav=document.querySelector('.adminTabs');
   if(!anchor||!nav)return;
   let root=document.querySelector('#oliver-prep-summary');
   if(!root){
     root=document.createElement('section');root.id='oliver-prep-summary';root.className='oliverPrepSummary adminTabbedBlock';
     root.addEventListener('click',navigate);anchor.insertAdjacentElement('beforebegin',root);
   }
   root.classList.toggle('adminTabHidden',(sessionStorage.getItem('oliverAdminTab')||'overview')!=='overview');
   const today=eventToday(),days=Math.max(0,daysUntil(EVENT_DATE,today)??0);
   const rsvp=guests?eventRsvpReadiness(guests,today):null;
   const scheduleData=planningReady?eventScheduleReadiness(planning):null;
   const finance=planningReady?eventFinanceReadiness(planning,today):null;
   const openTasks=planningReady?planning.tasks.filter(t=>t.status!=='done'):[];
   const upcoming=openTasks.filter(t=>daysUntil(t.due,today)!==null)
     .sort((a,b)=>a.due.localeCompare(b.due)).slice(0,4);
   const payments=finance?.dated.slice(0,4)||[];
   const deadline=daysUntil(RSVP_DEADLINE,today);
   const deadlineTitle=deadline===null?'Prazo: 30/11':deadline>0?'Faltam '+deadline+' dia(s) para 30/11':deadline===0?'Último dia para confirmar':'Prazo de 30/11 encerrado';
   const readinessTiles=[
     ['CONFIRMADOS CONTABILIZADOS',rsvp?rsvp.counted+' / 100':'— / 100',rsvp?rsvp.available+' vagas disponíveis · '+rsvp.confirmedUnderFive+' criança(s) menores de 5 fora da contagem':'Aguardando lista de convidados','guests'],
     ['A CONFIRMAR',rsvp?rsvp.waiting:'—',rsvp?deadlineTitle+' · '+rsvp.waitingFamilies+' núcleo(s)':'Aguardando confirmações','guests'],
     ['AÇÕES EM ABERTO',finance?openTasks.length:'—',finance?finance.overdueTasks+' atrasada(s) · '+finance.soonTasks+' nos próximos 7 dias':'Aguardando planejamento','planning'],
     ['SALDO A QUITAR',finance?money(finance.open):'—',finance?money(finance.overdueValue)+' em atraso · '+money(finance.soonValue)+' para os próximos 7 dias':'Aguardando financeiro','finance']
   ];
   const stats=[
     ['Convidados confirmados',rsvp?rsvp.confirmed:'—','Inclui menores de 5 anos'],
     ['Crianças menores de 5',rsvp?rsvp.confirmedUnderFive:'—','Não contam na capacidade'],
     ['Vagas remanescentes',rsvp?rsvp.available:'—','Podem receber novos convidados após 30/11'],
     ['Pessoas aguardando',rsvp?rsvp.waiting:'—','Revisar confirmação por núcleo'],
     ['Atividades de 04/12',scheduleData?scheduleData.scheduled:'—','Somente horários cadastrados'],
     ['Conflitos de horário',scheduleData?scheduleData.conflicts.length:'—','Mesmo responsável e horário sobreposto'],
     ['Orçado/contratado',finance?money(finance.planned):'—','Valor contratado, não orçamento'],
     ['Valor já pago',finance?money(finance.paid):'—','Pagamentos efetivamente registrados']
   ];
   const summary=JSON.stringify([readinessTiles,stats,upcoming,payments,scheduleData,finance&&{open:finance.open,goal:finance.goal,projected:finance.projected,unplannedBalance:finance.unplannedBalance},today,error,loading,last]);
   if(root.dataset.key===summary)return;
   const detailsOpen=!!root.querySelector('.oliverPrepDetails')?.open;
   const timelineOpen=!!root.querySelector('.oliverDayTimeline')?.open;
   root.dataset.key=summary;
   const rsvpBlock=rsvp?
    '<div class="oliverRetaStatus'+(rsvp.afterDeadline?' is-late':'')+'"><div><strong>'+esc(deadlineTitle)+'</strong><p>'+
      (rsvp.afterDeadline?'Quem não respondeu até 30/11 pode ser revisado para substituição; ninguém será excluído automaticamente.':'O prazo de confirmação é 30/11. Até lá, acompanhe as respostas por núcleo.')+
     ' Novos convidados podem ser incluídos depois do prazo para completar a capacidade de 100 pessoas.</p></div><button type="button" data-prep-tab="guests">Gerenciar convidados</button></div>':
     '<div class="oliverRetaStatus"><div><strong>Confirmações do evento</strong><p>Carregue o painel de convidados para acompanhar o prazo de 30/11.</p></div></div>';
   const paymentNote=finance?.unplannedBalance>0?'<p class="oliverPrepNotice">Há '+esc(money(finance.unplannedBalance))+' de saldo sem vencimento ou sem parcelamento definido. Revise no Financeiro.</p>':'';
   const budgetNote=finance?.goal!=null?'<p class="oliverPrepGoal">Meta financeira: '+esc(money(finance.goal))+' · Fechamento projetado: '+esc(money(finance.projected))+'</p>':'';
   const scheduleBlock='<section class="oliverDayBlock"><div class="oliverPrepListHead"><div><span class="eyebrow">SEXTA-FEIRA · 04 DE DEZEMBRO</span><h3>Cronograma do dia do chá</h3><p>Atividades registradas nas Ações, com responsáveis e situação atual.</p></div><button type="button" data-prep-tab="planning">Abrir cronograma completo</button></div>'+
      (scheduleData?
       '<div class="oliverDaySummary"><span>'+scheduleData.scheduled+' atividades</span><span>'+scheduleData.pending+' a realizar</span><span'+(scheduleData.conflicts.length?' class="is-warning"':'')+'>'+scheduleData.conflicts.length+' conflito(s)</span><span>'+scheduleData.missingOwners+' sem responsável</span></div>'+
       '<details class="oliverDayTimeline"'+(timelineOpen?' open':'')+'><summary>Ver horários de 04/12 <span>Montagem · 18h–22h · encerramento</span></summary>'+
       '<div class="oliverDayPeriods">'+section('Antes das 18h · preparação',scheduleData.before)+section('Das 18h às 22h · durante o chá',scheduleData.during)+section('Após as 22h · finalização',scheduleData.after)+'</div></details>':
       '<p class="oliverPrepEmpty">Sincronizando o cronograma cadastrado…</p>')+
      '</section>';
   const tiles=readinessTiles.map(([label,value,hint,tab])=>tile(label,value,hint,tab)).join('');
   const list=(items,renderRow)=>items.length?items.map(x=>renderRow(x,today)).join(''):'<li class="oliverPrepEmpty">Nenhum vencimento cadastrado.</li>';
   root.innerHTML='<div class="oliverPrepHead"><div><span class="eyebrow">RETA FINAL · 04/12/2026</span><h2>Central de Preparação do Oliver</h2><p>Acompanhe o que precisa estar pronto antes e durante o chá.</p></div><strong>'+days+' dias para o chá</strong></div>'+
     '<div class="oliverPrepGrid">'+tiles+'</div>'+rsvpBlock+
     scheduleBlock+
     '<div class="oliverPrepLists"><article><div class="oliverPrepListHead"><h3>Próximas ações</h3><button data-prep-tab="planning">Ver todas</button></div><ul>'+(planningReady?list(upcoming,taskRow):'<li>Sincronizando ações…</li>')+'</ul></article>'+
     '<article><div class="oliverPrepListHead"><h3>Pagamentos programados</h3><button data-prep-tab="finance">Ver financeiro</button></div><ul>'+(planningReady?list(payments,paymentRow):'<li>Sincronizando pagamentos…</li>')+'</ul>'+paymentNote+budgetNote+'</article></div>'+
     '<details class="oliverPrepDetails"'+(detailsOpen?' open':'')+'><summary>Ver indicadores complementares <span>('+stats.length+' indicadores)</span></summary><div class="oliverPrepDetailGrid">'+stats.map(([label,value,hint])=>'<div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><p>'+esc(hint)+'</p></div>').join('')+'</div></details>'+
     '<div class="oliverPrepSync"><span>'+(loading?'Atualizando planejamento…':error?esc(error):planningReady?'Dados sincronizados · '+new Date(last).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'Aguardando dados do planejamento')+'</span><button data-prep-refresh type="button">Atualizar agora</button></div>';
 }
 const observer=new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.adminTabs,.dashboard')||n.querySelector?.('.adminTabs,.dashboard')))))schedule()});
 observer.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('oliver-admin-guests',e=>{if(Array.isArray(e.detail?.families)){guests=e.detail.families;schedule()}});
 window.addEventListener('focus',()=>{syncGuestCache();refresh(true)});
 window.addEventListener('oliver-planning-saved',()=>refresh(true));
 window.addEventListener('oliver-admin-refresh',()=>{syncGuestCache();refresh(true)});
 document.addEventListener('click',e=>{if(e.target.closest('[data-admin-tab]'))setTimeout(()=>{schedule();if((sessionStorage.getItem('oliverAdminTab')||'overview')==='overview'){syncGuestCache();refresh()}},0)},true);
 setInterval(()=>{if((sessionStorage.getItem('oliverAdminTab')||'overview')==='overview'){syncGuestCache();refresh()}},60000);
 syncGuestCache();schedule();refresh(true);
})();
