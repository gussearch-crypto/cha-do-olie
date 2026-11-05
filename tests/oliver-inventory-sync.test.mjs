import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryApiUrl,mergeInventoryRows,inventoryStateResponse,inventoryApiRequest,enxovalTransferCsv,enxovalTransferJson} from '../oliver-inventory-sync.mjs';
const item=(id,q,size='M',units=32)=>({id,type:'fralda',description:'Pacote '+size,size,brand:'',quantity:q,unitsPerPackage:units,unitValue:0,notes:''});
test('Preview nunca aponta para o banco principal; Production usa função própria',()=>{
 const endpoint='https://jkucovnonbiqfbaakfmn.supabase.co';
 assert.equal(inventoryApiUrl('cha-oliver-mvp.vercel.app',endpoint),endpoint+'/functions/v1/oliver-inventory');
 for(const name of ['localhost','cha-oliver-mvp-git-dev-supabase-gh-57f5.vercel.app','outro.com','cha-oliver-mvp.vercel.app.evil.io']){
  assert.equal(inventoryApiUrl(name,endpoint),null);
 }
});
test('mescla apenas IDs novos, sem dobrar estoque ao importar duas vezes',()=>{
 const a=item('pacote123',1),b=item('pacote456',1,'M',56);
 let r=mergeInventoryRows([a],[b]);
 assert.equal(r.added,1);assert.equal(r.conflicts,0);
 assert.deepEqual(r.items,[a,b]);
 r=mergeInventoryRows(r.items,[b]);
 assert.equal(r.added,0);
 assert.equal(r.items.length,2);
 assert.equal(mergeInventoryRows([a],[{...a,quantity:9}]).conflicts,1);
});
test('conflitos 409 não devem ser aceitos como gravação bem-sucedida',async()=>{
 const mock=async()=>({ok:false,status:409,json:async()=>({error:'conflict'})});
 await assert.rejects(inventoryApiRequest('https://example.com','admin',{action:'save',expectedRevision:1,items:[]},mock),e=>e.message==='CONFLICT'&&e.status===409);
});
test('requisição envia expectedRevision e não perde código administrativo',async()=>{
 let payload;
 const mock=async(_,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({revision:2,items:[]})}};
 const result=await inventoryApiRequest('https://example.com','xyz',{action:'save',expectedRevision:1,items:[]},mock);
 assert.equal(payload.expectedRevision,1);
 assert.equal(payload.adminCode,'xyz');assert.equal(result.revision,2);
});
test('resposta compartilhada só aceita versão e itens válidos',()=>{
 assert.equal(inventoryStateResponse({revision:0,items:[]}).revision,0);
 assert.throws(()=>inventoryStateResponse({revision:null,items:[]}));
 assert.throws(()=>inventoryStateResponse({revision:2,items:[{id:'x',type:'fralda'}]}));
});
test('transferência envia fraldas por unidade e não pessoas',()=>{
 const rows=[item('pacote123',1,'M',32),item('pacote456',1,'M',56),item('pacote789',2,'P',40)];
 const csv=enxovalTransferCsv(rows);
 assert.match(csv,/"M";"88";"2"/);
 assert.match(csv,/"P";"80";"2"/);
 const json=JSON.parse(enxovalTransferJson(rows));
 assert.equal(json.diapers.find(x=>x.size==='M').stockToAdd,88);
 assert.equal(json.diapers.find(x=>x.size==='P').stockToAdd,80);
 assert.equal(json.requiresReview,false);
 assert.deepEqual(json.sourceIds,['pacote123','pacote456','pacote789']);
 assert.doesNotMatch(csv+JSON.stringify(json),/Telefone|Convidado|Remetente|Núcleo/);
});
test('pacotes de legado sem unidade exigem revisão e não geram estoque fictício',()=>{
 const legacy=[item('pacote123',1,'M',null)];
 const transfer=JSON.parse(enxovalTransferJson(legacy));
 assert.equal(transfer.requiresReview,true);
 assert.equal(transfer.diapers.find(x=>x.size==='M').stockToAdd,0);
 assert.equal(transfer.diapers.find(x=>x.size==='M').packagesWithoutUnitCount,1);
});
