import {daysUntil,eventToday} from './planning-utils.mjs';

export const MESSAGE_STORE_KEY='oliver-message-templates-v1';
export const MESSAGE_TYPES=[
 {key:'invitation',label:'Convite inicial',description:'Primeiro contato com o núcleo familiar'},
 {key:'reminder',label:'Lembrete de confirmação',description:'Somente núcleos com convidados pendentes'},
 {key:'lateInvitation',label:'Novo convite após 30/11',description:'Para novas inclusões conforme vagas até 04/12'},
 {key:'eventReminder',label:'Lembrete do evento',description:'Data, horário e local para quem já confirmou'}
];
export const MESSAGE_VARIABLES=['nome_familia','codigo_acesso','link_convite','data_evento','horario_evento','endereco','link_mapa','prazo_confirmacao','dias_restantes'];
export const MESSAGE_DEFAULTS={
 invitation:[
  'Olá, {nome_familia}! 💛','',
  'Estamos preparando com muito carinho o Chá do Oliver e queremos celebrar esse momento com vocês.','',
  'Acesse o convite:','{link_convite}','',
  'Para confirmar a presença, procure pelo nome de um dos integrantes da família e utilize o código de acesso:','{codigo_acesso}','',
  '📅 {data_evento}','🕕 {horario_evento}','📍 {endereco}','🗺️ Mapa: {link_mapa}','',
  '{prazo_confirmacao}','',
  'Traga o amor, o sorriso e a fralda: estamos em contagem regressiva. 💛'
 ].join('\n'),
 reminder:[
  'Olá, {nome_familia}! 💛','',
  'Faltam {dias_restantes} dia(s) para o Chá do Oliver! 🎉',
  'Estamos preparando tudo com carinho e ainda aguardamos a confirmação de vocês.','',
  '{prazo_confirmacao}','',
  '📅 {data_evento}','🕕 {horario_evento}','📍 {endereco}','🗺️ Mapa: {link_mapa}','',
  'Convite: {link_convite}','Código de acesso: {codigo_acesso}','',
  'Esperamos celebrar com vocês! 💛'
 ].join('\n'),
 lateInvitation:[
  'Olá, {nome_familia}! 💛','',
  'Será muito especial ter vocês no Chá do Oliver!',
  'Estamos completando as últimas vagas da comemoração e gostaríamos de convidar vocês.','',
  '📅 {data_evento}','🕕 {horario_evento}','📍 {endereco}','',
  'Acesse: {link_convite}','Código: {codigo_acesso}','',
  'Pedimos que confirmem a presença assim que possível. 💛'
 ].join('\n'),
 eventReminder:[
  'Olá, {nome_familia}! 💛','',
  'Já estamos na contagem regressiva para o Chá do Oliver! 🎉','',
  '📅 {data_evento}','🕕 {horario_evento}','📍 {endereco}','',
  'Estamos ansiosos para celebrar com vocês. 💛'
 ].join('\n')
};
export function messageTemplateType(family={},kind='invitation',date=eventToday()){
 if(kind!=='invitation')return kind;
 const stamp=family?.invite_sent_at;
 const issuedLate=stamp&&Date.parse(stamp)>=Date.parse('2026-12-01T00:00:00-03:00');
 return issuedLate||date>'2026-11-30'?'lateInvitation':'invitation';
}
export function validateMessageTemplates(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Modelos inválidos.');
 const clean={};
 for(const {key} of MESSAGE_TYPES){
  const template=value[key]===undefined?MESSAGE_DEFAULTS[key]:value[key];
  if(typeof template!=='string'||template.length>5000||!template.trim())throw Error('Cada modelo precisa ter até 5.000 caracteres e um texto.');
  // Variáveis são estritamente limitadas ao catálogo para evitar textos imprevisíveis.
  const placeholders=[...template.matchAll(/\{([^{}]+)\}/g)].map(m=>m[1]);
  const invalid=placeholders.filter(v=>!MESSAGE_VARIABLES.includes(v));
  if(invalid.length)throw Error('Variáveis não reconhecidas: '+[...new Set(invalid)].join(', '));
  clean[key]=template.replace(/\r\n?/g,'\n');
 }
 return clean;
}
export function parseMessageBackup(text){
 const doc=JSON.parse(text);
 if(doc?.format!=='olie-mensagens-v1')throw Error('Backup de mensagens incompatível.');
 return validateMessageTemplates(doc.templates);
}
export function messageBackup(templates){
 return JSON.stringify({format:'olie-mensagens-v1',exportedAt:new Date().toISOString(),templates:validateMessageTemplates(templates)},null,2);
}
export function readMessageTemplates(storage){
 try{const raw=storage?.getItem(MESSAGE_STORE_KEY);if(!raw)return {...MESSAGE_DEFAULTS};return parseMessageBackup(raw)}
 catch{return {...MESSAGE_DEFAULTS}}
}
export function messageParameters(family={},date=eventToday()){
 const days=daysUntil('2026-12-04',date);
 return {
  nome_familia:family.display_name||family.name||'Família convidada',
  codigo_acesso:family.invite_pin_plain||family.token||'[código não disponível]',
  link_convite:'https://cha-oliver-mvp.vercel.app/',
  data_evento:'04/12/2026 (sexta-feira)',
  horario_evento:'das 18h às 22h',
  endereco:'Salão Terra Mágica — Av. das Nações, 151, sobreloja, Parque Novo Oratório, Santo André - SP',
  link_mapa:'https://www.google.com/maps/search/?api=1&query=Av.%20das%20Na%C3%A7%C3%B5es%2C%20151%20-%20Parque%20Novo%20Orat%C3%B3rio%2C%20Santo%20Andr%C3%A9%20-%20SP',
  prazo_confirmacao:date>'2026-11-30'?'Pedimos que confirmem a presença assim que possível. 💛':'Confirme a presença até 30/11/2026 para nos ajudar com a produção. 💛',
  dias_restantes:String(Math.max(0,days===null?0:days))
 };
}
export function renderMessageTemplate(template,params={}){
 const src=String(template??'');
 return src.replace(/\{([a-z_]+)\}/g,(match,key)=>Object.hasOwn(params,key)?String(params[key]):match);
}
export function familyMessage(family,kind='invitation',templates=MESSAGE_DEFAULTS,date=eventToday()){
 const safe=validateMessageTemplates(templates);
 const selected=messageTemplateType(family,kind,date);
 if(!Object.hasOwn(safe,selected))throw Error('Modelo de mensagem inválido.');
 return renderMessageTemplate(safe[selected],messageParameters(family,date));
}
