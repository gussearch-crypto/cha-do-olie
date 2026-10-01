/* Evoluções operacionais do Check-in — Chá do Oliver
   IMPORTANTE: este módulo é progressivo e só inicia depois que o painel já
   estiver autenticado/renderizado. Não observa o DOM global durante o login. */
(function(){
  let filter='all', data=null, loading=false, started=false;

  function root(){ return document.querySelector('.checkinManagement'); }
  function urls(){
    const invite=[...performance.getEntriesByType('resource')].map(x=>x.name).find(x=>x.includes('/functions/v1/invite-api'));
    return invite?{invite,ops:invite.replace(/invite-api(?:\?.*)?$/,'event-ops')}:null;
  }
  async function load(){
    const el=root(), u=urls(), adminCode=sessionStorage.getItem('oliverAdmin')||'';
    if(!el||!u||!adminCode||loading)return;
    loading=true;
    try{
      const [ra,rb]=await Promise.all([
        fetch(u.invite,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'adminList',adminCode})}),
        fetch(u.ops,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'opsList',adminCode})})
      ]);
      if(!ra.ok||!rb.ok)throw Error('load_failed');
      const [a,b]=await Promise.all([ra.json(),rb.json()]), gm=new Map((b.guests||[]).map(g=>[String(g.id),g]));
      data=(a.families||[]).flatMap(f=>(f.guests||[]).map(g=>({family:f,guest:{...g,...(gm.get(String(g.id))||{})}}))).filter(x=>x.guest.attendance==='yes');
      render();
    }catch(e){ console.warn('checkin enhance',e); }
    finally{ loading=false; }
  }
  function counts(){
    const arrived=(data||[]).filter(x=>x.guest.checked_in_at), adults=arrived.filter(x=>x.guest.person_type!=='child'), under=arrived.filter(x=>x.guest.person_type==='child'&&x.guest.child_age_group==='under_5'), plus=arrived.filter(x=>x.guest.person_type==='child'&&x.guest.child_age_group!=='under_5'), added=arrived.filter(x=>x.guest.added_at_event);
    return {arrived,adults,under,plus,added,occupants:adults.length+plus.length};
  }
  function syncRows(el){
    const state=new Map((data||[]).map(x=>[String(x.guest.id),x.guest]));
    el.querySelectorAll('.checkinGuest').forEach(row=>{
      const btn=row.querySelector('[data-checkin]'), g=state.get(String(btn?.dataset.checkin));
      if(!btn||!g)return;
      const arrived=!!g.checked_in_at;
      row.classList.toggle('isChecked',arrived);
      btn.dataset.next=arrived?'0':'1';
      btn.classList.toggle('received',arrived);
      btn.textContent=arrived?'✓ Chegou · desfazer':'Confirmar chegada';
      const status=row.querySelector('.checkinFamily');
      if(status){ const badges=[...status.querySelectorAll('em')].map(x=>x.outerHTML).join(''); status.innerHTML=(arrived?'✓ Presença registrada':'Aguardando chegada')+badges; }
    });
  }
  function render(){
    const el=root(); if(!el||!data)return;
    syncRows(el);
    const c=counts(), stats=el.querySelector('.checkinStats');
    if(stats){
      let op=el.querySelector('.checkinOperationalStats');
      if(!op){op=document.createElement('div');op.className='checkinOperationalStats';stats.insertAdjacentElement('afterend',op)}
      op.innerHTML=`<div class="opsMain"><span>Ocupantes presentes</span><strong>${c.occupants}</strong><small>adultos + crianças 5+</small></div><div><span>Adultos</span><strong>${c.adults.length}</strong></div><div><span>Crianças 5+</span><strong>${c.plus.length}</strong></div><div><span>Crianças &lt;5</span><strong>${c.under.length}</strong></div><div><span>Adicionados no evento</span><strong>${c.added.length}</strong></div>`;
    }
    const search=el.querySelector('.checkinSearch');
    if(search){
      let filters=el.querySelector('.checkinQuickFilters');
      if(!filters){filters=document.createElement('div');filters.className='checkinQuickFilters';search.insertAdjacentElement('afterend',filters)}
      const totals={all:data.length,waiting:data.filter(x=>!x.guest.checked_in_at).length,arrived:c.arrived.length,added:data.filter(x=>x.guest.added_at_event).length};
      filters.innerHTML=[['all','Todos'],['waiting','Aguardando'],['arrived','Já chegaram'],['added','Adicionados no evento']].map(([k,l])=>`<button type="button" class="${filter===k?'active':''}" data-checkin-filter="${k}">${l}<b>${totals[k]}</b></button>`).join('');
    }
    applyFilter(el);
  }
  function applyFilter(el){
    el.querySelectorAll('.checkinFamilyGroup').forEach(group=>{
      let visible=0;
      group.querySelectorAll('.checkinGuest').forEach(row=>{
        const arrived=row.classList.contains('isChecked'), added=(row.textContent||'').includes('ADICIONADO NO EVENTO');
        const show=filter==='all'||(filter==='waiting'&&!arrived)||(filter==='arrived'&&arrived)||(filter==='added'&&added);
        row.style.display=show?'':'none'; if(show)visible++;
      });
      group.style.display=visible?'':'none';
    });
    const shown=[...el.querySelectorAll('.checkinGuest')].filter(r=>r.style.display!=='none'&&r.closest('.checkinFamilyGroup')?.style.display!=='none').length;
    const count=el.querySelector('.checkinListHeader span:last-child'); if(count)count.textContent=`${shown} ${shown===1?'resultado':'resultados'}`;
  }
  function start(){
    if(started||!root()||!sessionStorage.getItem('oliverAdmin'))return;
    started=true; load();
  }
  document.addEventListener('click',e=>{
    const f=e.target.closest('[data-checkin-filter]');
    if(f&&root()){e.preventDefault();filter=f.dataset.checkinFilter;render();return;}
    if(root()&&e.target.closest('[data-checkin],[data-family-checkin]'))setTimeout(load,250);
  });
  document.addEventListener('admin-data-updated',()=>{start();if(started)setTimeout(load,80)});
  document.addEventListener('admin-sections-ready',()=>{start();if(started)render()});
  window.addEventListener('oliver-admin-refresh',()=>{start();if(started)setTimeout(load,80)});
  window.addEventListener('pageshow',()=>setTimeout(start,500),{passive:true});
  setTimeout(start,700);
})();