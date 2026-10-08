import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
const source=await readFile(new URL('../supabase/functions/planning-api/index.ts',import.meta.url),'utf8');
const code=(await transformWithOxc(source.replace(/^import .*;\n/gm,'').replace(/const ADMIN_HASH="[^"]+";/,'const ADMIN_HASH="'+createHash('sha256').update('test-admin').digest('hex')+'";'),'index.ts')).code;
function endpoint(previous={budgets:{Local:500}}){
 let handler,saved,loadError=null,saveError=null,uploadError=null;let state=structuredClone(previous),revision=0,write=null,filters={},race=false;const uploads=[],removals=[],signed=[];
 const table={select:()=>table,eq:(key,value)=>{filters[key]=value;return table},update:row=>{write=row;filters={};return table},insert:row=>{write=row;filters={};return table},maybeSingle:async()=>{if(!write){filters={};return {data:state?{data:structuredClone(state),revision}:null,error:loadError}}const row=write;write=null;if(race){revision++;race=false}if(saveError)return {error:saveError};if(filters.revision!==undefined&&filters.revision!==revision)return {data:null,error:null};if(filters.revision===undefined&&state)return {error:{code:'23505'}};saved=structuredClone(row.data);state=saved;revision=row.revision;return {data:{revision},error:null}}};
 const bucket={upload:async(path,bytes,options)=>{uploads.push({path,size:bytes.length,options});return {error:uploadError}},remove:async paths=>{removals.push(...paths);return {error:null}},createSignedUrl:async(path,seconds)=>{signed.push({path,seconds});return {data:{signedUrl:'https://example.test/signed'},error:null}}};
 vm.runInNewContext(code,{crypto:webcrypto,TextEncoder,Response,Request,File,createClient:()=>({from:()=>table,storage:{from:name=>{assert.equal(name,'planning-documents');return bucket}}}),Deno:{env:{get:()=>''},serve:fn=>{handler=fn}}});
 const invoke=async request=>{const response=await handler(request);return {status:response.status,json:await response.json()}};
 return {call:body=>invoke(new Request('https://example.test',{method:'POST',body:JSON.stringify({adminCode:'test-admin',expectedRevision:revision,...body})})),upload:(file,target={},adminCode='test-admin')=>{const form=new FormData();form.set('action','upload');form.set('adminCode',adminCode);form.set('expectedRevision',String(revision));form.set('file',file);Object.entries(target).forEach(([k,v])=>form.set(k,v));return invoke(new Request('https://example.test',{method:'POST',body:form}))},revision:()=>revision,race:()=>{race=true},saved:()=>saved,uploads,removals,signed,failLoad:()=>{loadError={message:'offline'}},failSave:()=>{saveError={message:'offline'}},failUpload:()=>{uploadError={message:'offline'}}};
}
test('API persists and returns budgets with the planning payload',async()=>{
 const api=endpoint();const data={tasks:[],expenses:[],budgets:{Local:500.123,'Alimentação':0}};
 assert.equal((await api.call({action:'save',data})).status,200);assert.deepEqual(JSON.parse(JSON.stringify(api.saved().budgets)),{Local:500.12,'Alimentação':0});
 assert.deepEqual((await api.call({action:'get'})).json.data.budgets,{Local:500.12,'Alimentação':0});
});
test('older clients preserve stored budgets and explicit empty budgets remove limits',async()=>{
 const api=endpoint();await api.call({action:'save',data:{tasks:[],expenses:[]}});assert.equal(api.saved().budgets.Local,500);
 await api.call({action:'save',data:{tasks:[],expenses:[],budgets:{}}});assert.equal(Object.keys(api.saved().budgets).length,0);
 const failed=endpoint();failed.failLoad();assert.equal((await failed.call({action:'save',data:{tasks:[],expenses:[]}})).status,500);assert.equal(failed.saved(),undefined);
});
test('API rejects invalid budgets and unauthenticated changes before writing',async()=>{
 for(const budgets of [null,[],{Local:-1},{Local:'500'},Object.fromEntries(Array.from({length:101},(_,i)=>[String(i),1]))]){const api=endpoint();assert.equal((await api.call({action:'save',data:{tasks:[],expenses:[],budgets}})).status,400);assert.equal(api.saved(),undefined)}
 const api=endpoint();assert.equal((await api.call({adminCode:'invalid',action:'save',data:{tasks:[],expenses:[],budgets:{}}})).status,401);assert.equal(api.saved(),undefined);
});

const fixture=()=>({tasks:[],expenses:[{id:'service',description:'Buffet',contracted:100,installments:[{id:'p',amount:100,paidAmount:100,paidAt:'2026-10-05'}]}],trash:[]});
const pdf=()=>new File(['%PDF-1.4 test'], 'contrato.pdf',{type:'application/pdf'});
test('private uploads persist service files and legacy payment receipts, and sign referenced files only',async()=>{
 const api=endpoint(fixture());let result=await api.upload(pdf(),{expenseId:'service'});assert.equal(result.status,200);const doc=result.json.expense.attachments[0];assert.equal(api.uploads[0].options.upsert,false);assert.equal(api.uploads[0].options.contentType,'application/pdf');
 assert.equal((await api.call({action:'file_url',path:doc.path})).status,200);assert.equal(api.signed[0].seconds,60);
 assert.equal((await api.call({action:'file_url',path:'expenses/service/00000000-0000-0000-0000-000000000000.pdf'})).status,404);assert.equal(api.signed.length,1);
 result=await api.upload(pdf(),{expenseId:'service',installmentId:'p',paymentId:'legacy-p'});assert.equal(result.status,200);assert.equal(result.json.expense.installments[0].paidAmount,100);assert.equal(result.json.expense.installments[0].payments[0].attachments.length,1);
 assert.equal((await api.call({action:'remove_file',expenseId:'service',path:doc.path})).status,200);assert.equal(api.saved().expenses[0].attachments.length,0);assert.ok(api.removals.includes(doc.path));
});
test('uploads reject unauthorized requests, invalid signatures, size, missing targets and cleanup failed writes',async()=>{
 const api=endpoint(fixture());assert.equal((await api.upload(pdf(),{expenseId:'service'},'invalid')).status,401);
 for(const file of [new File(['<html>'], 'fake.pdf',{type:'application/pdf'}),new File(['%PDF-'], 'bad.jpg',{type:'image/jpeg'}),new File([new Uint8Array(5242881)],'large.pdf',{type:'application/pdf'})])assert.equal((await api.upload(file,{expenseId:'service'})).status,400);
 assert.equal(api.uploads.length,0);assert.equal((await api.upload(pdf(),{expenseId:'missing'})).status,404);assert.equal((await api.upload(pdf(),{expenseId:'service',installmentId:'p',paymentId:'missing'})).status,404);
 const failed=endpoint(fixture());failed.failSave();assert.equal((await failed.upload(pdf(),{expenseId:'service'})).status,500);assert.equal(failed.removals[0],failed.uploads[0].path);assert.equal(failed.saved(),undefined);
 const storageFailed=endpoint(fixture());storageFailed.failUpload();assert.equal((await storageFailed.upload(pdf(),{expenseId:'service'})).status,500);assert.equal(storageFailed.saved(),undefined);
});
test('trash survives older clients and archived documents remain available to authenticated admins',async()=>{
 const state=fixture();const path='expenses/service/00000000-0000-0000-0000-000000000000.pdf';state.expenses[0].attachments=[{path}];state.trash=[{id:'deleted',type:'expense',item:state.expenses[0],deletedAt:'2026-10-05T12:00:00Z'}];state.expenses=[];
 const api=endpoint(state);assert.equal((await api.call({action:'save',data:{tasks:[],expenses:[],budgets:{}}})).status,200);assert.equal(api.saved().trash.length,1);
 assert.equal((await api.call({action:'file_url',path})).status,200);
 assert.equal((await api.call({adminCode:'invalid',action:'file_url',path})).status,401);
 assert.equal((await api.call({action:'save',data:{tasks:[],expenses:[],trash:'bad'}})).status,400);
});

test('revision compare-and-swap rejects stale, missing and racing writes without losing saved data',async()=>{
 const api=endpoint(fixture()),data=fixture();
 assert.equal((await api.call({action:'save',data,expectedRevision:undefined})).json.error,'upgrade_required');
 assert.equal((await api.call({action:'save',data,expectedRevision:7})).status,409);
 assert.equal(api.saved(),undefined);
 assert.equal((await api.call({action:'save',data,expectedRevision:0})).json.revision,1);
 assert.equal((await api.call({action:'save',data,expectedRevision:0})).status,409);
 api.race();assert.equal((await api.call({action:'save',data})).status,409);
 assert.equal((await api.call({action:'get'})).json.revision,2);
 const upload=endpoint(fixture());upload.race();assert.equal((await upload.upload(pdf(),{expenseId:'service'})).status,409);assert.equal(upload.saved(),undefined);assert.equal(upload.removals[0],upload.uploads[0].path);
 const initial=endpoint(null);assert.equal((await initial.call({action:'save',data,expectedRevision:0})).json.revision,1);
});

test('API stores quote comparisons and guest settings, preserves them for compatible older clients and rejects invalid payloads',async()=>{
 const quote={id:'q',title:'Buffet',category:'Alimentação',proposals:[{id:'p',supplier:'Fornecedor',amount:1000,terms:'Pix',validUntil:'2026-12-04'}]};
 const data={tasks:[],expenses:[],quotes:[quote],guestSettings:{basis:'confirmed',excludeUnder5:true,estimatedGuests:100}},api=endpoint();
 assert.equal((await api.call({action:'save',data})).status,200);assert.equal((await api.call({action:'get'})).json.data.quotes[0].proposals[0].amount,1000);
 await api.call({action:'save',data:{tasks:[],expenses:[]}});assert.equal(api.saved().quotes[0].title,'Buffet');assert.equal(api.saved().guestSettings.excludeUnder5,true);
 for(const quotes of [null,[{...quote,proposals:[]}],[{...quote,proposals:[{...quote.proposals[0],amount:-1}]}],[quote,quote]])assert.equal((await api.call({action:'save',data:{...data,quotes}})).status,400);
 assert.equal((await api.call({action:'save',data:{...data,guestSettings:{...data.guestSettings,estimatedGuests:10001}}})).status,400);
 assert.equal((await api.call({action:'save',data:{...data,quotes:[],trash:[{id:'deleted',type:'quote',item:quote,deletedAt:'2026-10-06'}]}})).status,200);
});

test('history is generated by the server, survives old clients and cannot be forged or cleared',async()=>{
 const data={tasks:[{id:'t1',title:'Definir decoração',status:'todo',responsible:'Gustavo'}],expenses:[],budgets:{},quotes:[],guestSettings:{basis:'confirmed',excludeUnder5:true,estimatedGuests:100},history:[{id:'existing',at:'2026-10-06T20:00:00Z',section:'tasks',title:'Antes',action:'Criado',changes:[]}]};
 const api=endpoint(data),changed={...data,tasks:[{...data.tasks[0],responsible:'Vanessa',status:'done'}],history:[{id:'forged'}]};
 const saved=await api.call({action:'save',data:changed});assert.equal(saved.status,200);
 assert.equal(saved.json.history.length,2);assert.equal(saved.json.history[0].title,'Definir decoração');
 assert.deepEqual(saved.json.history[0].changes.find(c=>c.label==='Responsável'),{label:'Responsável',before:'Gustavo',after:'Vanessa'});
 assert.equal(saved.json.history.at(-1).id,'existing');assert(!saved.json.history.some(e=>e.id==='forged'));
 const oldClient={tasks:changed.tasks,expenses:[]};await api.call({action:'save',data:oldClient});assert.equal(api.saved().history.length,2);
 await api.call({action:'save',data:{...changed,history:[]}});assert.equal(api.saved().history.length,2);
 await api.call({action:'save',data:{...changed,tasks:[],history:[]}});assert.equal(api.saved().history[0].action,'Movido para a lixeira');
});

test('history records remaining payment changes and failed concurrent writes add no entries',async()=>{
 const expense={id:'e1',description:'Decoração',contracted:1000,installments:[{id:'p1',label:'Sinal',amount:500,paidAmount:0,due:'2026-11-01'}]};
 const data={tasks:[],expenses:[expense],history:[]};const api=endpoint(data);
 const changed={...data,expenses:[{...expense,installments:[{...expense.installments[0],paidAmount:100}]}]};
 const result=await api.call({action:'save',data:changed});assert.equal(result.status,200);assert(result.json.history[0].changes.some(c=>c.label==='Parcelas e pagamentos'));
 const entries=api.saved().history;api.race();assert.equal((await api.call({action:'save',data:{...changed,tasks:[{id:'t2',title:'Novo'}]}})).status,409);assert.deepEqual(api.saved().history,entries);
});

test('API rejects self dependencies, cycles and malformed links, and preserves removed prerequisites',async()=>{
 for(const tasks of [[{id:'a',title:'A',dependsOn:['a']}],[{id:'a',title:'A',dependsOn:['b']},{id:'b',title:'B',dependsOn:['a']}],[{id:'a',title:'A',dependsOn:'b'}]]){
  const api=endpoint();const result=await api.call({action:'save',data:{tasks,expenses:[]}});assert.equal(result.status,400);assert.equal(result.json.error,'invalid_dependencies');assert.equal(api.saved(),undefined);
 }
 const api=endpoint({tasks:[{id:'a',title:'Fornecedor'},{id:'b',title:'Sinal',dependsOn:[]}],expenses:[]});const saved=await api.call({action:'save',data:{tasks:[{id:'a',title:'Fornecedor'},{id:'b',title:'Sinal',dependsOn:['a']}],expenses:[]}});
 assert.equal(saved.status,200);assert.equal(saved.json.history.find(e=>e.recordId==='b').changes.find(c=>c.label==='Dependências').after,'Fornecedor');
 await api.call({action:'save',data:{tasks:[{id:'b',title:'Sinal',dependsOn:['a']}],expenses:[]}});assert.deepEqual(Array.from(api.saved().tasks[0].dependsOn),['a']);
});

test('supplier contact and delivery persist and their changes appear only in the matching service history',async()=>{
 const expense={id:'e1',description:'Salão',contracted:500,installments:[]},api=endpoint({tasks:[],expenses:[expense]});
 const updated={...expense,supplierContact:'Ana',supplierPhone:'11999999999',deliveryDate:'2026-12-04',deliveryTime:'17:00',deliveryPlace:'Salão principal',deliveryNotes:'Entrada lateral'};
 const result=await api.call({action:'save',data:{tasks:[],expenses:[updated]}});assert.equal(result.status,200);assert.equal(api.saved().expenses[0].supplierPhone,'11999999999');
 const entry=result.json.history.find(e=>e.recordId==='e1');assert.equal(entry.section,'expenses');assert.equal(entry.changes.find(c=>c.label==='Telefone / WhatsApp').after,'11999999999');assert.equal(entry.changes.find(c=>c.label==='Horário de entrega').after,'17:00');
 const loaded=await api.call({action:'get'});assert.equal(loaded.json.data.expenses[0].deliveryNotes,'Entrada lateral');assert.equal(loaded.json.data.history[0].recordId,'e1');
});

test('shopping persists independently of payments, survives older clients and records changes',async()=>{
 const item={id:'s1',title:'Copos',quantity:100,unit:'unidades',responsible:'Gustavo',status:'pending',taskId:'t1',expenseId:'e1',notes:''};
 const api=endpoint({tasks:[],expenses:[],shopping:[item]});
 await api.call({action:'save',data:{tasks:[],expenses:[]}});assert.equal(api.saved().shopping[0].title,'Copos');
 await api.call({action:'save',data:{tasks:[],expenses:[],shopping:[{...item,status:'bought'}]}});
 assert.equal(api.saved().shopping[0].status,'bought');assert.deepEqual(api.saved().expenses,[]);
 assert.equal(api.saved().history[0].section,'shopping');assert.equal(api.saved().history[0].changes[0].after,'Comprado');
 assert.equal((await api.call({action:'get'})).json.data.shopping[0].quantity,100);
 for(const shopping of [null,[{...item,quantity:0}],[{...item,quantity:'2'}],[{...item,status:'paid'}],[item,item],[{...item,title:''}]])assert.equal((await api.call({action:'save',data:{tasks:[],expenses:[],shopping}})).status,400);
 await api.call({action:'save',data:{tasks:[],expenses:[],shopping:[]}});assert.equal(api.saved().shopping.length,0);
});
