/* Filtro por grupo — painel administrativo */
(function(){
  let selected='all';

  function getRows(){return [...document.querySelectorAll('.guestList .guestRow')]}

  function rowGroup(row){
    const meta=[...row.querySelectorAll('.guestMeta > span')];
    const group=meta.find(el=>!el.textContent.trim().startsWith('Token:')&&!el.textContent.trim().startsWith('Fraldas:'));
    return group?group.textContent.trim():'';
  }

  function groups(){
    return [...new Set(getRows().map(rowGroup).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  }

  function apply(){
    const rows=getRows();
    rows.forEach(row=>{
      const matches=selected==='all'||rowGroup(row)===selected;
      row.style.display=matches?'':'none';
    });
    const counter=document.querySelector('.adminTools > span');
    if(counter&&selected!=='all'){
      const n=rows.filter(r=>r.style.display!=='none').length;
      counter.textContent=`${n} núcleo${n===1?'':'s'} · ${selected}`;
    }
  }

  function render(){
    const tools=document.querySelector('.adminTools');
    if(!tools)return;
    let wrap=tools.querySelector('.adminGroupFilter');
    if(!wrap){
      wrap=document.createElement('label');
      wrap.className='adminGroupFilter';
      wrap.innerHTML='<span>Grupo</span><select aria-label="Filtrar convidados por grupo"></select>';
      const input=tools.querySelector('input');
      input?input.insertAdjacentElement('afterend',wrap):tools.prepend(wrap);
      wrap.querySelector('select').addEventListener('change',e=>{selected=e.target.value;apply()});
    }
    const select=wrap.querySelector('select');
    const values=groups();
    if(selected!=='all'&&!values.includes(selected))selected='all';
    const signature=['all',...values].join('|');
    if(select.dataset.signature!==signature){
      select.innerHTML='<option value="all">Todos os grupos</option>'+values.map(g=>`<option value="${g.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}">${g.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');
      select.value=selected;
      select.dataset.signature=signature;
    }
    apply();
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(render));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('input',e=>{if(e.target.matches('.adminTools input'))requestAnimationFrame(()=>{render();apply()})});
  render();
})();
