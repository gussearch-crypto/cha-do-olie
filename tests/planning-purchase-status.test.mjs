import test from 'node:test';import assert from 'node:assert/strict';import {updatePurchaseStatus} from '../planning-shopping-utils.mjs';
test('quick status changes and undo preserve purchase details, task completion and financial data',()=>{
 const data={shopping:[{id:'s1',title:'Copos',quantity:100,unit:'unidades',responsible:'Gustavo',taskId:'t1',expenseId:'e1',status:'pending',notes:'Manter cor'}],tasks:[{id:'t1',status:'todo'}],expenses:[{id:'e1',contracted:50,paid:0}]};
 const next=updatePurchaseStatus(data,'s1','bought','pending');assert.deepEqual(next.shopping[0],{...data.shopping[0],status:'bought'});assert.deepEqual(next.tasks,data.tasks);assert.deepEqual(next.expenses,data.expenses);assert.equal(data.shopping[0].status,'pending');assert.deepEqual(updatePurchaseStatus(next,'s1','pending','bought'),data);assert.equal(updatePurchaseStatus(next,'s1','bought','bought'),next);
});
test('invalid, removed or concurrently changed purchases cannot be updated or undone with stale status',()=>{
 const data={shopping:[{id:'s1',status:'ordered'}]};assert.throws(()=>updatePurchaseStatus(data,'s1','invalid'),/válido/);assert.throws(()=>updatePurchaseStatus(data,'missing','bought'),/disponível/);assert.throws(()=>updatePurchaseStatus(data,'s1','pending','bought'),/alterado/);assert.equal(data.shopping[0].status,'ordered');
});
