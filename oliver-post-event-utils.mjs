// Inventário voluntário, sem convidado, família, remetente ou vínculo RSVP.
export const POST_EVENT_SIZES=Object.freeze(['RN','P','M','G','GG','XG']);
export const POST_EVENT_TYPES=Object.freeze(['fralda','presente']);
const cents=v=>Math.round(Number(v)*100);
const csvCell=x=>{
 let value=String(x??'');
 if(/^[\s]*[=+@-]/.test(value))value="'"+value;
 return '"'+value.replaceAll('"','""')+'"';
};
export function validatePostEventItem(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Registro inválido');
 const type=value.type;
 if(!POST_EVENT_TYPES.includes(type))throw Error('Categoria inválida');
 const desc=String(value.description||'').trim();
 if(!desc||desc.length>120)throw Error('Informe a descrição do item (até 120 caracteres)');
 const quantity=Number(value.quantity);
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100000)throw Error('Informe uma quantidade inteira de 1 a 100.000');
 const size=String(value.size||'');
 if(type==='fralda'&&!POST_EVENT_SIZES.includes(size))throw Error('Selecione o tamanho da fralda');
 const brand=String(value.brand||'').trim(),notes=String(value.notes||'').trim();
 if(brand.length>80||notes.length>240)throw Error('Marca ou observações muito longas');
 const unitValue=Number(value.unitValue||0);
 if(!Number.isFinite(unitValue)||unitValue<0||unitValue>1000000||!Number.isSafeInteger(cents(unitValue)))throw Error('Informe valor unitário válido');
 return {id:String(value.id||''),type,size:type==='fralda'?size:'',brand,description:desc,quantity,unitValue:cents(unitValue)/100,notes};
}
export function postEventSummary(rows=[]){
 const items=(Array.isArray(rows)?rows:[]).map(validatePostEventItem);
 const diapers=items.filter(x=>x.type==='fralda');
 const gifts=items.filter(x=>x.type==='presente');
 const sumValue=list=>list.reduce((a,x)=>a+Math.round(x.unitValue*100)*x.quantity,0)/100;
 return {diaperPacks:diapers.reduce((a,x)=>a+x.quantity,0),
  giftUnits:gifts.reduce((a,x)=>a+x.quantity,0),
  estimate:sumValue(items),sizes:Object.fromEntries(POST_EVENT_SIZES.map(size=>[size,diapers.filter(x=>x.size===size).reduce((a,x)=>a+x.quantity,0)])),
  rows:items.length};
}
export function postEventCsv(rows=[]){
 const data=(Array.isArray(rows)?rows:[]).map(validatePostEventItem);
 const head=['Tipo','Descrição','Tamanho','Marca','Quantidade','Valor unitário estimado (R$)','Valor total estimado (R$)','Observações'];
 const records=data.map(x=>[x.type==='fralda'?'Fralda':'Presente',x.description,x.size,x.brand,x.quantity,
  x.unitValue.toFixed(2).replace('.',','),(x.unitValue*x.quantity).toFixed(2).replace('.',','),x.notes]);
 return '\uFEFF'+[head,...records].map(cols=>cols.map(csvCell).join(';')).join('\r\n')+'\r\n';
}
export function postEventBackup(rows=[]){
 return JSON.stringify({format:'olie-inventario-v1',exportedAt:new Date().toISOString(),items:(Array.isArray(rows)?rows:[]).map(validatePostEventItem)},null,2);
}
export function parsePostEventBackup(text){
 const raw=JSON.parse(text);
 if(raw?.format!=='olie-inventario-v1'||!Array.isArray(raw.items)||raw.items.length>1000)throw Error('Arquivo incompatível com o inventário');
 const ids=new Set();
 return raw.items.map(item=>{
  const safe=validatePostEventItem(item);
  if(!/^[A-Za-z0-9_-]{6,100}$/.test(safe.id)||ids.has(safe.id))throw Error('Identificador inválido ou duplicado');
  ids.add(safe.id);return safe;
 });
}
