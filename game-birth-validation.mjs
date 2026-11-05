// Validações de interface, alinhadas aos limites da função oliver-games.
// O servidor continua sendo a autoridade para aceitar ou rejeitar registros.
export function isValidBirthDate(value){
  if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T12:00:00Z');
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function isValidBirthTime(value){
  return typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function isValidBirthPhone(value){
  const digits=String(value??'').replace(/\D/g,'');
  return /^\d{11}$/.test(digits)&&digits.slice(0,2)!=='00'&&digits[2]==='9';
}
export function isValidBirthName(value){
  const clean=String(value??'').trim().replace(/\s+/g,' ');
  return clean.length>=3&&clean.length<=100&&clean.split(' ').length>=2;
}
export function validateBirthGuess({name,whatsapp,date,time,weight,length}){
  if(!isValidBirthName(name))return 'Informe nome e sobrenome para identificar seu palpite.';
  if(!isValidBirthPhone(whatsapp))return 'Informe um WhatsApp celular válido, com DDD e 11 dígitos.';
  if(!isValidBirthDate(date))return 'Escolha uma data válida no calendário.';
  if(!isValidBirthTime(time))return 'Informe um horário válido entre 00:00 e 23:59.';
  if(!Number.isFinite(Number(weight))||Number(weight)<100||Number(weight)>7000)return 'Informe um peso válido, entre 0,100 e 7,000 kg.';
  if(!Number.isFinite(Number(length))||Number(length)<20||Number(length)>75)return 'Informe um comprimento válido, entre 20 e 75 cm.';
  return '';
}
