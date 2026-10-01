/* Sincroniza alterações operacionais com o estado React do painel sem recarregar a página. */
(function(){
  let lastNotice='';
  let timer=null;
  let editWasOpen=false;
  let addWasOpen=false;
  function refresh(delay=80){
    clearTimeout(timer);
    timer=setTimeout(()=>window.dispatchEvent(new CustomEvent('oliver-admin-refresh')),delay);
  }
  function syncPanel(){
    const notice=document.querySelector('.checkinSuccess');
    if(notice){
      const key=(notice.textContent||'').trim();
      if(key&&key!==lastNotice){lastNotice=key;refresh(80)}
    }

    const editOpen=!!document.querySelector('.adminAdd.editBox');
    if(editWasOpen&&!editOpen)refresh(180);
    editWasOpen=editOpen;

    const addOpen=!!document.querySelector('.adminAdd:not(.editBox)');
    if(addWasOpen&&!addOpen)refresh(180);
    addWasOpen=addOpen;
  }
  const observer=new MutationObserver(syncPanel);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  syncPanel();
})();