/* Operação do evento: check-in, fraldas recebidas e mimo — Chá do Oliver */
(function(){
  let families=[];
  let adminCode=sessionStorage.getItem('oliverAdmin')||'';
  let checkinQuery='';
  let busy=false;
  let scheduled=false;
  const originalFetch=window.fetch.bind(window);
  const supabaseUrl=(window.__SUPABASE_URL__||'').replace(/\/$/,'');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isTest=f=>f?.is_test===true||String(f?.group_name||'').trim().toLowerCase()==='teste';
  const real=()=>families.filter(f=>!isTest(f));

  function apiUrl(){
    const invite=[...performance.getEntriesByType('resource')].map(x=>x.name).find(x=>x.includes('/functions/v1/invite-api'));
    if(invite)return invite.replace(/invite-api(?:\?.*)?$/,'event-ops');
    if(supabaseUrl)return supabaseUrl+'/functions/v1/event-ops';
    return '';
  }
  async function eventApi(payload){
    const url=apiUrl();
    if(!url)throw new Error('event_ops_url_unavailable');
    const r=await originalFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,adminCode})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'event_ops_failed');
    return d;
  }
  window.fetch=async(input,init)=>{
    const r=await originalFetch(input,init);
    try{
      if(typeof init?.body==='string'){
        const b=JSON.parse(init.body);
        if(b.action==='adminList'&&r.ok){
          adminCode=b.adminCode||adminCode;
          const d=await r.clone().json();
          families=Array.isArray(d.families)?d.families:[];
          schedule();
        }
      }
    }catch{}
    return r;
  };
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()});}
  function confirmedRows(){return families.flatMap(f=>(f.guests||[]).filter(g=>g.attendance==='yes').map(g=>({family:f,guest:g})));}
  function renderCheckin(){
    const anchor=document.querySelector('.eventOperations')||document.querySelector('.eventCentral')||document.querySelector('.dashboard');
    if(!anchor||!families.length)return;
    let el=document.querySelector('.checkinManagement');
    if(!el){el=document.createElement('section');el.className='checkinManagement adminTabSection';el.dataset.tab='checkin';anchor.insertAdjacentElement('afterend',el);}
    const rows=confirmedRows();
    const checked=rows.filter(x=>x.guest.checked_in_at);
    const waiting=rows.length-checked.length;
    const q=checkinQuery.trim().toLowerCase();
    const shown=rows.filter(x=>!q||String(x.guest.name||'').toLowerCase().includes(q)||String(x.family.display_name||'').toLowerCase().includes(q));
    el.innerHTML=`<div class="compactHead checkinHead"><div><span class="eyebrow">DIA DO EVENTO</span><h2>Check-in</h2><p>Registre a chegada individual dos convidados confirmados.</p></div></div>
      <div class="eventOpsStats checkinStats">
        <div class="checkinStat total"><span>Confirmados</span><strong>${rows.length}</strong><small>convidados esperados</small></div>
        <div class="checkinStat arrived"><span>Já chegaram</span><strong>${checked.length}</strong><small>check-ins realizados</small></div>
        <div class="checkinStat waiting"><span>Aguardando</span><strong>${waiting}</strong><small>ainda não chegaram</small></div>
      </div>
      <div class="eventOpsSearch checkinSearch"><input type="search" placeholder="Buscar convidado ou núcleo familiar" value="${esc(checkinQuery)}"></div>
      <div class="checkinListHeader"><span>Convidado</span><span>${shown.length} ${shown.length===1?'resultado':'resultados'}</span></div>
      <div class="compactList eventCheckinList">${shown.length?shown.map(({family,guest})=>`<div class="checkinGuest ${guest.checked_in_at?'isChecked':''}"><span class="checkinGuestInfo"><b class="checkinGuestName">${esc(guest.name)}</b><small class="checkinFamily"><i>Núcleo</i>${esc(family.display_name)}${isTest(family)?'<em>TESTE</em>':''}</small></span><button class="${guest.checked_in_at?'received':''}" data-checkin="${esc(guest.id)}" data-next="${guest.checked_in_at?'0':'1'}">${guest.checked_in_at?'✓ Chegou · desfazer':'Confirmar chegada'}</button></div>`).join(''):'<div class="compactEmpty">Nenhum convidado encontrado.</div>'}</div>`;
    el.querySelector('input').oninput=e=>{checkinQuery=e.target.value;renderCheckin();};
    el.querySelectorAll('[data-checkin]').forEach(b=>b.onclick=async()=>{if(busy)return;busy=true;b.disabled=true;try{await eventApi({action:'setCheckin',guestId:b.dataset.checkin,checked:b.dataset.next==='1'});await refreshAdmin();}catch{alert('Não foi possível atualizar o check-in.');}finally{busy=false;b.disabled=false;}});
  }
  function renderReceipts(){
    const el=document.querySelector('.diaperManagement');if(!el||!families.length)return;
    let receipt=document.querySelector('.eventReceipts');if(!receipt){receipt=document.createElement('section');receipt.className='eventReceipts';el.insertAdjacentElement('afterend',receipt);}
    const fs=real();const packages=fs.flatMap(f=>(f.diapers||[]).map(d=>({family:f,diaper:d})));const received=packages.filter(x=>x.diaper.received_at);const giftFamilies=fs.filter(f=>f.optional_gift_received_at);
    receipt.innerHTML=`<div class="compactHead"><div><span class="eyebrow">RECEBIMENTOS</span><h2>Fraldas e mimos</h2><p>Controle o que efetivamente foi entregue no evento.</p></div></div><div class="eventOpsStats"><div><span>FRALDAS PREVISTAS</span><strong>${packages.length}</strong></div><div><span>RECEBIDAS</span><strong>${received.length}</strong></div><div><span>PENDENTES</span><strong>${packages.length-received.length}</strong></div><div><span>MIMOS RECEBIDOS</span><strong>${giftFamilies.length}</strong></div></div><div class="compactList eventReceiptList">${packages.map(({family,diaper})=>`<div><span><b>${esc(family.display_name)}</b><small>Fralda ${esc(diaper.diaper_size)}</small></span><button class="${diaper.received_at?'received':''}" data-diaper="${esc(diaper.id||'')}" data-next="${diaper.received_at?'0':'1'}" ${!diaper.id?'disabled':''}>${diaper.received_at?'✓ Recebida · desfazer':'Marcar recebida'}</button></div>`).join('')}</div><div class="compactHead giftReceiptHead"><div><h3>Mimo opcional</h3><p>Marcação por núcleo, sem obrigatoriedade.</p></div></div><div class="compactList eventGiftList">${fs.filter(f=>(f.guests||[]).some(g=>g.attendance==='yes')).map(f=>`<div><span><b>${esc(f.display_name)}</b></span><button class="${f.optional_gift_received_at?'received':''}" data-gift="${esc(f.id)}" data-next="${f.optional_gift_received_at?'0':'1'}">${f.optional_gift_received_at?'✓ Recebido · desfazer':'Marcar mimo recebido'}</button></div>`).join('')}</div>`;
    receipt.querySelectorAll('[data-diaper]').forEach(b=>b.onclick=async()=>{if(busy||!b.dataset.diaper)return;busy=true;b.disabled=true;try{await eventApi({action:'setDiaperReceived',diaperId:b.dataset.diaper,received:b.dataset.next==='1'});await refreshAdmin();}catch{alert('Não foi possível atualizar a fralda.');}finally{busy=false;b.disabled=false;}});
    receipt.querySelectorAll('[data-gift]').forEach(b=>b.onclick=async()=>{if(busy)return;busy=true;b.disabled=true;try{await eventApi({action:'setOptionalGiftReceived',familyId:b.dataset.gift,received:b.dataset.next==='1'});await refreshAdmin();}catch{alert('Não foi possível atualizar o mimo.');}finally{busy=false;b.disabled=false;}});
  }
  async function refreshAdmin(){
    const invite=[...performance.getEntriesByType('resource')].map(x=>x.name).find(x=>x.includes('/functions/v1/invite-api'));if(!invite){location.reload();return;}
    try{const r=await originalFetch(invite,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'adminList',adminCode})});const d=await r.json();if(r.ok){families=d.families||[];document.dispatchEvent(new CustomEvent('admin-data-updated'));schedule();return;}}catch{}location.reload();
  }
  function render(){renderCheckin();renderReceipts();document.dispatchEvent(new CustomEvent('admin-sections-ready'));}
  const ob=new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.eventOperations,.diaperManagement,.eventCentral')||n.querySelector?.('.eventOperations,.diaperManagement,.eventCentral')))))schedule();});ob.observe(document.documentElement,{childList:true,subtree:true});schedule();
})();