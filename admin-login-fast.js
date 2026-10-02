/* Bootstrap rápido do painel: reutiliza a última lista válida apenas para abrir a sessão e atualiza em segundo plano. */
(function(){
  const KEY='oliverAdminListCache';
  const adminCode=sessionStorage.getItem('oliverAdmin')||'';
  if(!adminCode)return;
  try{
    const cached=JSON.parse(sessionStorage.getItem(KEY)||'null');
    if(cached?.data?.families){
      cached.at=Date.now();
      sessionStorage.setItem(KEY,JSON.stringify(cached));
      setTimeout(()=>{
        try{
          const current=JSON.parse(sessionStorage.getItem(KEY)||'null');
          if(current){current.at=0;sessionStorage.setItem(KEY,JSON.stringify(current))}
        }catch{}
        window.dispatchEvent(new Event('oliver-admin-refresh'));
      },1800);
    }
  }catch{}
})();