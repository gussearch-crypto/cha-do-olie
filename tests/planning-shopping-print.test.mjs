import test from 'node:test';import assert from 'node:assert/strict';
import {filterShopping} from '../planning-shopping-utils.mjs';
import {shoppingPrintHtml} from '../planning-shopping-print.mjs';
const tasks=[{id:'t1',title:'Decoração'},{id:'t2',title:'Bebidas'}];
const items=[{id:'s1',title:'Copos',quantity:100,unit:'unidades',responsible:'Gustavo',status:'pending',taskId:'t1',expenseId:'e1',notes:'Conferir <script>alert(1)</script>'},{id:'s2',title:'Gelo',quantity:2.5,unit:'kg',responsible:'Vanessa',status:'ordered',taskId:'t2'},{id:'s3',title:'Toalhas',quantity:2,unit:'unidades',status:'bought',taskId:'removed'},{id:'s4',title:'Guardanapos',quantity:100,unit:'unidades',status:'pending',responsible:' '}];
test('shopping filters combine action, person, status and accent insensitive search',()=>{
 assert.deepEqual(filterShopping(items,tasks,{action:'id:t1',owner:'Gustavo',status:'pending',search:'decoracao'}).map(i=>i.id),['s1']);
 assert.equal(filterShopping(items,tasks,{action:'id:t1',owner:'Vanessa'}).length,0);
 assert.deepEqual(filterShopping(items,tasks,{action:'unavailable'}).map(i=>i.id),['s3']);assert.deepEqual(filterShopping(items,tasks,{action:'unlinked',owner:'unassigned'}).map(i=>i.id),['s4']);
});
test('shopping print includes blank checks, decimal quantities, link labels and safely escaped notes and filters',()=>{
 const html=shoppingPrintHtml(items,{tasks,expenses:[{id:'e1',description:'Utensílios'}],scope:'Busca <img src=x>',today:'2026-10-08'});
 assert.equal((html.match(/class="checkbox"/g)||[]).length,4);assert.match(html,/2,5/);assert.match(html,/kg/);assert.match(html,/Gustavo/);assert.match(html,/Utensílios/);assert.match(html,/Ação indisponível/);assert.match(html,/Sem ação vinculada/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img src=x&gt;/);assert(!html.includes('<script>'));assert.match(html,/08\/10\/2026/);assert.match(html,/table-header-group/);assert.match(html,/@page\{size:A4/);
 assert(html.indexOf('<h2>Copos')<html.indexOf('<h2>Gelo'));assert.equal(items[0].title,'Copos');
 const filtered=shoppingPrintHtml(filterShopping(items,tasks,{owner:'Vanessa'}),{tasks});assert(!filtered.includes('<h2>Copos'));assert.match(filtered,/<h2>Gelo/);
});
