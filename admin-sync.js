/* Sincroniza alterações operacionais com o estado React do painel sem recarregar a página. */
(function(){
  let lastNotice='';
  let timer=null;
  function syncFromCheckin(){
    const notice=document.querySelector('.checkinSuccess');
    if(!notice)return;
    const key=(notice.textContent||'').trim();
    if(!key||key===lastNotice)return;
    lastNotice=key;
    clearTimeout(timer);
    timer=setTimeout(()=>window.dispatchEvent(new CustomEvent('oliver-admin-refresh')),80);
  }
  const observer=new MutationObserver(syncFromCheckin);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  syncFromCheckin();
})();