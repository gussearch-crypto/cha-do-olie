export const OFFICIAL_EVENT_ORIGIN = 'https://cha-oliver-mvp.vercel.app';
export const QR_CHANNELS = Object.freeze({
  presencial: '/games',
  online: '/games/online'
});
export function qrTarget(channel,origin=OFFICIAL_EVENT_ORIGIN){
  if(!Object.prototype.hasOwnProperty.call(QR_CHANNELS,channel))throw new Error('Canal inválido');
  const parsed = new URL(origin);
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw new Error('Origem inválida');
  return parsed.origin+QR_CHANNELS[channel];
}
export function isEventOfficialOrigin(origin){
  try{return new URL(origin).origin===OFFICIAL_EVENT_ORIGIN}catch{return false}
}
export function qrIsPrintable(origin){
  return isEventOfficialOrigin(origin);
}
