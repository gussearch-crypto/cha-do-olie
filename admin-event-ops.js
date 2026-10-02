/* Operação do evento — Chá do Oliver | check-in removido */
(function(){
let families=[],scheduled=false;
const originalFetch=window.fetch.bind(window);
const isTest=f=>f?.is_test===true||String(f?.group_name||'').trim().toLowerCase()==='teste';
const real=()=>families.filter(f=>!isTest(f));

window.fetch=async(input,init)=>{
  const r=await originalFetch(input,init);
  try{
    if(typeof init?.body==='string'){
      const b=JSON.parse(init.body);
      if(b.action==='adminList'&&r.ok){
        const d=await r.clone().json();
        families=Array.isArray(d.families)?d.families:[];
        schedule();
      }
    }
  }catch{}
  return r;
};

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;render()});
}

function renderReceipts(){
  const el=document.querySelector('.diaperManagement');
  if(!el||!families.length)return;
  let r=document.querySelector('.eventReceipts');
  if(!r){
    r=document.createElement('section');
    r.className='eventReceipts';
    el.insertAdjacentElement('afterend',r);
  }
  const fs=real();
  const packs=fs.flatMap(f=>(f.diapers||[]).map(d=>({family:f,diaper:d})));
  const planned=packs.filter(x=>x.diaper.source!=='event_extra');
  r.innerHTML=`<div class="compactHead"><div><span class="eyebrow">PLANEJAMENTO</span><h2>Fraldas previstas</h2><p>Esta visão representa a previsão definida pelos convites. A conferência física e o inventário serão realizados após o evento no controle de enxoval.</p></div></div><div class="eventOpsStats diaperPlanningStats"><div><span>TOTAL PREVISTO</span><strong>${planned.length}</strong></div>${['P','M','G','XG'].map(size=>`<div><span>TAMANHO ${size}</span><strong>${planned.filter(x=>x.diaper.diaper_size===size).length}</strong></div>`).join('')}</div><div class="diaperPostEventNote"><b>Inventário pós-evento</b><span>Recebimentos, quantidades reais, tamanhos e mimos serão conferidos após o evento no controle de enxoval do Oliver.</span></div>`;
}

function removeLegacyCheckin(){
  document.querySelectorAll('.checkinManagement').forEach(el=>el.remove());
}

function render(){
  removeLegacyCheckin();
  renderReceipts();
  document.dispatchEvent(new CustomEvent('admin-sections-ready'));
}

const ob=new MutationObserver(ms=>{
  if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.checkinManagement,.diaperManagement')||n.querySelector?.('.checkinManagement,.diaperManagement')))))schedule();
});
ob.observe(document.documentElement,{childList:true,subtree:true});
schedule();
})();
