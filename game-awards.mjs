/** Shared presentation defaults. Server remains authoritative after publication. */
export const AWARD_RULES=[
 {value:'overall_score',label:'Maior pontuação geral'},
 {value:'closest_datetime',label:'Data e horário mais próximos'},
 {value:'closest_weight',label:'Peso mais próximo'},
 {value:'closest_length',label:'Comprimento mais próximo'}
];
export function awardSettings(settings={}){
 const n=Number(settings.winner_count);
 return {
  count:Number.isInteger(n)&&n>=1&&n<=3?n:1,
  rule:AWARD_RULES.some(x=>x.value===settings.winner_rule)?settings.winner_rule:'overall_score'
 };
}
export function winnerText(count=1){
 return count===1?'1 vencedor':count+' vencedores';
}
/** Check the integrity of a bank-issued Pix BR Code, without sending data to third parties. */
export function validPixPayload(value){
 const text=String(value??'').trim();
 if(text.length<45||text.length>1500||!text.startsWith('000201')||!text.includes('br.gov.bcb.pix')||!/6304[0-9a-f]{4}$/i.test(text))return false;
 let crc=0xFFFF;
 for(const ch of text.slice(0,-4).toUpperCase()){
  crc^=ch.charCodeAt(0)<<8;
  for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xFFFF:(crc<<1)&0xFFFF;
 }
 return crc.toString(16).toUpperCase().padStart(4,'0')===text.slice(-4).toUpperCase();
}
