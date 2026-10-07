import React,{useEffect,useId,useRef,cloneElement} from 'react';
import {createPortal} from 'react-dom';

export function PlanningDialog({children,onClose,side=false,busy=false,guard=false}) {
  const overlay=useRef(null),dialog=useRef(null),close=useRef(onClose),opener=useRef(document.activeElement),heading=useId(),baseline=useRef(null);
  const values=()=>JSON.stringify([...dialog.current?.querySelectorAll('input,select,textarea')||[]].filter(el=>!['file','button','submit'].includes(el.type)).map(el=>[el.getAttribute('aria-label')||el.name||el.type,el.type==='checkbox'?el.checked:el.value]));
  const requestClose=()=>{if(busy)return;if(guard&&baseline.current!==null&&values()!==baseline.current&&!window.confirm('Há alterações não salvas. Deseja descartá-las e fechar?'))return;onClose()};
  close.current=requestClose;
  useEffect(()=>{
    baseline.current=values();
    const previous=opener.current,overflow=document.body.style.overflow;
    const siblings=[...document.body.children].filter(el=>el!==overlay.current).map(el=>[el,el.inert]);
    siblings.forEach(([el])=>{el.inert=true});document.body.style.overflow='hidden';
    const title=dialog.current.querySelector('h3');if(title)title.id=heading;
    const focusable=()=>[...dialog.current.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
    const first=dialog.current.querySelector('[autofocus]')||focusable().find(el=>!el.classList.contains('planningDialogClose'))||dialog.current;
    first.focus();
    const handle=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current()}
      if(e.key==='Tab'){
        const items=focusable(),first=items[0],last=items.at(-1);
        if(!items.length){e.preventDefault();dialog.current.focus()}
        else if(e.shiftKey&&(document.activeElement===first||!dialog.current.contains(document.activeElement))){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&(document.activeElement===last||!dialog.current.contains(document.activeElement))){e.preventDefault();first.focus()}
      }
    };
    const leaving=e=>{if(guard&&values()!==baseline.current){e.preventDefault();e.returnValue=''}};
    window.addEventListener('beforeunload',leaving);
    document.addEventListener('keydown',handle);
    return()=>{window.removeEventListener('beforeunload',leaving);document.removeEventListener('keydown',handle);document.body.style.overflow=overflow;siblings.forEach(([el,inert])=>{el.inert=inert});if(previous?.isConnected)previous.focus()};
  },[heading,guard]);
  return createPortal(<div ref={overlay} className={'planningModal'+(side?' planningDrawer':'')} onMouseDown={e=>{if(e.target===e.currentTarget)close.current()}}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={heading} tabIndex={-1} className="planningDialog">
      <button type="button" className="planningDialogClose" aria-label="Fechar painel" disabled={busy} onClick={()=>close.current()}>×</button>{cloneElement(children,{onClose:requestClose})}
    </div>
  </div>,document.body);
}
