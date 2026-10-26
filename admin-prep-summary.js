/* Painel executivo do Chá do Oliver — reutiliza estatísticas existentes */
(function(){
 const sync=()=>{
  const nav=document.querySelector('.adminTabs'),dash=document.querySelector('.adminWrap > .dashboard, .adminWrap .dashboard');
  if(!nav||!dash||!document.querySelector('[data-admin-tab="overview"]'))return;
  let panel=document.querySelector('#oliver-prep-summary');
  if(!panel){panel=document.createElement('section');panel.id='oliver-prep-summary';panel.className='oliverPrepSummary adminTabbedBlock';dash.insertAdjacentElement('beforebegin',panel)}
  const cards=[...dash.querySelectorAll('.statCard')];
  const value=word=>{const c=cards.find(e=>e.textContent.toUpperCase().includes(word));return c?.querySelector('strong')?.textContent?.trim()||'—'};
  const confirmed=value('CONFIRMADOS'),pending=value('A CONFIRMAR');
  let planning=null;try{const d=JSON.parse(localStorage.getItem('oliverEventPlanningV2')||'null');if(Array.isArray(d?.tasks)&&Array.isArray(d?.expenses))planning=d}catch{}
  const now=new Date();const today=new Date(now.toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));const days=Math.max(0,Math.ceil((new Date(2026,11,4,18)-today)/86400000));
  const data=[['CONFIRMADOS ELEGÍVEIS',confirmed+' / 100','Adultos e crianças a partir de 5 anos','guests'],['A CONFIRMAR',pending,'Prazo inicial: 30/11 · substituições permitidas após o prazo','guests'],['AÇÕES PENDENTES',planning?planning.tasks.filter(x=>x.status!=='done').length:'—',planning?'Última visão salva neste navegador':'Consulte o módulo Planejamento','planning'],['FINANCEIRO E FORNECEDORES',planning?planning.expenses.length:'—',planning?'Registros financeiros · confira saldos no Planejamento':'Consulte o módulo Planejamento','planning']];
  const key=data.map(x=>x.join('|')).join(';')+'|'+days;
  if(panel.dataset.key===key)return;panel.dataset.key=key;
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  panel.innerHTML='<div class="oliverPrepHead"><div><span class="eyebrow">RETA FINAL · 04/12/2026</span><h2>Preparação do Chá do Oliver</h2><p>Visão resumida dos dados que já existem no painel.</p></div><strong>'+days+' dias para o chá</strong></div><div class="oliverPrepGrid">'+data.map(x=>'<article><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong><p>'+esc(x[2])+'</p><button type="button" data-prep-tab="'+x[3]+'">Abrir '+(x[3]==='guests'?'convidados':'planejamento')+' →</button></article>').join('')+'</div><p class="oliverPrepFoot">Indicadores de planejamento utilizam os últimos dados disponíveis neste navegador. Pagamentos e prazos devem ser conferidos no módulo Planejamento.</p>';
  panel.querySelectorAll('[data-prep-tab]').forEach(b=>b.addEventListener('click',()=>document.querySelector('[data-admin-tab="'+b.dataset.prepTab+'"]')?.click()));
  panel.classList.toggle('adminTabHidden',sessionStorage.getItem('oliverAdminTab')!=='overview');
 };
 let pending=false;const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;sync()})};
 const observer=new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.dashboard,.adminTabs,.adminWrap')||n.querySelector?.('.dashboard,.adminTabs')))))schedule()});observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('click',e=>{if(e.target.closest('[data-admin-tab]'))setTimeout(schedule,0)},true);window.addEventListener('focus',schedule);window.addEventListener('storage',schedule);schedule();
})();
