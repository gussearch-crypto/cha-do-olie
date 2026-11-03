// Distância absoluta: 200 pontos para data/hora; 100 para peso e comprimento.
export const BIRTH_SCORE_RULES=Object.freeze({dateTimeMax:200,dateTimeReferenceMinutes:14*24*60,weightMax:100,weightReferenceGrams:500,lengthMax:100,lengthReferenceCm:5});
export function birthScore(guess,official){
 if(!guess?.birth_date||!guess?.birth_time||!official?.birth_date||!official?.birth_time)return null;
 const parse=(day,time)=>Date.parse(day+'T'+String(time).slice(0,5)+':00Z');
 const a=parse(guess.birth_date,guess.birth_time),b=parse(official.birth_date,official.birth_time);
 if(!Number.isFinite(a)||!Number.isFinite(b))return null;
 const dateDifferenceMinutes=Math.abs(a-b)/60000,weightDifferenceGrams=Math.abs(Number(guess.weight_g)-Number(official.weight_g)),lengthDifferenceCm=Math.abs(Number(guess.length_cm)-Number(official.length_cm));
 if(![weightDifferenceGrams,lengthDifferenceCm].every(Number.isFinite))return null;
 const points=(max,difference,reference)=>max/(1+difference/reference);
 const dateTimePoints=points(200,dateDifferenceMinutes,20160),weightPoints=points(100,weightDifferenceGrams,500),lengthPoints=points(100,lengthDifferenceCm,5);
 return {dateDifferenceMinutes,weightDifferenceGrams,lengthDifferenceCm,dateTimePoints,weightPoints,lengthPoints,total:dateTimePoints+weightPoints+lengthPoints};
}
export function rankBirthGuesses(guesses,official){
 return guesses.map(guess=>({...guess,score:birthScore(guess,official)})).filter(row=>row.score).sort((a,b)=>b.score.total-a.score.total||a.score.dateDifferenceMinutes-b.score.dateDifferenceMinutes||a.score.weightDifferenceGrams-b.score.weightDifferenceGrams||a.score.lengthDifferenceCm-b.score.lengthDifferenceCm||String(a.participant_name).localeCompare(String(b.participant_name),'pt-BR'));
}
