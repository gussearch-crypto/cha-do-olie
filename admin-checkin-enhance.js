/* Evoluções operacionais do Check-in — Chá do Oliver */
(function(){
  let filter='all', data=null, scheduled=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function urls(){
    const invite=[...performance.getEntriesByType('resource')].map(x=>x.name).find(x=>x.includes('/functions/v1/invite-api'));
    return invite?{invite,ops:invite.replace(/invite-api(?:\?.*)?$/,'event-ops')}:null;
  }
  async function load(){
    const u=urls(),adminCode=sessionStorage.getItem('oliverAdmin')||'';if(!u||!adminCode)return;
    try{
      const [a,b]=await Promise.all([
        fetch(u.invite,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'adminList',adminCode})}).then(r=>r.json()),
        fetch(u.ops,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'opsList',adminCode})}).then(r=>r.json())
      ]);
      const gm=new Map((b.guests||[]).map(g=>[g.id,g]));
      data=(a.families||[]).flatMap(f=>(f.guests||[]).map(g=>({family:f,guest:{...g,...(gm.get(g.id)||{})}}))).filter(x=>x.guest.attendance==='yes');
      schedule();
    }catch(e){console.warn('checkin enhance',e)}
  }
  function counts(){
    const arrived=(data||[]).filter(x=>x.guest.checked_in_at), adults=arrived.filter(x=>x.guest.person_type!=='child'), under=arrived.filter(x=>x.guest.person_type==='child'&&x.guest.child_age_group==='under_5'), plus=arrived.filter(x=>x.guest.person_type==='child'&&x.guest.child_age_group!=='under_5'), added=arrived.filter(x=>x.guest.added_at_event), occupants=adults.length+plus.length;
    return{arrived,adults,under,plus,added,occupants};
  }
  function render(){
    scheduled=false;const root=document.querySelector('.checkinManagement');if(!root||!data)return;
    const c=counts(),stats=root.querySelector('.checkinStats');
    if(stats){let op=root.querySelector('.checkinOperationalStats');if(!op){op=document.createElement('div');op.className='checkinOperationalStats';stats.insertAdjacentElement('afterend',op)}op.innerHTML=`<div class="opsMain"><span>Ocupantes presentes</span><strong>${c.occupants}</strong><small>adultos + crianças 5+</small></div><div><span>Adultos</span><strong>${c.adults.length}</strong></div><div><span>Crianças 5+</span><strong>${c.plus.length}</strong></div><div><span>Crianças &lt;5</span><strong>${c.under.length}</strong></div><div><span>Adicionados no evento</span><strong>${c.added.length}</strong></div>`}
    const search=root.querySelector('.checkinSearch');if(search){let filters=root.querySelector('.checkinQuickFilters');if(!filters){filters=document.createElement('div');filters.className='checkinQuickFilters';search.insertAdjacentElement('afterend',filters)}const totals={all:data.length,waiting:data.filter(x=>!x.guest.checked_in_at).length,arrived:c.arrived.length,added:data.filter(x=>x.guest.added_at_event).length};filters.innerHTML=[['all','Todos'],['waiting','Aguardando'],['arrived','Já chegaram'],['added','Adicionados no evento']].map(([k,l])=>`<button type="button" class="${filter===k?'active':''}" data-checkin-filter="${k}">${l}<b>${totals[k]}</b></button>`).join('');filters.querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.checkinFilter;applyFilter();render()})}
    enrichRows();applyFilter();
  }
  function enrichRows(){
    const root=document.querySelector('.checkinManagement');if(!root)return;const byName=new Map((data||[]).map(x=>[`${x.guest.name}@@${x.family.display_name}`,x]));
    root.querySelectorAll('.checkinGuest').forEach(row=>{const name=row.querySelector('.checkinGuestName')?.textContent?.trim()||'',fam=[...row.querySelectorAll('.checkinFamily')][0]?.childNodes;let family='';const small=row.querySelector('.checkinFamily');if(small){family=[...small.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim()}const item=byName.get(`${name}@@${family}`);if(!item)return;row.dataset.arrived=item.guest.checked_in_at?'1':'0';row.dataset.added=item.guest.added_at_event?'1':'0';if(item.guest.added_at_event&&!row.querySelector('.checkinEditAdded')){const btn=document.createElement('button');btn.type='button';btn.className='checkinEditAdded';btn.textContent='Editar cadastro';btn.onclick=()=>openGuest(item.family.display_name);row.appendChild(btn)}})
  }
  function applyFilter(){document.querySelectorAll('.eventCheckinList .checkinGuest').forEach(r=>{const show=filter==='all'||(filter==='waiting'&&r.dataset.arrived==='0')||(filter==='arrived'&&r.dataset.arrived==='1')||(filter==='added'&&r.dataset.added==='1');r.style.display=show?'':'none'})}
  function openGuest(family){
    const tab=document.querySelector('[data-admin-tab="guests"]');tab?.click();setTimeout(()=>{const input=document.querySelector('.adminTools input');if(input){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,family);input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();input.scrollIntoView({behavior:'smooth',block:'center'})}},80)
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(render)}
  document.addEventListener('admin-data-updated',load);document.addEventListener('admin-sections-ready',schedule);window.addEventListener('pageshow',()=>setTimeout(load,350),{passive:true});
  const ob=new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.checkinManagement')||n.querySelector?.('.checkinManagement')))))setTimeout(load,60)});ob.observe(document.documentElement,{childList:true,subtree:true});setTimeout(load,500);
})();