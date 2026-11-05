// Estados públicos da espera: nunca inferir nascimento apenas da DPP.
export const OLIVER_DPP = '2027-01-28';
export const OLIVER_EVENT_DAY = '2026-12-04';
const civil=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
export function daysToOliverDpp(today, dpp=OLIVER_DPP){
 if(!civil(today)||!civil(dpp))return null;
 return Math.round((Date.parse(dpp+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
}
export function oliverPublicPhase({announcement={},settings={},today='2026-11-05'}={}){
 const born=announcement?.published===true;
 const results=!!settings?.results_published;
 const afterEvent=civil(today)&&today>OLIVER_EVENT_DAY;
 // Publicar foto/chegada não altera o ranking; publicar ranking não revela foto/chegada.
 return {phase:born?'born':results?'ranking':afterEvent?'waiting':'pre_event',
         born,results,afterEvent,canGuess:!born&&!results&&settings?.birth_open===true&&!settings?.birth_closed_at,
         locked:settings?.birth_open===false||!!settings?.birth_closed_at||born||results};
}
export function oliverDppMessage(days){
 if(days===null)return '28 de janeiro de 2027 · data provável do parto';
 if(days>1)return 'Faltam '+days+' dias para a data provável do parto';
 if(days===1)return 'Falta 1 dia para a data provável do parto';
 if(days===0)return 'A data provável chegou!';
 return 'A data provável passou. Seguimos aguardando com carinho!';
}
