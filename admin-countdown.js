const EVENT_AT = new Date('2026-12-04T18:00:00-03:00');
const EVENT_DAY = '2026-12-04';
const APP_URL = 'https://cha-oliver-mvp.vercel.app/';
const VENUE = 'Salão Terra Mágica';
const ADDRESS = 'Av. das Nações, 151 - sobreloja, Parque Novo Oratório, Santo André - SP, 09260-000';
const MAPS_URL = 'https://share.google/PBbegIHEsNodcdRdk';

function saoPauloDay() {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function countdown(){const today=saoPauloDay();if(today===EVENT_DAY)return{label:'É hoje!',days:0,today:true};const diff=EVENT_AT.getTime()-Date.now();if(diff<=0)return{label:'O Chá do Oliver já aconteceu',days:0,past:true};const days=Math.ceil(diff/86400000);return{label:`Faltam ${days} dias`,days}}
function locationBlock(){return `📍 ${VENUE} - ${ADDRESS} | (${MAPS_URL})`}
function boldToken(token,fallback='[token do convite]'){const access=token&&!token.includes('—')?token:fallback;return `*${access}*`}
function addStyles(){if(document.getElementById('admin-countdown-style'))return;const style=document.createElement('style');style.id='admin-countdown-style';style.textContent=`.countdownCard{background:#667641;color:#fffaf0;border-radius:22px;padding:20px 28px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:24px}.countdownCard small{display:block;font-size:.68rem;letter-spacing:.14em;font-weight:700;color:#e9dfbc;margin-bottom:5px}.countdownCard strong{display:block;font-size:1.65rem}.countdownCard span{font-size:.82rem;color:#e9e5d4}.guestRow.hasReminder{grid-template-columns:72px 1fr auto;align-items:center}.guestRow.hasReminder .reminderAction{grid-column:3;justify-self:stretch;width:100%;box-sizing:border-box;border-top:1px solid #ded2ad;margin-top:0;padding-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px}.reminderAction .reminderInfo{font-size:.76rem;color:#747762;white-space:nowrap}.reminderAction button{min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid #cfc5a7;background:#fffaf0;color:#45532d;border-radius:12px;padding:0 16px;font:600 .88rem 'DM Sans',sans-serif;cursor:pointer;white-space:nowrap}.reminderAction button:hover{background:#f5f0e4}.reminderAction button svg{width:16px;height:16px}@media(max-width:1050px){.guestRow.hasReminder .reminderAction{grid-column:1/-1}.reminderAction .reminderInfo{white-space:normal}}@media(max-width:700px){.countdownCard{align-items:flex-start;flex-direction:column}.guestRow.hasReminder .reminderAction{align-items:stretch;flex-direction:column}.reminderAction button{width:100%}}`;document.head.appendChild(style)}
function mountCountdown(){const central=document.querySelector('.eventCentral');if(!central)return;let card=document.querySelector('.countdownCard');const c=countdown();if(!card){card=document.createElement('section');card.className='countdownCard';card.innerHTML=`<div><small>CONTAGEM REGRESSIVA</small><strong>${c.label}</strong><span>Chá do Oliver · 04/12/2026 às 18h</span></div><div>💛 🦁 🐼 🦒 🐓</div>`}else{const strong=card.querySelector('strong');if(strong)strong.textContent=c.label}if(card.nextElementSibling!==central)central.insertAdjacentElement('beforebegin',card)}
function getFamilyStatus(row){const status=row.querySelector('.guestTitle .status');if(!status)return'other';if(status.classList.contains('confirmed'))return'confirmed';if(status.classList.contains('declined'))return'declined';if(status.classList.contains('partial'))return'partial';return'pending'}
function getToken(row){const meta=row.querySelector('.guestMeta');if(!meta)return'';const tokenSpan=[...meta.querySelectorAll('span')].find(el=>el.textContent.trim().startsWith('Token:'));return tokenSpan?.querySelector('b')?.textContent.trim()||''}
function reminderKind(row){
 const guests=[...row.querySelectorAll('.guestPeople .personStatus')];
 const hasPending=guests.some(el=>el.classList.contains('waiting'));
 const hasConfirmed=guests.some(el=>el.classList.contains('yes'));
 if(hasPending)return 'reminder';
 if(hasConfirmed)return 'eventReminder';
 return null;
}
function mountReminder(row){
 const actions=row.querySelector('.guestActions');
 if(!actions)return;
 const familyId=row.dataset.familyId;
 if(!familyId)return;
 const kind=reminderKind(row);
 let bar=row.querySelector('.reminderAction');
 if(!kind){
  bar?.remove();
  row.classList.remove('hasReminder');
  return;
 }
 if(!bar){
  row.classList.add('hasReminder');
  bar=document.createElement('div');
  bar.className='reminderAction';
  const span=document.createElement('span');span.className='reminderInfo';
  const button=document.createElement('button');button.type='button';
  bar.append(span,button);
  button.addEventListener('click',()=>{
   window.dispatchEvent(new CustomEvent('oliver-copy-official-reminder',{detail:{familyId}}));
  });
  actions.insertAdjacentElement('afterend',bar);
 }
 const c=countdown();
 bar.querySelector('.reminderInfo').textContent=c.today?'Lembrete · É hoje!':'Lembrete · '+c.label;
 const label=kind==='reminder'?'Copiar lembrete de confirmação':'Copiar lembrete do evento';
 const button=bar.querySelector('button');
 button.textContent=label;
 button.setAttribute('aria-label',label);
}
function enhance(){addStyles();mountCountdown();document.querySelectorAll('.guestRow').forEach(mountReminder)}
document.addEventListener('admin-sections-ready',enhance);document.addEventListener('admin-data-updated',enhance);enhance();setInterval(enhance,60000);
