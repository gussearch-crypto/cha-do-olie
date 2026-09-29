/* Central do Evento + filtros avançados — Chá do Oliver */
(function(){
  let families=[];
  let tokenQuery='';
  let typeFilter='all';
  const originalFetch=window.fetch.bind(window);

  const isTest=f=>f?.is_test===true||String(f?.group_name||'').trim().toLowerCase()==='teste';
  const realFamilies=()=>families.filter(f=>!isTest(f));

  window.fetch=async function(input,init){
    const response=await originalFetch(input,init);
    try{
      if(typeof init?.body==='string'){
        const body=JSON.parse(init.body);
        if(body?.action==='adminList'&&response.ok){
          const data=await response.clone().json();
          families=Array.isArray(data?.families)?data.families:[];
          setTimeout(render,0);
        }
      }
    }catch(e){}
    return response;
  };

  function isUnder5(g){return g?.person_type==='child'&&g?.child_age_group==='under_5'}
  function isFivePlus(g){return g?.person_type==='child'&&g?.child_age_group&&g.child_age_group!=='under_5'}

  function metrics(){
    const fs=realFamilies(), guests=fs.flatMap(f=>f.guests||[]);
    const yes=guests.filter(g=>g.attendance==='yes');
    const no=guests.filter(g=>g.attendance==='no');
    const pending=guests.filter(g=>!g.attendance||g.attendance==='pending');
    const under5=yes.filter(isUnder5);
    const fivePlus=yes.filter(isFivePlus);
    const venue=yes.length-under5.length;
    const sent=fs.filter(f=>f.invite_sent).length;
    const unanswered=fs.filter(f=>f.invite_sent&&(!f.invite_status||['invited','waiting'].includes(f.invite_status))).length;
    const diapers=fs.flatMap(f=>f.diapers||[]), sizes={P:0,M:0,G:0,XG:0};
    diapers.forEach(d=>{if(sizes[d.diaper_size]!==undefined)sizes[d.diaper_size]++});
    return{nuclei:fs.length,people:guests.length,yes:yes.length,no:no.length,pending:pending.length,under5:under5.length,fivePlus:fivePlus.length,venue,sent,notSent:fs.length-sent,unanswered,diapers:diapers.length,sizes};
  }

  function card(label,value,detail,cls=''){
    return `<div class="centralCard ${cls}"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`;
  }

  function renderCentral(){
    const heading=document.querySelector('.adminHeading');
    if(!heading||!families.length)return;
    let section=document.querySelector('.eventCentral');
    if(!section){section=document.createElement('section');section.className='eventCentral';heading.insertAdjacentElement('afterend',section)}
    const m=metrics();
    section.innerHTML=`<div class="centralHead"><div><span class="eyebrow">CENTRAL DO EVENTO</span><h2>Visão geral do Chá do Oliver</h2><p>Indicadores operacionais sem considerar núcleos de teste.</p></div><div class="venueCapacity"><span>CONTABILIZADOS PELO SALÃO</span><strong>${m.venue} <small>/ 100</small></strong><div><i style="width:${Math.min(100,m.venue)}%"></i></div></div></div><div class="centralGrid">${card('NÚCLEOS',m.nuclei,'famílias convidadas')}${card('CONVIDADOS',m.people,'pessoas cadastradas')}${card('PRESENÇAS',m.yes,'presenças físicas','ok')}${card('OCUPANTES SALÃO',m.venue,'adultos + crianças de 5 anos ou mais','ok')}${card('A CONFIRMAR',m.pending,'pessoas pendentes','warn')}${card('NÃO IRÃO',m.no,'pessoas','no')}${card('CRIANÇAS < 5',m.under5,'confirmadas · não contam no salão')}${card('CRIANÇAS 5+',m.fivePlus,'confirmadas · contam no salão')}${card('CONVITES ENVIADOS',m.sent,`${m.notSent} ainda não enviados`,'ok')}${card('SEM RESPOSTA',m.unanswered,'núcleos já convidados','warn')}</div><div class="centralBottom"><div><b>Fraldas previstas</b><span>${m.diapers} pacote${m.diapers===1?'':'s'}</span></div>${Object.entries(m.sizes).map(([s,n])=>`<div class="centralDiaper"><b>${s}</b><strong>${n}</strong></div>`).join('')}</div>`;
  }

  function rowFamily(row){
    const number=(row.querySelector('.guestNumber')?.textContent||'').replace(/\D/g,'');
    const title=row.querySelector('.guestTitle h3')?.textContent?.trim()||'';
    return families.find(f=>String(f.number||'').padStart(2,'0')===number.padStart(2,'0'))||families.find(f=>f.display_name===title);
  }

  function applyAdvanced(){
    const rows=[...document.querySelectorAll('.guestList .guestRow')];
    rows.forEach(row=>{
      const f=rowFamily(row); if(!f)return;
      const guests=f.guests||[];
      const tokenOk=!tokenQuery||String(f.invite_pin_plain||'').includes(tokenQuery);
      const typeOk=typeFilter==='all'||(typeFilter==='adult'&&guests.some(g=>g.person_type!=='child'))||(typeFilter==='child'&&guests.some(g=>g.person_type==='child'));
      row.dataset.advancedHidden=(!tokenOk||!typeOk)?'1':'0';
      if(!tokenOk||!typeOk)row.style.setProperty('display','none','important');
      else if(row.style.getPropertyPriority('display')==='important')row.style.removeProperty('display');
    });
  }

  function renderChildCounters(box){
    let counters=box.querySelector('.childAgeCounters');
    if(!counters){counters=document.createElement('div');counters.className='childAgeCounters';box.appendChild(counters)}
    const guests=realFamilies().flatMap(f=>f.guests||[]);
    const under=guests.filter(isUnder5).length;
    const over=guests.filter(isFivePlus).length;
    counters.innerHTML=`<div class="childAgeCounter"><span>Crianças &lt; 5 anos</span><strong>${under}</strong></div><div class="childAgeCounter"><span>Crianças 5+ anos</span><strong>${over}</strong></div>`;
  }

  function renderFilters(){
    const tools=document.querySelector('.adminTools');if(!tools)return;
    let box=tools.querySelector('.advancedFilters');
    if(!box){
      box=document.createElement('div');box.className='advancedFilters';
      box.innerHTML='<input class="tokenSearch" inputmode="numeric" placeholder="Buscar token" aria-label="Buscar por token"><select class="personTypeFilter" aria-label="Filtrar por tipo de convidado"><option value="all">Todos os tipos</option><option value="adult">Com adulto</option><option value="child">Com criança</option></select><button type="button" class="clearAdvanced">Limpar filtros</button>';
      tools.appendChild(box);
      box.querySelector('.tokenSearch').addEventListener('input',e=>{tokenQuery=e.target.value.trim();applyAdvanced()});
      box.querySelector('.personTypeFilter').addEventListener('change',e=>{typeFilter=e.target.value;applyAdvanced()});
      box.querySelector('.clearAdvanced').addEventListener('click',()=>{tokenQuery='';typeFilter='all';box.querySelector('.tokenSearch').value='';box.querySelector('.personTypeFilter').value='all';const search=tools.querySelector(':scope > input');if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))}const group=tools.querySelector('.adminGroupFilter select');if(group){group.value='all';group.dispatchEvent(new Event('change',{bubbles:true}))}document.querySelector('.statusFilters button')?.click();document.querySelector('.sentFilters button')?.click();setTimeout(applyAdvanced,0)});
    }
    renderChildCounters(box);applyAdvanced();
  }

  function render(){renderCentral();renderFilters()}
  const observer=new MutationObserver(()=>requestAnimationFrame(render));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(applyAdvanced,0));
  render();
})();
