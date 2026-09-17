const APP_URL='https://cha-oliver-mvp.vercel.app/';
const MAPS_URL='https://www.google.com/maps/search/?api=1&query=Av.%20das%20Na%C3%A7%C3%B5es%2C%20151%20-%20Parque%20Novo%20Orat%C3%B3rio%2C%20Santo%20Andr%C3%A9%20-%20SP%2C%2009260-000';
const ADDRESS='Av. das Nações, 151 - sobreloja\nParque Novo Oratório · Santo André - SP\n09260-000';

function getFamilyData(row){
  const name=row.querySelector('.guestTitle h3')?.textContent.trim()||'Convidado';
  const tokenSpan=[...(row.querySelectorAll('.guestMeta span')||[])].find(el=>el.textContent.trim().startsWith('Token:'));
  const token=tokenSpan?.querySelector('b')?.textContent.trim()||'';
  return {name,token};
}
function inviteText(name,token){
  return `Olá, ${name}! 💛\n\nEstamos preparando com muito carinho o Chá do Oliver e queremos celebrar esse momento com vocês.\n\nAcesse o convite:\n${APP_URL}\n\nPara confirmar a presença, procure pelo nome de um dos integrantes da família e utilize o código de acesso:\n${token}\n\n📅 04 de dezembro (sexta-feira)\n🕕 Das 18h às 22h\n📍 Salão Terra Mágica\n${ADDRESS}\n\n🗺️ Google Maps:\n${MAPS_URL}\n\nTraga o amor, o sorriso e a fralda: estamos em contagem regressiva. 💛`;
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