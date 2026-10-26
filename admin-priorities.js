/* Central de prioridades: sem criar cadastros. */
(function(){
const API=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/planning-api';
let data=null,loading=false,filter='all',lastKey='',pendingReload=false;
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const safe=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const stamp=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')?x.slice(8,10)+'/'+x.slice(5,7):'Sem prazo';
const format=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
async function load(){
const code=sessionStorage.getItem('oliverAdmin');if(!code||!API||loading)return;
loading=true;
try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get',adminCode:code})});const d=await r.json();if(r.ok&&Array.isArray(d.data?.tasks)&&Array.isArray(d.data?.expenses))data=d.data;}catch(e){}finally{loading=false;render()}
}
function render(){
const root=document.querySelector('#oliver-prep-summary');if(!root)return;
let box=root.querySelector('.oliverPriority');if(!box){box=document.createElement('section');box.className='oliverPriority';const lists=root.querySelector('.oliverPrepLists');lists?.insertAdjacentElement('beforebegin',box);}
if(!box)return;
const start=today(),week=new Date(Date.parse(start+'T12:00:00Z')+604800000).toISOString().slice(0,10),items=[];
for(const t of data?.tasks||[]){
if(t.status==='done')continue;const title=t.title||t.description||'Ação';
if(t.due&&t.due<start)items.push([0,title,'Tarefa atrasada · '+stamp(t.due),'planning']);
else if(t.due&&t.due<=week)items.push([2,title,'Tarefa próxima · '+stamp(t.due),'planning']);
if(!String(t.responsible||'').trim())items.push([3,title,'Sem responsável','planning']);
}
for(const e of data?.expenses||[])for(const p of e.installments||[]){
const balance=Math.max(0,Math.round((Number(p.amount||0)-Number(p.paidAmount||0))*100))/100;
if(!balance||!p.due)continue;const title=e.description||'Despesa',detail=stamp(p.due)+' · '+format(balance);
if(p.due<start)items.push([0,title,'Pagamento vencido · '+detail,'planning']);
else if(p.due<=week)items.push([1,title,'Pagamento próximo · '+detail,'planning']);
}
const guestCards=[...document.querySelectorAll('.eventCentral .centralCard')];
const pending=Number(guestCards.find(c=>c.querySelector('span')?.textContent.trim()==='PESSOAS A CONFIRMAR')?.querySelector('strong')?.textContent);
if(Number.isFinite(pending)&&pending>0)items.push([4,pending+' pessoas aguardando confirmação','Prazo inicial: 30/11','guests']);
items.sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1],'pt-BR'));
const filtered=items.filter(x=>filter==='all'||filter==='critical'&&x[0]===0||filter==='soon'&&[1,2].includes(x[0])||filter==='followup'&&x[0]>=3);
box.innerHTML='<div class="oliverPrepListHead"><h3>Precisa de atenção</h3><span>'+items.length+' alerta(s)</span></div><div class="oliverPriorityFilters">'+[['all','Todos'],['critical','Atrasados'],['soon','Próximos 7 dias'],['followup','Acompanhamento']].map(([value,label])=>'<button type="button" class="'+(filter===value?'active':'')+'" data-priority-filter="'+value+'">'+label+'</button>').join('')+'</div>'+(data?filtered.length?'<div class="oliverPriorityRows">'+filtered.slice(0,7).map(x=>'<button type="button" class="oliverPriorityItem priority-'+x[0]+'" data-priority-tab="'+x[3]+'"><i class="oliverPriorityDot"></i><span class="oliverPriorityText"><strong>'+safe(x[1])+'</strong><small>'+safe(x[2])+'</small></span><span>›</span></button>').join('')+'</div>':'<p class="oliverPriorityEmpty">Nenhum alerta para este filtro.</p>':'<p class="oliverPriorityEmpty">Aguardando sincronização do planejamento.</p>');
box.querySelectorAll('[data-priority-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.priorityFilter;render()}));
box.querySelectorAll('[data-priority-tab]').forEach(b=>b.addEventListener('click',()=>document.querySelector('[data-admin-tab="'+b.dataset.priorityTab+'"]')?.click()));
}
const obs=new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.id==='oliver-prep-summary'||n.classList?.contains('oliverPrepLists'))))&&!document.querySelector('#oliver-prep-summary .oliverPriority'))render()});obs.observe(document.body,{childList:true,subtree:true});
window.addEventListener('oliver-admin-guests',render);window.addEventListener('focus',load);window.addEventListener('oliver-planning-updated',load);window.addEventListener('oliver-admin-refresh',load);window.addEventListener('storage',e=>{if(e.key==='oliverEventPlanningV2')load()});document.addEventListener('click',e=>{if(e.target.closest('[data-admin-tab="overview"],[data-prep-refresh]'))setTimeout(load,300)},true);
setInterval(()=>{if(sessionStorage.getItem('oliverAdminTab')==='overview')load()},60000);
setTimeout(load,500);setTimeout(render,800);
})();