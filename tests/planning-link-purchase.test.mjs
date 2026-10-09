import test from 'node:test';import assert from 'node:assert/strict';import {linkExistingPurchase} from '../planning-shopping-utils.mjs';
const fixture=()=>({tasks:[{id:'t1',title:'Mesa'},{id:'t2',title:'Bebidas'}],shopping:[{id:'s1',title:'Copos',quantity:100,unit:'unidades',status:'bought',responsible:'Gustavo',expenseId:'e1',taskId:'t2',notes:'Manter cor'}],expenses:[{id:'e1',contracted:50,installments:[{paidAmount:50}]}],history:[],trash:[]});
test('link existing purchase atomically saves action and transfers one link while preserving purchase and financial data',()=>{
 const data=fixture(),task={...data.tasks[0],title:'Mesa atualizada'};const result=linkExistingPurchase(data,task,'s1','t2');assert.equal(result.tasks[0].title,'Mesa atualizada');assert.equal(result.shopping.length,1);assert.deepEqual(result.shopping[0],{...data.shopping[0],taskId:'t1'});assert.deepEqual(result.expenses,data.expenses);assert.equal(data.shopping[0].taskId,'t2');assert.equal(result.tasks[1].title,'Bebidas');
});
test('new actions can link available purchases and stale or missing links are rejected before mutation',()=>{
 const data=fixture();data.shopping[0].taskId='';const task={id:'new',title:'Nova ação'};assert.equal(linkExistingPurchase(data,task,'s1','').tasks[0].id,'new');assert.throws(()=>linkExistingPurchase(data,task,'s1','t2'),/alterado/);assert.throws(()=>linkExistingPurchase(data,task,'missing',''),/disponível/);assert.throws(()=>linkExistingPurchase(data,{title:'Sem ID'},'s1',''),/Preencha/);assert.equal(data.tasks.length,2);
 const linked=linkExistingPurchase(data,task,'s1','');assert.throws(()=>linkExistingPurchase(linked,task,'s1','new'),/já está/);
});
