/* Sprint 3 — Prioridades do evento ligadas à mesma leitura do planejamento. */
import {eventToday} from './planning-utils.mjs';
import {eventPriorityReadiness,eventRsvpReadiness} from './admin-final-readiness.mjs';
(function(){
 let data=null,families=null,filter='all',lastKey='';
 const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
 function render(){
   const root=document.querySelector('#oliver-prep-summary');if(!root)return;
   let box=root.querySelector('.oliverPriority');
   if(!box){box=document.createElement('section');box.className='oliverPriority';root.querySelector('.oliverPrepLists')?.insertAdjacentElement('beforebegin',box)}
   if(!box)return;
   const today=eventToday(),guest=Array.isArray(families)?eventRsvpReadiness(families,today):null;
   const rows=data?eventPriorityReadiness(data,guest||{},today):[];
   const filtered=rows.filter(x=>filter==='all'||filter==='critical'&&x.priority===0||filter==='soon'&&x.priority===1||filter==='followup'&&x.priority>=2);
   const key=JSON.stringify([rows,filter,!!data,!!guest,today]);
   if(lastKey===key&&box.dataset.loaded==='1')return;
   lastKey=key;box.dataset.loaded='1';
   const labels=[['all','Todas'],['critical','Urgentes'],['soon','Próximos 7 dias'],['followup','Acompanhamento']];
   box.innerHTML='<div class="oliverPrepListHead"><div><span class="eyebrow">CENTRAL DE PRIORIDADES</span><h3>O que precisa de atenção</h3></div><span>'+rows.length+' alerta(s)</span></div>'+
     '<div class="oliverPriorityFilters">'+labels.map(([code,title])=>'<button type="button" class="'+(code===filter?'active':'')+'" data-priority-filter="'+code+'">'+title+'</button>').join('')+'</div>'+
     (data?filtered.length?'<div class="oliverPriorityRows">'+filtered.slice(0,8).map(x=>'<button type="button" class="oliverPriorityItem priority-'+esc(x.priority)+'" data-priority-tab="'+esc(x.tab)+'"><i class="oliverPriorityDot"></i><span class="oliverPriorityText"><strong>'+esc(x.label)+'</strong><small>'+esc(x.detail)+'</small></span><span aria-hidden="true">›</span></button>').join('')+'</div>':'<p class="oliverPriorityEmpty">Nenhuma pendência neste filtro.</p>':'<p class="oliverPriorityEmpty">Carregando pendências do planejamento…</p>');
 }
 document.addEventListener('click',e=>{
   const f=e.target.closest('#oliver-prep-summary [data-priority-filter]');
   if(f){filter=f.dataset.priorityFilter;lastKey='';render();return}
   const button=e.target.closest('#oliver-prep-summary [data-priority-tab]');
   if(button)document.querySelector('[data-admin-tab="'+button.dataset.priorityTab+'"]')?.click();
 });
 window.addEventListener('oliver-prep-planning',e=>{if(e.detail?.data){data=e.detail.data;lastKey='';render()}});
 window.addEventListener('oliver-admin-guests',e=>{if(Array.isArray(e.detail?.families)){families=e.detail.families;lastKey='';render()}});
 const observer=new MutationObserver(m=>{
   if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.id==='oliver-prep-summary'||n.classList?.contains('oliverPrepLists')||n.querySelector?.('.oliverPrepLists')))))render()
 });
 observer.observe(document.body,{childList:true,subtree:true});
 setTimeout(render,600);
})();
