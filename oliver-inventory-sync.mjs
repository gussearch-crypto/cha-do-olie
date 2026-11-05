import {validatePostEventItem,POST_EVENT_SIZES,postEventSummary} from './oliver-post-event-utils.mjs';
export const INVENTORY_PRODUCTION_HOST='cha-oliver-mvp.vercel.app';
export function inventoryApiUrl(hostname,supabaseUrl){
 if(String(hostname||'').toLowerCase()!==INVENTORY_PRODUCTION_HOST)return null;
 const url=String(supabaseUrl||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))return null;
 return url.replace(/\/$/,'')+'/functions/v1/oliver-inventory';
}
export function mergeInventoryRows(current=[],incoming=[]){
 const rows=new Map();
 for(const item of current.map(x=>validatePostEventItem(x)))rows.set(item.id,item);
 let added=0,conflicts=0;
 for(const item of incoming.map(x=>validatePostEventItem(x))){
  if(!rows.has(item.id)){rows.set(item.id,item);added++}
  else if(JSON.stringify(rows.get(item.id))!==JSON.stringify(item))conflicts++;
 }
 return {items:[...rows.values()],added,conflicts};
}
export function inventoryStateResponse(result){
 if(!result||!Array.isArray(result.items)||!Number.isSafeInteger(result.revision)||result.revision<0)throw Error('Resposta inválida do inventário compartilhado');
 return {items:result.items.map(x=>validatePostEventItem(x)),revision:result.revision,
  history:Array.isArray(result.history)?result.history:[],updatedAt:result.updatedAt||null};
}
export async function inventoryApiRequest(url,adminCode,body,fetchImpl=fetch){
 if(!url||typeof url!=='string'||!adminCode)throw Error('Backend administrativo indisponível');
 const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({...body,adminCode}),cache:'no-store'});
 let json;
 try{json=await response.json()}catch{throw Error('Resposta inválida do servidor')}
 if(!response.ok){
  const e=new Error(response.status===409?'CONFLICT':json.error||'SERVER');
  e.status=response.status;throw e;
 }
 return json;
}
const quote=t=>{
 let value=String(t??'');
 if(/^\s*[=+\-@]/.test(value))value="'"+value;
 return '"'+value.replaceAll('"','""')+'"';
};
export function enxovalTransferCsv(rows=[]){
 const s=postEventSummary(rows);
 const header=['Tamanho','Fraldas recebidas (unidades)','Pacotes recebidos','Pacotes com unidades não informadas','Origem'];
 return '\uFEFF'+[header,...POST_EVENT_SIZES.map(size=>[size,s.sizes[size],s.packsBySize[size],s.unknownPacksBySize[size],'Chá do Oliver'])]
  .map(cols=>cols.map(quote).join(';')).join('\r\n')+'\r\n';
}
export function enxovalTransferJson(rows=[]){
 const s=postEventSummary(rows);
 const clean=rows.map(x=>validatePostEventItem(x));
 return JSON.stringify({
  format:'enxoval-oliver-transfer-v1',source:'cha-do-oliver',version:1,
  notice:'Arquivo de transferência para conferência/importação controlada; não altera o estoque automaticamente.',
  diapers:POST_EVENT_SIZES.map(size=>({size,stockToAdd:s.sizes[size],packages:s.packsBySize[size],packagesWithoutUnitCount:s.unknownPacksBySize[size]})),
  gifts:clean.filter(x=>x.type==='presente').map(x=>({id:x.id,description:x.description,quantity:x.quantity,brand:x.brand})),
  sourceIds:clean.map(x=>x.id).sort(),
  requiresReview:s.uncountedPacks>0
 },null,2);
}
