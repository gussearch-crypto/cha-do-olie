import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const inventory=read('oliver-post-event-inventory.jsx');
const originalKey='oliver-post-event-local-draft-v1';

test('Sprint 5 simplificada preserva o armazenamento local e o backup existente',()=>{
 assert.match(inventory,/const KEY='oliver-post-event-local-draft-v1'/);
 assert.match(inventory,/parsePostEventBackup\(stored\)/);
 assert.match(inventory,/localStorage\.setItem\(KEY,postEventBackup\(rows\)\)/);
 assert.match(inventory,/setRows\(data\)/);
 assert.match(inventory,/Inventário salvo neste navegador/);
});

test('Sprint 5 não ativa sincronização nem escreve em tabela de inventário do Supabase',()=>{
 assert.doesNotMatch(inventory,/inventoryApiUrl|inventoryApiRequest|inventoryStateResponse|mergeInventoryRows/);
 assert.doesNotMatch(inventory,/VITE_OLIVER_INVENTORY_TEST_URL|oliver-inventory\/|expectedRevision/);
 assert.doesNotMatch(inventory,/setRemote|setMode\(|shared|Mesclar rascunho/);
 assert.match(inventory,/enxovalTransferCsv\(rows\)/);
 assert.match(inventory,/enxovalTransferJson\(rows\)/);
 // A leitura pré-existente do Financeiro continua sendo apenas consulta.
 assert.match(inventory,/action:'get',adminCode:code/);
 assert.doesNotMatch(inventory,/action:'save',adminCode:code/);
});

test('registro e exportações preservam pacote × unidades por pacote',()=>{
 assert.match(inventory,/requireDiaperUnits:true/);
 assert.match(inventory,/item\.quantity\*item\.unitsPerPackage/);
 assert.match(inventory,/sum\.diaperUnits/);
 assert.match(inventory,/postEventCsv\(rows\)/);
});
