import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
const source=await readFile(new URL('../supabase/functions/planning-api/index.ts',import.meta.url),'utf8');
const code=(await transformWithOxc(source.replace(/^import .*;\n/gm,'').replace(/const ADMIN_HASH="[^"]+";/,'const ADMIN_HASH="'+createHash('sha256').update('test-admin').digest('hex')+'";'),'index.ts')).code;
function endpoint(previous={budgets:{Local:500}}){
 let handler,saved,loadError=null;
 const table={select:()=>table,eq:()=>table,maybeSingle:async()=>({data:{data:previous},error:loadError}),upsert:async row=>{saved=row.data;return {error:null}}};
 vm.runInNewContext(code,{crypto:webcrypto,TextEncoder,Response,Request,createClient:()=>({from:()=>table}),Deno:{env:{get:()=>''},serve:fn=>{handler=fn}}});
 return {call:async body=>{const response=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({adminCode:'test-admin',...body})}));return {status:response.status,json:await response.json()}},saved:()=>saved,failLoad:()=>{loadError={message:'offline'}}};
}
test('API persists and returns budgets with the planning payload',async()=>{
 const api=endpoint();const data={tasks:[],expenses:[],budgets:{Local:500.123,'Alimentação':0}};
 assert.equal((await api.call({action:'save',data})).status,200);assert.deepEqual(JSON.parse(JSON.stringify(api.saved().budgets)),{Local:500.12,'Alimentação':0});
 assert.deepEqual((await api.call({action:'get'})).json.data.budgets,{Local:500});
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
