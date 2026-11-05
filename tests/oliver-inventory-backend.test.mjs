import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('schema de inventário não expõe tabelas para visitantes ou convidados',()=>{
 const sql=file('supabase/migrations/20261105203000_oliver_inventory_state.sql').toLowerCase();
 assert.match(sql,/create table if not exists public\.oliver_inventory_state/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.oliver_inventory_state from anon, authenticated/);
 assert.doesNotMatch(sql,/create policy\s+.*\s+to anon/);
 assert.match(sql,/revision bigint not null/);
});
test('api requer PIN por hash não versionado e oferece controle otimista de revisão',()=>{
 const code=file('supabase/functions/oliver-inventory/index.ts');
 assert.match(code,/OLIVER_INVENTORY_ADMIN_CODE_SHA256/);
 assert.match(code,/configuredAdminHash\(\)/);
 assert.match(code,/expectedRevision/);
 assert.match(code,/\.eq\('revision',revision\)/);
 assert.match(code,/status:204/);
 assert.match(code,/origin_not_allowed/);
 assert.doesNotMatch(code,/const ADMIN_HASH='[a-f0-9]{64}'/);
 assert.doesNotMatch(code,/from\('guests'\)|from\('families'\)/);
});
test('Preview jamais aponta por padrão para o Supabase real',()=>{
 const code=file('oliver-inventory-sync.mjs');
 assert.match(code,/INVENTORY_PRODUCTION_HOST/);
 assert.match(code,/if\(String\(hostname\|\|''\)\.toLowerCase\(\)!==INVENTORY_PRODUCTION_HOST\)return null/);
 const ui=file('oliver-post-event-inventory.jsx');
 assert.match(ui,/Mesclar rascunho/);
 assert.match(ui,/Conflito/);
});
