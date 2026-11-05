import {eventRsvpReadiness,isRealFamily,RSVP_DEADLINE,EVENT_DATE} from './admin-final-readiness.mjs';
import {expenseTotals} from './planning-utils.mjs';
const csvCell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
export function productionReference(families=[],planning={},today='2026-11-05'){
 const rsvp=eventRsvpReadiness(families,today);
 const people=families.filter(isRealFamily).flatMap(f=>Array.isArray(f.guests)?f.guests:[]);
 const yes=people.filter(g=>g.attendance==='yes');
 const adults=yes.filter(g=>g.person_type!=='child').length;
 const younger=yes.filter(g=>g.person_type==='child'&&g.child_age_group==='under_5').length;
 const older=yes.filter(g=>g.person_type==='child'&&g.child_age_group!=='under_5').length;
 const expenses=Array.isArray(planning?.expenses)?planning.expenses:[];
 const financial=expenses.reduce((tot,e)=>{const s=expenseTotals(e,today);
  tot.contracted=Math.round((tot.contracted+s.planned)*100)/100;
  tot.paid=Math.round((tot.paid+s.paid)*100)/100;
  return tot;
 },{contracted:0,paid:0});
 return {
  report:'Estimativa de produção — Chá do Oliver',captureDate:today,
  referenceDate:RSVP_DEADLINE,eventDate:EVENT_DATE,
  // Uma captura em 01/12 ou depois não deve fingir ser uma fotografia de 30/11.
  isExactReferenceDay:today===RSVP_DEADLINE,
  isRetrospective:today>RSVP_DEADLINE,
  confirmedCounted:rsvp.counted,adults,childrenFivePlus:older,childrenUnderFive:younger,
  waiting:rsvp.waiting,available:rsvp.available,capacity:rsvp.capacity,
  contracted:financial.contracted,paid:financial.paid
 };
}
export function productionReferenceCsv(reference){
 const fields=[
  ['Capturado em',reference.captureDate],
  ['Data de referência para a produção',reference.referenceDate],
  ['Data do chá',reference.eventDate],
  ['Registro efetuado no próprio dia 30/11',reference.isExactReferenceDay?'Sim':'Não'],
  ['Pessoas contabilizadas',reference.confirmedCounted],
  ['Adultos',reference.adults],
  ['Crianças de 5 anos ou mais',reference.childrenFivePlus],
  ['Crianças menores de 5 (não ocupam vaga)',reference.childrenUnderFive],
  ['Aguardando resposta',reference.waiting],
  ['Vagas disponíveis para novas inclusões',reference.available],
  ['Capacidade de pessoas contabilizadas',reference.capacity],
  ['Valor contratado no momento da exportação (R$)',reference.contracted?.toFixed(2).replace('.',',')],
  ['Valor pago no momento da exportação (R$)',reference.paid?.toFixed(2).replace('.',',')]
 ];
 return '\uFEFF'+[['Indicador','Valor'],...fields].map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
}
