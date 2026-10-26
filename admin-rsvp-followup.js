/* Acompanhamento do RSVP: somente leitura, reaproveitando registros oficiais. */
(function(){
const API=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/invite-api';
let families=[],reminders=[],loading=false,filter='attention',last=0;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const test=f=>f.is_test===true||String(f.group_name||'').toLowerCase().trim()==='teste';
const state=f=>{const g=f.guests||[],waiting=g.filter(x=>!['yes','no'].includes(x.attendance)).length;if(!f.invite_sent)return'unsent';if(waiting===0)return'complete';return waiting===g.length?'pending':'partial'};
async function fetchData(force=false){
const code=sessionStorage.getItem('oliverAdmin');if(!code||loading||!API||(!force&&Date.now()-last<20000))return;
loading=true;
try{
const [a,b]=await Promise.all([fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'adminList',adminCode:code})}),fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'adminReminderHistory',adminCode:code})})]);
const j=await a.json(),h=await b.json();
if(a.ok&&Array.isArray(j.families)){families=j.families.filter(f=>!test(f));last=Date.now()}
if(b.ok)reminders=Array.isArray(h.items)?h.items:[];
}catch(e){}finally{loading=false;render()}
}
function render(){
const anchor=document.querySelector('.adminTools'),list=document.querySelector('.guestList');
if(!anchor||!list)return;
let root=document.querySelector('#oliver-rsvp-followup');
if(!root){root=document.createElement('section');root.id='oliver-rsvp-followup';root.className='oliverRsvpFollowup adminTabbedBlock';anchor.insertAdjacentElement('beforebegin',root)}
root.classList.toggle('adminTabHidden',(sessionStorage.getItem('oliverAdminTab')||'overview')!=='guests');
const counts={unsent:0,pending:0,partial:0,reminded:0};families.forEach(f=>{const x=state(f);if(counts[x]!==undefined)counts[x]++;if(reminders.some(h=>h.family_id===f.id))counts.reminded++});
const rows=families.map(f=>{const status=state(f),history=reminders.filter(h=>h.family_id===f.id).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))),last=history[0];return{f,status,last}}).filter(x=>filter==='all'?x.status!=='complete':filter==='reminded'?!!x.last:filter==='attention'?['unsent','partial','pending'].includes(x.status):x.status===filter).sort((a,b)=>({unsent:0,partial:1,pending:2,complete:3}[a.status]??4)-({unsent:0,partial:1,pending:2,complete:3}[b.status]??4));
const labels={unsent:'Convite não enviado',pending:'Aguardando resposta',partial:'Resposta parcial',complete:'Respondido'};
root.innerHTML='<header class="rsvpFollowHead"><div><h3>Acompanhamento de confirmações</h3><p>Prazo inicial: 30/11 · novas inclusões permitidas após o prazo.</p></div><button type="button" data-rsvp-refresh>Atualizar</button></header><div class="rsvpFollowStats">'+[['unsent','Não enviados'],['pending','Sem resposta'],['partial','Parciais'],['reminded','Com lembrete registrado']].map(([k,label])=>'<div><strong>'+counts[k]+'</strong><small>'+label+'</small></div>').join('')+'</div><div class="rsvpFollowFilters">'+[['attention','Precisam de atenção'],['unsent','Não enviados'],['pending','Sem resposta'],['partial','Parciais'],['reminded','Com lembrete'],['all','Todos pendentes']].map(([k,label])=>'<button type="button" data-rsvp-filter="'+k+'" class="'+(filter===k?'active':'')+'">'+label+'</button>').join('')+'</div><div class="rsvpFollowRows">'+(rows.length?rows.slice(0,30).map(({f,status,last})=>'<div class="rsvpFollowRow"><div><strong>'+esc(f.display_name)+'</strong><small>'+esc(labels[status])+' · '+(f.guests||[]).filter(g=>!['yes','no'].includes(g.attendance)).length+' pessoa(s) sem resposta'+(last?' · último lembrete '+new Date(last.created_at).toLocaleDateString('pt-BR'):'')+'</small></div><button type="button" data-rsvp-focus="'+esc(f.id)+'">Localizar núcleo</button></div>').join(''):'<p class="rsvpFollowEmpty">'+(families.length?'Nenhum núcleo neste filtro.':'Carregando os dados de convidados…')+'</p>')+'</div>';
root.querySelectorAll('[data-rsvp-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.rsvpFilter;render()}));
root.querySelector('[data-rsvp-refresh]')?.addEventListener('click',()=>fetchData(true));
root.querySelectorAll('[data-rsvp-focus]').forEach(b=>b.addEventListener('click',()=>{const f=families.find(x=>String(x.id)===b.dataset.rsvpFocus);if(f)window.dispatchEvent(new CustomEvent('oliver-focus-family',{detail:{id:f.id,name:f.display_name}}))}));
}
const obs=new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.classList?.contains('adminTools')||n.querySelector?.('.adminTools')))))render()});
obs.observe(document.body,{childList:true,subtree:true});
window.addEventListener('focus',()=>fetchData(true));window.addEventListener('oliver-admin-guests',()=>fetchData(true));document.addEventListener('click',e=>{if(e.target.closest('[data-admin-tab="guests"]'))setTimeout(()=>{render();fetchData()},0)},true);
setTimeout(()=>fetchData(true),700);setTimeout(render,800);
})();