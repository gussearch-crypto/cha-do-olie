function addCheckinNavLink(){
  if (location.pathname === '/checkin' || new URLSearchParams(location.search).get('painel') === '1') return;
  const nav = document.querySelector('header nav');
  if (!nav || nav.querySelector('a[href="/checkin"]')) return;
  const painel = nav.querySelector('a[href="/?painel=1"]');
  const link = document.createElement('a');
  link.href = '/checkin';
  link.textContent = 'Check-in';
  if (painel) nav.insertBefore(link, painel); else nav.appendChild(link);
}

const observer = new MutationObserver(() => {
  addCheckinNavLink();
  if (document.querySelector('header nav a[href="/checkin"]')) observer.disconnect();
});
observer.observe(document.documentElement,{childList:true,subtree:true});
addCheckinNavLink();
