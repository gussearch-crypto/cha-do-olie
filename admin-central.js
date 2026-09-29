/* Filtros avançados e contadores — Chá do Oliver */
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

  function render(){
    document.querySelector('.eventCentral')?.remove();
    renderFilters();
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(render));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(applyAdvanced,0));
  render();
})();
