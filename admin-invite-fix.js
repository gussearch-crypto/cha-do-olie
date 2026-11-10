import {familyMessage,readMessageTemplates} from './oliver-message-templates.mjs';
function getFamilyData(row){
  const name=row.querySelector('.guestTitle h3')?.textContent.trim()||'Convidado';
  const tokenSpan=[...(row.querySelectorAll('.guestMeta span')||[])].find(el=>el.textContent.trim().startsWith('Token:'));
  const token=tokenSpan?.querySelector('b')?.textContent.trim()||'';
  return {name,token};
}
function inviteText(name,token){
 return familyMessage({display_name:name,invite_pin_plain:token},'invitation',readMessageTemplates(window.localStorage));
}
function enhanceInviteButtons(){
  document.querySelectorAll('.guestRow').forEach(row=>{
    row.querySelectorAll('.guestActions button').forEach(btn=>{
      const text=btn.textContent.trim();
      if(text.includes('Resetar token')) btn.remove();
      if(text.includes('Copiar convite')){
        btn.disabled=false;
        if(btn.dataset.initialInvite==='1')return;
        btn.dataset.initialInvite='1';
        btn.addEventListener('click',async e=>{
          e.preventDefault();e.stopImmediatePropagation();
          const {name,token}=getFamilyData(row);
          if(!token||token.includes('—')){alert('Token não disponível para este convite.');return;}
          try{await navigator.clipboard.writeText(inviteText(name,token));const old=btn.innerHTML;btn.textContent='✓ Convite copiado';setTimeout(()=>btn.innerHTML=old,1800)}catch{alert('Não foi possível copiar o convite.')}
        },true);
      }
    });
  });
}
const observer=new MutationObserver(enhanceInviteButtons);observer.observe(document.documentElement,{childList:true,subtree:true});enhanceInviteButtons();