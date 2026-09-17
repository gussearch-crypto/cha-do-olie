/* Controle de envio dos convites no painel */
(() => {
  const API=(import.meta.env?.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/invite-api';
  if(!API.startsWith('http')) return;
  let families=[];
  async function call(payload){const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Erro');return d}
  async function refresh(){
    const adminCode=sessionStorage.getItem('oliverAdmin'); if(!adminCode)return;
    try{const d=await call({action:'adminList',adminCode});families=d.families||[];decorate()}catch{}
  }
  function decorate(){
    document.querySelectorAll('.guestRow').forEach(row=>{
      if(row.querySelector('.inviteSentControl'))return;
      const number=(row.querySelector('.guestNumber')?.textContent||'').replace(/\D/g,'');
      const family=families.find(f=>String(f.number)===String(Number(number)));if(!family)return;
      const meta=row.querySelector('.guestMeta');if(!meta)return;
      const label=document.createElement('label');label.className='inviteSentControl';
      const input=document.createElement('input');input.type='checkbox';input.checked=!!family.invite_sent;
      const span=document.createElement('span');span.textContent=input.checked?'Convite enviado':'Convite não enviado';
      input.addEventListener('change',async()=>{const next=input.checked;input.disabled=true;try{await call({action:'adminSetInviteSent',adminCode:sessionStorage.getItem('oliverAdmin'),familyId:family.id,inviteSent:next});family.invite_sent=next;span.textContent=next?'Convite enviado':'Convite não enviado';label.classList.toggle('sent',next)}catch{input.checked=!next;alert('Não foi possível atualizar o controle de envio.')}finally{input.disabled=false}});
      label.classList.toggle('sent',input.checked);label.append(input,span);meta.append(label);
    });
  }
  const obs=new MutationObserver(decorate);obs.observe(document.documentElement,{childList:true,subtree:true});
  refresh();setInterval(refresh,30000);
})();