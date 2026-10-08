import test from 'node:test';
import assert from 'node:assert/strict';
import {schedulePrintHtml} from '../planning-print.mjs';
test('print document includes schedule details, pending dependencies and escapes stored text',()=>{
 const task={id:'t',title:'Montagem <script>alert(1)</script>',eventTime:'16:00',eventEnd:'17:00',responsible:'Gustavo & Vanessa',place:'Salão',contact:'Ana 11999999999',notes:'Entrada lateral\nPortão 2',dependsOn:['p'],subtasks:[{title:'Mesa',done:false},{title:'Toalhas',done:true}]};
 const html=schedulePrintHtml([task],'2026-12-04',{tasks:[task,{id:'p',title:'Entrega',status:'todo'}],scope:'Busca: <img src=x>'});
 assert.match(html,/04\/12\/2026/);assert.match(html,/16:00/);assert.match(html,/até 17:00/);assert.match(html,/Gustavo &amp; Vanessa/);assert.match(html,/Ana 11999999999/);assert.match(html,/Entrada lateral\nPortão 2/);assert.match(html,/Dependências pendentes: Entrega/);assert.match(html,/step-check">✓<\/span>Toalhas/);assert.match(html,/step-check"><\/span>Mesa/);assert.equal((html.match(/class="checkbox"/g)||[]).length,1);assert.match(html,/table-header-group/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img src=x&gt;/);assert(!html.includes('<script>'));assert.match(html,/@page\{size:A4/);
});
