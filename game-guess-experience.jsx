import React,{useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {CalendarDays,Clock3,Scale,Ruler,CheckCircle2,ShieldCheck} from 'lucide-react';
/* Estilos compartilhados carregados por games.css nas duas páginas. */

const validTime=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value||''));
const dateLabel=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?value.split('-').reverse().join('/'):'—';
const weightLabel=value=>Number.isFinite(Number(value))&&Number(value)>0?(Number(value)/1000).toFixed(3).replace('.',',')+' kg':'—';
const lengthLabel=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value).toLocaleString('pt-BR',{maximumFractionDigits:1})+' cm':'—';

export function GameGuessProgress({date='',time='',weight=0,length=0,locked=false}){
  if(locked)return null;
  const items=[['Data',/^\d{4}-\d{2}-\d{2}$/.test(date)],['Horário',validTime(time)],['Peso',Number(weight)>0],['Comprimento',Number(length)>0]];
  const filled=items.filter(([,done])=>done).length;
  return <div className="olieGuessProgress" aria-label={'Preenchimento dos palpites: '+filled+' de 4'}>
    <div className="olieGuessProgressTop"><strong>Seus palpites para a chegada</strong><span>{filled} de 4 preenchidos</span></div>
    <div className="olieGuessProgressTrack" role="progressbar" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={4} aria-label="Campos de nascimento preenchidos">
      <span style={{width:filled*25+'%'}}/>
    </div>
    <div className="olieGuessProgressLabels">{items.map(([label,done])=><span key={label} className={done?'done':''}>{done?'✓ ':'○ '}{label}</span>)}</div>
  </div>;
}

export function GameGuessReview({open,onClose,onConfirm,busy=false,name='',birthDate='',birthTime='',weightG=0,lengthCm=0,bellyCm=null}){
  const backRef=useRef(null);
  useEffect(()=>{
    if(!open)return;
    backRef.current?.focus();
    const onKey=e=>{if(e.key==='Escape'&&!busy)onClose()};
    document.addEventListener('keydown',onKey);
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=previousOverflow};
  },[open,busy,onClose]);
  if(!open)return null;
  const birth=!!birthDate;
  const belly=bellyCm!==null&&bellyCm!==''&&Number(bellyCm)>0;
  return createPortal(<div className="olieReviewBackdrop" data-olie-review="active" style={{position:'fixed',inset:0,zIndex:2147483000,display:'grid',placeItems:'center',padding:'16px',overflowY:'auto',background:'rgba(34,48,30,.68)'}}>
    <section className="olieReviewModal" role="dialog" aria-modal="true" aria-labelledby="olie-review-title" aria-describedby="olie-review-description">
      <span className="olieReviewEyebrow"><ShieldCheck size={16}/> CONFIRMAÇÃO DO PALPITE</span>
      <h2 id="olie-review-title">Confira antes de registrar 💚</h2>
      <p id="olie-review-description">Depois de confirmado, nenhum palpite poderá ser alterado.</p>
      <div className="olieReviewParticipant"><small>Participante</small><strong>{name.trim()||'Não informado'}</strong></div>
      {birth&&<div className="olieReviewValues">
        <div><CalendarDays size={19}/><small>Nascimento</small><strong>{dateLabel(birthDate)}</strong></div>
        <div><Clock3 size={19}/><small>Horário</small><strong>{validTime(birthTime)?birthTime:'—'}</strong></div>
        <div><Scale size={19}/><small>Peso</small><strong>{weightLabel(weightG)}</strong></div>
        <div><Ruler size={19}/><small>Comprimento</small><strong>{lengthLabel(lengthCm)}</strong></div>
      </div>}
      {belly&&<div className="olieReviewBelly"><Ruler size={19}/><span>Medida da barriga</span><strong>{Number(bellyCm).toLocaleString('pt-BR',{maximumFractionDigits:1})} cm</strong></div>}
      <p className="olieReviewWarning"><CheckCircle2 size={18}/> Seu registro será definitivo. Confira todas as medidas.</p>
      <div className="olieReviewActions">
        <button type="button" className="olieReviewBack" ref={backRef} disabled={busy} onClick={onClose}>Voltar e corrigir</button>
        <button type="button" className="olieReviewConfirm" disabled={busy} onClick={onConfirm}>{busy?'Registrando...':'Confirmar meu palpite'}</button>
      </div>
    </section>
  </div>,document.body);
}
