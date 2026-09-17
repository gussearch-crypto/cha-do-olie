function menuIcon(open){return open?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'}
function enhanceHeader(){
 document.querySelectorAll('header').forEach(header=>{
  const nav=header.querySelector('nav');if(!nav||header.querySelector('.mobileMenuButton'))return;
  const btn=document.createElement('button');btn.type='button';btn.className='mobileMenuButton';btn.setAttribute('aria-label','Abrir menu');btn.setAttribute('aria-expanded','false');btn.innerHTML=menuIcon(false);header.insertBefore(btn,nav);
  const close=()=>{header.classList.remove('mobileMenuOpen');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Abrir menu');btn.innerHTML=menuIcon(false)};
  btn.addEventListener('click',e=>{e.stopPropagation();const open=header.classList.toggle('mobileMenuOpen');btn.setAttribute('aria-expanded',String(open));btn.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');btn.innerHTML=menuIcon(open)});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('click',e=>{if(!header.contains(e.target))close()});
  window.addEventListener('resize',()=>{if(innerWidth>760)close()});
 });
}
const observer=new MutationObserver(enhanceHeader);observer.observe(document.documentElement,{childList:true,subtree:true});enhanceHeader();
