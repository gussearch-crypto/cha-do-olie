function enhanceGiftBrands(){
  document.querySelectorAll('.result .gift').forEach(gift=>{
    const diaperLine=gift.querySelector('b');
    if(!diaperLine||!diaperLine.textContent.includes('pacote de fraldas'))return;
    if(gift.querySelector('.diaperBrands'))return;
    const brands=document.createElement('span');
    brands.className='diaperBrands';
    brands.textContent='Marcas sugeridas: Huggies ou Pampers';
    diaperLine.insertAdjacentElement('afterend',brands);
  });
}

const giftBrandObserver=new MutationObserver(enhanceGiftBrands);
giftBrandObserver.observe(document.documentElement,{childList:true,subtree:true});
enhanceGiftBrands();
