import {eventRsvpReadiness,eventScheduleReadiness,eventFinanceReadiness,EVENT_DATE} from './admin-final-readiness.mjs';
import {productionReference} from './oliver-production-reference.mjs';
import {eventToday,installmentBalance} from './planning-utils.mjs';

export const DAY_CHECKS=[
 {id:'montagem',label:'Conferir montagem e decoração',section:'preparacao'},
 {id:'fornecedores',label:'Conferir fornecedores, alimentação e bebidas',section:'preparacao'},
 {id:'qr',label:'Conferir QR Codes dos Jogos e material de apoio',section:'jogos'},
 {id:'teste',label:'Testar o cadastro e a consulta de palpites no laboratório',section:'jogos'},
 {id:'orientacoes',label:'Revisar orientações dos jogos presenciais',section:'jogos'},
 {id:'barriga',label:'Encerrar palpites da barriga somente após a dinâmica',section:'jogos'},
 {id:'fechamento',label:'Conferir desmontagem, entregas e encerramento',section:'encerramento'}
];
export const DAY_CHECKLIST_KEY='oliver-event-checklist-local-v1';
export const PRODUCTION_BASE_KEY='oliver-production-baseline-local-v1';

export function safeDayChecks(state){
 const list=Array.isArray(state)?state:[];
 return [...new Set(list.filter(x=>typeof x==='string'&&DAY_CHECKS.some(c=>c.id===x)))];
}
export function safeProductionBaseline(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Base de produção inválida.');
 if(raw.referenceDate!=='2026-11-30'||raw.eventDate!=='2026-12-04'
  ||!/^\d{4}-\d{2}-\d{2}$/.test(raw.captureDate||''))throw Error('Datas de referência inválidas.');
 for(const k of ['confirmedCounted','adults','childrenFivePlus','childrenUnderFive','waiting','available','capacity']){
  if(!Number.isSafeInteger(raw[k])||raw[k]<0||raw[k]>10000)throw Error('Contagem inválida.');
 }
 if(raw.confirmedCounted!==raw.adults+raw.childrenFivePlus
  ||raw.capacity!==100||raw.available!==Math.max(0,100-raw.confirmedCounted))throw Error('Capacidade inconsistente.');
 for(const k of ['contracted','paid'])if(typeof raw[k]!=='number'||!Number.isFinite(raw[k])||raw[k]<0)throw Error('Valor inválido.');
 return Object.fromEntries(['report','captureDate','referenceDate','eventDate','isExactReferenceDay',
  'isRetrospective','confirmedCounted','adults','childrenFivePlus','childrenUnderFive',
  'waiting','available','capacity','contracted','paid'].map(k=>[k,raw[k]]));
}
export function compareProductionBase(base,current){
 const valid=safeProductionBaseline(base);
 return {
  capturedAt:valid.captureDate,
  officialDay:valid.captureDate==='2026-11-30',
  countedChange:current.confirmedCounted-valid.confirmedCounted,
  underFiveChange:current.childrenUnderFive-valid.childrenUnderFive,
  awaitingChange:current.waiting-valid.waiting,
  contractChange:Math.round((current.contracted-valid.contracted)*100)/100,
  capturedCount:valid.confirmedCounted,currentCount:current.confirmedCounted,
  available:current.available
 };
}
export function dayKitData({planning={},families=[],today=eventToday()}={}){
 const rsvp=eventRsvpReadiness(families,today);
 const schedule=eventScheduleReadiness(planning,EVENT_DATE);
 const finance=eventFinanceReadiness(planning,today);
 const shopping=(planning.shopping||[]).filter(x=>x.status!=='bought').map(x=>({
  title:x.title||'',quantity:x.quantity,unit:x.unit||'',responsible:x.responsible||'',status:x.status||'',notes:x.notes||''
 }));
 const payments=(planning.expenses||[]).flatMap(e=>(e.installments||[])
  .filter(p=>installmentBalance(p)>0).map(p=>({
   description:e.description||'',label:p.label||'',due:p.due||'',balance:installmentBalance(p)
  })));
 return {date:today,rsvp,schedule,finance,shopping,payments};
}
const csvCell=x=>{
 let v=String(x??'');
 if(/^\s*[=+\-@]/.test(v))v="'"+v;
 return '"'+v.replaceAll('"','""')+'"';
};
export function dayKitCsv(kit){
 const rows=[['Seção','Item','Detalhes','Responsável','Situação'],[
  'Resumo','Captura',kit.date,'',''],['Resumo','Confirmados contabilizados',kit.rsvp.counted,'',''],
  ['Resumo','Crianças menores de 5',kit.rsvp.confirmedUnderFive,'',''],
  ['Resumo','Vagas restantes',kit.rsvp.available,'',''],
  ['Resumo','Aguardando confirmação',kit.rsvp.waiting,'',''],
  ['Financeiro','Saldo a quitar',kit.finance.open,'','']];
 for(const t of kit.schedule.entries)rows.push([
  'Cronograma',(t.eventTime||'')+' '+(t.title||''),(t.place||'')+(t.eventEnd?' · até '+t.eventEnd:''),
  t.responsible||'',t.status==='done'?'Concluída':'Pendente'
 ]);
 for(const x of kit.shopping)rows.push(['Compras',x.title,String(x.quantity)+' '+x.unit+' · '+x.notes,x.responsible,x.status]);
 for(const p of kit.payments)rows.push(['Pagamento',p.description,p.label+' · '+p.due,'','A quitar R$ '+p.balance.toFixed(2)]);
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
}
export function currentProductionReference(kit,planning,families){
 return productionReference(families,planning,kit.date);
}
