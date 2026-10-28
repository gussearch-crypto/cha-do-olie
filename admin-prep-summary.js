/* Visão geral integrada — leitura autenticada das mesmas fontes dos módulos. */
import {eventToday,planningSnapshot,installmentBalance} from './planning-utils.mjs';
(function(){
const API=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/planning-api';
let planning=null,loading=false,error='',last=0,seq=0,renderQueued=false;
const money=x=>Number(x||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v.slice(8,10)+'/'+v.slice(5,7):'Sem data';
const jump=t=>document.querySelector('[data-admin-tab="'+t+'"]')?.click();
const refresh=async(force=false)=>{
 const code=sessionStorage.getItem('oliverAdmin');if(!code||!API)return;
 if(loading||(!force&&Date.now()-last<45000))return;
 loading=true;error='';schedule();
 const ticket=++seq;
 try{
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get',adminCode:code})});
 const j=await r.json();if(!r.ok)throw Error(j.error||'Falha ao sincronizar');
 if(ticket!==seq)return;
 if(!Array.isArray(j.data?.tasks)||!Array.isArray(j.data?.expenses))throw Error('Dados do planejamento incompletos');
 planning=j.data;last=Date.now();
 }catch(e){error='Não foi possível atualizar o planejamento.'}finally{loading=false;schedule()}
};
const schedule=()=>{if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render()})};
function render(){
 const dash=document.querySelector('.adminWrap .dashboard'),nav=document.querySelector('.adminTabs');if(!dash||!nav)return;
 let root=document.querySelector('#oliver-prep-summary');if(!root){root=document.createElement('section');root.id='oliver-prep-summary';root.className='oliverPrepSummary adminTabbedBlock';dash.insertAdjacentElement('beforebegin',root)}
 root.classList.toggle('adminTabHidden',(sessionStorage.getItem('oliverAdminTab')||'overview')!=='overview');
 const detailCards=[...document.querySelectorAll('.eventCentral .centralCard')];const metric=word=>detailCards.find(c=>c.querySelector('span')?.textContent.trim()===word)?.querySelector('strong')?.textContent.trim()||'—';const eligible=document.querySelector('.eventCentral .venueCapacity>strong')?.childNodes[0]?.textContent.trim()||'—';const eventLabel=document.querySelector('.countdownCard')?.textContent||'';
 const today=eventToday(),days=Math.max(0,Math.ceil((Date.parse('2026-12-04T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000));
 const snap=planning?planningSnapshot(planning,today):null;
 const openTasks=planning?planning.tasks.filter(t=>t.status!=='done'):[];
 const nextTasks=openTasks.filter(t=>t.due).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,4);
 const installments=planning?planning.expenses.flatMap(e=>(e.installments||[]).map(p=>({p,e,balance:installmentBalance(p)}))).filter(x=>x.balance>0):[];
 const nextPayments=installments.filter(x=>x.p.due).sort((a,b)=>a.p.due.localeCompare(b.p.due)).slice(0,4);
 const cardsData=[['CONFIRMADOS ELEGÍVEIS',eligible+' / 100','Adultos e crianças a partir de 5 anos','guests'],['AGUARDANDO RESPOSTA',metric('PESSOAS A CONFIRMAR'),'Prazo inicial 30/11 · novos convites podem entrar depois','guests'],['AÇÕES EM ABERTO',snap?openTasks.length:'—',snap?snap.overdueTasks+' atrasada(s) · '+snap.soonTasks+' nos próximos 7 dias':'Aguardando sincronização','planning'],['SALDO A QUITAR',snap?money(snap.open):'—',snap?money(snap.overdueValue)+' em atraso · '+money(snap.soonValue)+' próximos 7 dias':'Aguardando sincronização','finance']];
 const tiles=cardsData.map(([label,val,note,tab])=>'<article><small>'+esc(label)+'</small><strong>'+esc(val)+'</strong><p>'+esc(note)+'</p><button type="button" data-prep-tab="'+tab+'">Abrir '+(tab==='guests'?'convidados':tab==='finance'?'financeiro':'ações')+' →</button></article>').join('');
 const list=(items,kind)=>items.length?items.map(x=>{const label=kind==='task'?x.title||x.description||'Ação sem título':x.e.description||x.e.title||'Despesa';const due=kind==='task'?x.due:x.p.due;const amount=kind==='payment'?' · '+money(x.balance):'';return '<li><span>'+esc(label)+'</span><small>'+esc(date(due)+amount+(due<today?' · ATRASADO':''))+'</small></li>'}).join(''):'<li class="oliverPrepEmpty">Nenhum vencimento cadastrado.</li>';
 const details=detailCards.map(c=>({label:c.querySelector('span')?.textContent||'',value:c.querySelector('strong')?.textContent||'',hint:c.querySelector('small')?.textContent||''}));const key=JSON.stringify([cardsData,nextTasks,nextPayments,details,loading,error,days,last]);if(root.dataset.key===key)return;root.dataset.key=key;
 const wasOpen=root.querySelector('.oliverPrepDetails')?.open||false;root.innerHTML='<div class="oliverPrepHead"><div><span class="eyebrow">RETA FINAL · 04/12/2026</span><h2>Visão geral do Chá do Oliver</h2><p>Confirmações, próximos compromissos e financeiro em um só lugar.</p></div><strong>'+days+' dias para o chá</strong></div><div class="oliverPrepGrid">'+tiles+'</div><div class="oliverPrepLists"><article><div class="oliverPrepListHead"><h3>Próximas ações</h3><button data-prep-tab="planning">Ver todas</button></div><ul>'+(!planning?'<li>Sincronizando ações…</li>':list(nextTasks,'task'))+'</ul></article><article><div class="oliverPrepListHead"><h3>Próximos pagamentos</h3><button data-prep-tab="finance">Ver financeiro</button></div><ul>'+(!planning?'<li>Sincronizando pagamentos…</li>':list(nextPayments,'payment'))+'</ul></article></div><details class="oliverPrepDetails"'+(wasOpen?' open':'')+'><summary>Ver estatísticas completas <span>('+details.length+' indicadores)</span></summary><div class="oliverPrepDetailGrid">'+details.map(x=>'<div><small>'+esc(x.label)+'</small><strong>'+esc(x.value)+'</strong><p>'+esc(x.hint)+'</p></div>').join('')+'</div><button type="button" data-prep-tab="diapers" class="oliverPrepDiapersLink">Consultar fraldas previstas →</button></details><div class="oliverPrepSync"><span>'+(loading?'Atualizando dados…':error?esc(error):planning?'Planejamento sincronizado · '+new Date(last).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'Aguardando acesso ao planejamento')+'</span><button data-prep-refresh type="button">Atualizar agora</button></div>';
 root.querySelectorAll('[data-prep-tab]').forEach(b=>b.addEventListener('click',()=>jump(b.dataset.prepTab)));
 root.querySelector('[data-prep-refresh]')?.addEventListener('click',()=>refresh(true));
}
const observer=new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.adminTabs,.dashboard')||n.querySelector?.('.adminTabs,.dashboard')))))schedule()});
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('focus',()=>refresh(true));window.addEventListener('oliver-planning-saved',()=>refresh(true));window.addEventListener('oliver-admin-refresh',()=>refresh(true));
document.addEventListener('click',e=>{if(e.target.closest('[data-admin-tab]')){setTimeout(()=>{schedule();if((sessionStorage.getItem('oliverAdminTab')||'overview')==='overview')refresh()},0)}},true);
setInterval(()=>{if((sessionStorage.getItem('oliverAdminTab')||'overview')==='overview')refresh()},60000);
schedule();refresh(true);
})();