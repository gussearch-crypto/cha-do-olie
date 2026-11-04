import React from 'react';
import {Users,Scale,Ruler} from 'lucide-react';

/** Resumo público de palpites do nascimento: apenas contagens e médias agregadas. */
export default function GameCommunitySummary({summary=null,context='online'}){
  const count=Number(summary?.birth?.count||0);
  const weight=summary?.weight?.average;
  const length=summary?.length?.average;
  const formatWeight=weight!=null&&Number.isFinite(Number(weight))&&Number(weight)>0?(Number(weight)/1000).toFixed(3).replace('.',',')+' kg':'—';
  const formatLength=length!=null&&Number.isFinite(Number(length))&&Number(length)>0?Number(length).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' cm':'—';
  const results=context==='results';
  return <section className={'olieCommunitySummary '+(results?'is-results':'is-online')} aria-label="Resumo coletivo dos palpites">
    <div className="olieCommunitySummaryHeader">
      <div>
        <span className="olieCommunityEyebrow">A TURMA ESTÁ PALPITANDO 💚</span>
        <h2>{results?'Médias dos palpites':'Como a turma está palpitando?'}</h2>
        <p>Um resumo das previsões de quem está participando, presencialmente ou de longe.</p>
      </div>
    </div>
    {summary===null?<p className="olieCommunityEmpty" role="status">Carregando médias dos palpites...</p>
     :count===0?<p className="olieCommunityEmpty">Ainda não há palpites de nascimento. As médias aparecem depois do primeiro registro.</p>
     :<div className="olieCommunityNumbers">
       <div><Users size={22} aria-hidden="true"/><span>Total de palpites</span><strong>{count.toLocaleString('pt-BR')}</strong></div>
       <div><Scale size={22} aria-hidden="true"/><span>Peso médio</span><strong>{formatWeight}</strong></div>
       <div><Ruler size={22} aria-hidden="true"/><span>Comprimento médio</span><strong>{formatLength}</strong></div>
     </div>}
    <small className="olieCommunityFootnote">São médias coletivas, não os dados oficiais de nascimento. Datas e horários escolhidos pelos participantes continuam em segredo até a divulgação.</small>
  </section>;
}
