import React from 'react';
import {Clock3, Moon, Sunrise, Sun, Sunset} from 'lucide-react';
import './game-time-picker.css';

const PERIODS = [
  {label:'Madrugada', time:'02:00', from:0, to:5, Icon:Moon},
  {label:'Manhã', time:'09:00', from:6, to:11, Icon:Sunrise},
  {label:'Tarde', time:'15:00', from:12, to:17, Icon:Sun},
  {label:'Noite', time:'20:00', from:18, to:23, Icon:Sunset},
];

export default function GameTimePicker({value='',onChange}){
  const valid=/^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
  const hours=valid?Number(value.slice(0,2)):10;
  const minutes=valid?Number(value.slice(3,5)):10;
  const clockStyle={
    '--olie-hour-angle': ((hours%12)*30+minutes*.5)+'deg',
    '--olie-minute-angle': (minutes*6)+'deg',
  };
  const step=(delta)=>{
    const current=valid?hours*60+minutes:12*60;
    const total=(current+delta+1440)%1440;
    onChange(String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0'));
  };
  const period=valid?PERIODS.find(p=>hours>=p.from&&hours<=p.to)?.label:null;
  return <div className="olieTimeCard" role="group" aria-label="Horário previsto do nascimento">
    <div className="olieTimeHeading"><Clock3 size={20} strokeWidth={1.9}/><strong>Horário previsto do nascimento</strong></div>
    <div className="olieTimeMain">
      <div className="olieTimeDial" style={clockStyle} aria-hidden="true">
        <div className="olieTimeTickRing"/>
        <span className="olieTimeTwelve">12</span><span className="olieTimeThree">3</span>
        <span className="olieTimeSix">6</span><span className="olieTimeNine">9</span>
        <span className="olieTimeHand olieTimeHandHour"/><span className="olieTimeHand olieTimeHandMinute"/>
        <span className="olieTimePin"/>
      </div>
      <div className="olieTimeEditor">
        <span className="olieTimeEyebrow">Em que momento ele vai chegar?</span>
        <label className="olieTimeInputLabel">
          <span>Hora e minuto</span>
          <input type="time" className="olieTimeInput" required value={value} onChange={event=>onChange(event.target.value)} aria-label="Hora e minuto do palpite"/>
        </label>
        <small className="olieTimeCurrent" aria-live="polite">{valid?'Seu palpite: '+value+(period?' · '+period.toLowerCase():''):'Selecione um horário para começar'}</small>
        <div className="olieTimeStepGrid" aria-label="Ajuste rápido do horário">
          <button type="button" onClick={()=>step(-60)} aria-label="Diminuir uma hora">− 1 hora</button>
          <button type="button" onClick={()=>step(60)} aria-label="Aumentar uma hora">+ 1 hora</button>
          <button type="button" onClick={()=>step(-5)} aria-label="Diminuir cinco minutos">− 5 min</button>
          <button type="button" onClick={()=>step(5)} aria-label="Aumentar cinco minutos">+ 5 min</button>
        </div>
      </div>
    </div>
    <div className="olieTimePeriods">
      <span>Ou escolha um período para começar:</span>
      <div className="olieTimePeriodButtons">
        {PERIODS.map(({label,time,Icon})=><button type="button" key={label} className={period===label?'is-selected':''} aria-pressed={period===label} onClick={()=>onChange(time)}><Icon size={16} strokeWidth={1.8}/>{label}</button>)}
      </div>
    </div>
    <p className="olieTimeFootnote">A data e o horário são avaliados juntos, valendo até 200 pontos.</p>
  </div>;
}
