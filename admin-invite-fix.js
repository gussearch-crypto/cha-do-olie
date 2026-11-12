/* Compatibilidade visual dos convites. Não interceptar cliques: o React
   consulta o modelo oficial no Supabase antes de copiar cada mensagem. */
function preserveInviteControls(){
 document.querySelectorAll('.guestRow .guestActions button').forEach(button=>{
  if(button.textContent.trim().includes('Resetar token'))button.remove();
 });
}
const observer=new MutationObserver(preserveInviteControls);
observer.observe(document.documentElement,{childList:true,subtree:true});
preserveInviteControls();
