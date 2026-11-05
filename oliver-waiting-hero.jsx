import React,{useEffect,useState} from 'react';
import {CalendarHeart,Heart,Clock3,Scale,Ruler,Users,ArrowRight,LockKeyhole,Trophy} from 'lucide-react';
import {daysToOliverDpp,oliverDppMessage,oliverPublicPhase,OLIVER_DPP} from './oliver-public-phase.mjs';
const todaySP=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fmtWeight=raw=>raw!=null&&Number.isFinite(Number(raw))&&Number(raw)>0?(Number(raw)/1000).toFixed(3).replace('.',',')+' kg':'—';
const fmtLength=raw=>raw!=null&&Number.isFinite(Number(raw))&&Number(raw)>0?Number(raw).toLocaleString('pt-BR',{maximumFractionDigits:1})+' cm':'—';

export default function OliverWaitingHero({summary,settings}){
 const [today,setToday]=useState(todaySP);
 useEffect(()=>{const refresh=()=>setToday(todaySP());const t=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',refresh)}},[]);
 const days=daysToOliverDpp(today),phase=oliverPublicPhase({today,settings,announcement:{published:false}});
 const count=Number(summary?.birth?.count||0);
 const mode=summary==null?'loading':phase.canGuess?'open':phase.results?'revealed':'closed';
 return <section className="olieWaitingJourney" aria-label="A espera do Oliver">
   <div className="olieWaitingIntro">
    <span className="olieWaitingKicker">🦁 🐼 🦒 🐓 &nbsp; A ESPERA DO OLIVER</span>
    <h1>Nosso pequeno está a caminho! <span aria-hidden="true">💛</span></h1>
    <p>{phase.afterEvent?'O chá foi um capítulo especial. Agora seguimos juntos contando os dias para conhecer o Oliver!':'Antes do nosso encontro no chá, já contamos os dias para conhecer o Oliver!'}</p>
    <div className="olieWaitingHeart" aria-hidden="true"><Heart size={34}/></div>
   </div>
   <div className="olieWaitingMain">
    <div className="olieWaitingDate">
      <span><CalendarHeart size={22}/> DATA PROVÁVEL DO PARTO</span>
      <strong>28 de janeiro de 2027</strong>
      <p>{oliverDppMessage(days)}</p>
      <small>A data provável é somente uma referência. O nascimento pode acontecer antes ou depois, e não será anunciado automaticamente.</small>
    </div>
    <div className="olieWaitingStatus">
      {mode==='loading'?<><span className="olieWaitingStatusIcon"><Clock3 size={23}/></span><strong>Consultando os jogos...</strong><p>Verificando se os palpites estão abertos e como a turma está participando.</p></>:mode==='open'?<><span className="olieWaitingStatusIcon"><Clock3 size={23}/></span><strong>Os palpites continuam!</strong><p>Você ainda pode participar e adivinhar a data, o horário, o peso e o comprimento do Oliver.</p><a href="/games/online" className="olieWaitingButton">Fazer meu palpite <ArrowRight size={17}/></a></>:
       mode==='revealed'?<><span className="olieWaitingStatusIcon"><Trophy size={23}/></span><strong>Ranking disponível</strong><p>Os resultados da brincadeira foram liberados pela organização. Confira os vencedores.</p><a href="/games/resultado" className="olieWaitingButton">Ver vencedores <ArrowRight size={17}/></a></>:
       <><span className="olieWaitingStatusIcon"><LockKeyhole size={23}/></span><strong>Palpites encerrados</strong><p>Os registros foram preservados. Os resultados aparecerão quando a organização autorizar.</p><a href="/games/online" className="olieWaitingButton">Consultar meu palpite <ArrowRight size={17}/></a></>}
    </div>
   </div>
   <div className="olieWaitingCommunity" aria-label="Estatísticas coletivas">
     <div className="olieWaitingCommunityHeading"><span>JUNTOS NESSA ESPERA</span><h2>Os palpites da família e dos amigos</h2><p>Somente números coletivos. Nenhuma previsão individual é revelada.</p></div>
     <div className="olieWaitingStats">
       <div><Users size={22}/><strong>{count}</strong><small>Palpites de nascimento</small></div>
       <div><Scale size={22}/><strong>{fmtWeight(summary?.weight?.average)}</strong><small>Peso médio previsto</small></div>
       <div><Ruler size={22}/><strong>{fmtLength(summary?.length?.average)}</strong><small>Comprimento médio previsto</small></div>
     </div>
   </div>
   <div className="olieWaitingFoot"><span>💛</span> Enquanto aguardamos, cada mensagem e cada palpite tornam essa história ainda mais especial.</div>
 </section>;
}
