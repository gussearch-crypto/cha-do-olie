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
