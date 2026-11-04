import React from 'react';
import {Clock3} from 'lucide-react';
import './game-time-picker.css';

const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Campo único de horário em 24 horas, compartilhado pelas páginas presencial e online. */
export default function GameTimePicker({value='',onChange}){
  const chosen=validTime(value);
  return <div className="olieTimeCard" role="group" aria-label="Horário previsto do nascimento">
    <div className="olieTimeHeading">
      <Clock3 size={20} strokeWidth={1.9} aria-hidden="true"/>
      <strong>Horário previsto do nascimento</strong>
    </div>
    <div className="olieTimeCore">
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
        {chosen?'Horário escolhido: '+value:'Formato de 24 horas: HH:MM'}
      </small>
    </div>
    <p className="olieTimeFootnote">A data e o horário são avaliados juntos, valendo até 200 pontos.</p>
  </div>;
}
