function enhanceGiftResult(){
  const result=document.querySelector('.result');
  if(!result)return;
  const gifts=[...result.querySelectorAll('.gift')];
  const qty=gifts.length;
  gifts.forEach(gift=>{
    const diaperLine=gift.querySelector('b');
    if(diaperLine&&diaperLine.textContent.includes('pacote de fraldas')){
      let brands=gift.querySelector('.diaperBrands');
      if(!brands){
        brands=document.createElement('span');
        brands.className='diaperBrands';
        diaperLine.insertAdjacentElement('afterend',brands);
      }
      const suggestedBrands='Marcas sugeridas: Huggies, Pampers, PomPom ou Turma da Mônica.';
      if(brands.textContent!==suggestedBrands)brands.textContent=suggestedBrands;
    }
  });
  if(gifts.length){
    let note=result.querySelector('.diaperBrandsDisclaimer');
    if(!note){
      note=document.createElement('p');
      note.className='diaperBrandsDisclaimer';
    }
    const disclaimer='As marcas são apenas sugestões de padrão, não uma exigência. Fique à vontade para escolher outra marca de sua preferência.';
    if(note.textContent!==disclaimer)note.textContent=disclaimer;
    if(note.previousElementSibling!==gifts[gifts.length-1])gifts[gifts.length-1].insertAdjacentElement('afterend',note);
  }
  const intro=result.querySelector(':scope > p');
  if(intro&&gifts.length)intro.textContent=qty===1?'Esta é a sugestão da família:':`Estas são as ${qty} sugestões de fraldas para a família:`;
}

function enhance(){enhanceGiftResult()}
const observer=new MutationObserver(()=>requestAnimationFrame(enhance));observer.observe(document.documentElement,{childList:true,subtree:true});
enhance();
