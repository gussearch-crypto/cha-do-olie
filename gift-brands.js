function getAttendingAdults(){
  return [...document.querySelectorAll('.people .person')].filter(person=>{
    const selects=person.querySelectorAll('select');
    return selects[0]?.value==='yes'&&selects[1]?.value==='adult';
  }).length;
}

function getGiftChoice(){return document.querySelector('.giftChoice')}

function setReactGiftMode(mode){
  const input=[...document.querySelectorAll('.giftChoice input[type="radio"]')].find(x=>x.closest('label')?.textContent.includes(mode==='adult'?'convidado adulto':'pela família'));
  if(input&&!input.checked)input.click();
}

function enhanceGiftChoice(){
  const box=getGiftChoice();
  if(!box)return;
  const adults=Math.max(1,getAttendingAdults());
  let control=box.querySelector('.diaperQuantityChoice');
  if(!control){
    const adultLabel=[...box.querySelectorAll('label.radio')].find(x=>x.textContent.includes('convidado adulto'));
    if(adultLabel)adultLabel.style.display='none';
    const familyLabel=[...box.querySelectorAll('label.radio')].find(x=>x.textContent.includes('pela família'));
    if(familyLabel){
      const text=familyLabel.querySelector('span');
      if(text)text.textContent='Escolher quantidade de pacotes de fralda';
      control=document.createElement('div');
      control.className='diaperQuantityChoice';
      control.style.cssText='margin:12px 0 16px;padding:14px 16px;border:1px solid rgba(101,116,66,.25);border-radius:14px;background:rgba(255,255,255,.55)';
      control.innerHTML='<label style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><b>Quantidade de pacotes:</b><select class="diaperQuantity" style="min-width:90px;padding:9px 12px;border-radius:10px;border:1px solid #c9cdbd;background:white"></select></label><small style="display:block;margin-top:7px;opacity:.72">Você pode escolher de 1 pacote até a quantidade de adultos confirmados.</small>';
      familyLabel.insertAdjacentElement('afterend',control);
    }
  }
  if(!control)return;
  const select=control.querySelector('.diaperQuantity');
  const previous=Math.min(Number(select.value)||Number(sessionStorage.getItem('oliverDiaperQty'))||1,adults);
  const signature=String(adults);
  if(select.dataset.adults!==signature){
    select.innerHTML=Array.from({length:adults},(_,i)=>`<option value="${i+1}">${i+1} ${i?'pacotes':'pacote'}</option>`).join('');
    select.value=String(previous);
    select.dataset.adults=signature;
  }
  if(!select.dataset.bound){
    select.dataset.bound='1';
    select.addEventListener('change',()=>{
      sessionStorage.setItem('oliverDiaperQty',select.value);
      setReactGiftMode(Number(select.value)>1?'adult':'family');
    });
  }
  const desired=Math.min(Number(sessionStorage.getItem('oliverDiaperQty'))||1,adults);
  if(Number(select.value)!==desired)select.value=String(desired);
  setReactGiftMode(desired>1?'adult':'family');
}

function enhanceGiftResult(){
  const result=document.querySelector('.result');
  if(!result)return;
  const gifts=[...result.querySelectorAll('.gift')];
  const qty=Math.max(1,Number(sessionStorage.getItem('oliverDiaperQty'))||gifts.length||1);
  gifts.forEach((gift,index)=>{
    const diaperLine=gift.querySelector('b');
    if(diaperLine&&diaperLine.textContent.includes('pacote de fraldas')&&!gift.querySelector('.diaperBrands')){
      const brands=document.createElement('span');brands.className='diaperBrands';brands.textContent='Marcas sugeridas: Huggies ou Pampers';diaperLine.insertAdjacentElement('afterend',brands);
    }
    const blocks=gift.querySelectorAll('div');
    if(index>0&&blocks.length>=4){
      blocks[2].style.display='none';blocks[3].style.display='none';
    }
  });
  const intro=result.querySelector(':scope > p');
  if(intro&&gifts.length)intro.textContent=qty===1?'Esta é a sugestão da família:':`Estas são as ${qty} sugestões de fraldas para a família:`;
}

function enhance(){enhanceGiftChoice();enhanceGiftResult()}
const observer=new MutationObserver(()=>requestAnimationFrame(enhance));observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target.closest?.('.people'))setTimeout(enhance,0)});
enhance();
