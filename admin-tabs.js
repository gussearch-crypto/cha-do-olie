/* Navegação por abas do painel — Chá do Oliver */
(function(){
 let active=sessionStorage.getItem('oliverAdminTab')||'overview';
 let scheduled=false;
 const defs=[['overview','Visão geral'],['guests','Convidados'],['pending','Pendências'],['diapers','Fraldas'],['management','Gestão']];
 const selectors={overview:['.eventCentral','.dashboard'],guests:['.adminManagerBar','.adminAdd','.adminError','.confirmationFilter','.adminTools','.guestList'],pending:['.eventOperations'],diapers:['.diaperManagement'],management:['.giftDashboard','.adminActivity','.activitySection']};

 function ensureTabs(){
  const heading=document.querySelector('.adminHeading');
  if(!heading)return null;
  let nav=document.querySelector('.adminTabs');
  if(nav)return nav;
  nav=document.createElement('nav');
  nav.className='adminTabs';
  nav.setAttribute('aria-label','Seções do painel');
  nav.innerHTML=defs.map(([k,l])=>`<button type="button" data-admin-tab="${k}">${l}</button>`).join('');
  heading.insertAdjacentElement('afterend',nav);
  nav.addEventListener('click',e=>{
   const b=e.target.closest('[data-admin-tab]');
   if(!b||b.dataset.adminTab===active)return;
   active=b.dataset.adminTab;
   sessionStorage.setItem('oliverAdminTab',active);
   apply();
  });
  return nav;
 }

 function apply(){
  scheduled=false;
  const nav=ensureTabs();
  if(!nav)return;
  if(active==='management'&&!document.querySelector('.giftDashboard,.adminActivity,.activitySection')){
   active='overview';
   sessionStorage.setItem('oliverAdminTab',active);
  }
  nav.querySelectorAll('[data-admin-tab]').forEach(b=>{
   const on=b.dataset.adminTab===active;
   if(b.classList.contains('active')!==on)b.classList.toggle('active',on);
   if(b.getAttribute('aria-selected')!==(on?'true':'false'))b.setAttribute('aria-selected',on?'true':'false');
  });
  Object.entries(selectors).forEach(([tab,list])=>list.forEach(sel=>document.querySelectorAll(sel).forEach(el=>{
   if(!el.classList.contains('adminTabbedBlock'))el.classList.add('adminTabbedBlock');
   const hidden=tab!==active;
   if(el.classList.contains('adminTabHidden')!==hidden)el.classList.toggle('adminTabHidden',hidden);
  })));
 }

 function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(apply);
 }

 /* Atualiza somente quando os módulos do painel avisam que mudaram.
    Evita observar o DOM inteiro continuamente, o que afetava o scroll. */
 document.addEventListener('admin-sections-ready',schedule);
 document.addEventListener('admin-data-updated',schedule);
 window.addEventListener('pageshow',schedule,{passive:true});

 /* Fallback curto apenas na inicialização, para aguardar o painel assíncrono. */
 let attempts=0;
 const boot=setInterval(()=>{
  attempts++;
  schedule();
  const ready=document.querySelector('.adminHeading')&&document.querySelector('.adminTabs');
  if(ready||attempts>=20)clearInterval(boot);
 },150);
 schedule();
})();
