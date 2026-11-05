import React from 'react';
import {Clock3} from 'lucide-react';
import './game-time-picker.css';

const validTime=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Relógio ilustrado sincronizado com um único campo HH:MM, usado no presencial e no online. */
export default function GameTimePicker({value='',onChange}){
  const chosen=validTime(value);
  const hours=chosen?Number(value.slice(0,2)):12;
  const minutes=chosen?Number(value.slice(3,5)):0;
  const clockStyle={
    '--olie-clock-hour':((hours%12)*30+minutes*.5)+'deg',
    '--olie-clock-minute':(minutes*6)+'deg'
  };
  return <div className="olieTimeCard" role="group" aria-label="Horário previsto do nascimento">
    <div className="olieTimeHeading">
      <Clock3 size={20} strokeWidth={1.9} aria-hidden="true"/>
      <strong>Horário previsto do nascimento</strong>
    </div>
    <div className="olieTimeCore">
      <div className={'olieTimeClock'+(chosen?' is-set':' is-unset')} style={clockStyle} aria-hidden="true">
        <div className="olieTimeClockRing"/>
        <span className="olieTimeClockNumber olieTimeClock12">12</span>
        <span className="olieTimeClockNumber olieTimeClock3">3</span>
        <span className="olieTimeClockNumber olieTimeClock6">6</span>
        <span className="olieTimeClockNumber olieTimeClock9">9</span>
        <div className="olieTimeClockHand olieTimeClockHour"/>
        <div className="olieTimeClockHand olieTimeClockMinute"/>
        <div className="olieTimeClockPivot"/>
      </div>
      <label className="olieTimeInputLabel">
        <span>Digite um horário entre 00:00 e 23:59</span>
        <input
          className="olieTimeInput"
          type="time"
          lang="pt-BR"
          min="00:00"
          max="23:59"
          step="60"
          required
          value={value}
          onChange={event=>onChange(event.target.value)}
          aria-label="Horário previsto do nascimento, das 00:00 às 23:59"
        />
      </label>
      <small className="olieTimeHelp" aria-live="polite">
        {chosen?'Horário escolhido: '+value:'Os ponteiros acompanham o horário escolhido'}
      </small>
    </div>
    <p className="olieTimeFootnote">A data e o horário são avaliados juntos, valendo até 200 pontos.</p>
  </div>;
}
