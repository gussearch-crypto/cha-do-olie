import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const admin=read('admin-entry.jsx');
const api=read('supabase/functions/invite-api/index.ts');
const css=read('admin-panel.css');

test('painel permite confirmar presença individual de quem aguarda confirmação',()=>{
 assert.match(admin,/\{g\.attendance==='pending'&&<span className="guestPendingActions">/);
 assert.match(admin,/onClick=\{\(\)=>restoreAttendance\(f,g,'yes'\)\} title=\{'Confirmar presença de '\+g\.name\}/);
 assert.match(admin,/>Confirmar presença<\/button>/);
 assert.match(admin,/>Marcar ausência<\/button>/);
 assert.match(css,/\.guestPendingActions \.guestConfirmButton/);
});

test('confirmação de pendente exige senha administrativa, revisão de status e histórico',()=>{
 const block=api.slice(api.indexOf('if(action==="adminRestoreAttendance"){'),api.indexOf('if(action==="adminUpdateFamily"){'));
 assert.ok(block.startsWith('if(action==="adminRestoreAttendance"){'));
 assert.match(block,/await isAdmin\(body\.adminCode\)/);
 assert.match(block,/await isAdmin\(body\.confirmationCode\)/);
 assert.match(block,/\["pending","no"\]\.includes\(x\.attendance\)/);
 assert.match(block,/p_source:"administrador"/);
 assert.match(block,/update_guest_attendance_with_source/);
 assert.match(block,/\.update\(\{invite_status:status/);
 assert.match(block,/child_age_required/);
 assert.match(admin,/if\(historyOpen\)loadAttendanceHistory\(\)/);
});

test('validação da capacidade exclui menores de 5 e não bloqueia em 30/11',()=>{
 const block=api.slice(api.indexOf('if(action==="adminRestoreAttendance"){'),api.indexOf('if(action==="adminUpdateFamily"){'));
 assert.match(block,/event_settings"\)\.select\("capacity_counted"\)/);
 assert.match(block,/g\.person_type==="child"&&g\.child_age_group==="under_5"/);
 assert.match(block,/confirmed\+added>capacity/);
 assert.match(block,/event_capacity_reached/);
 assert.doesNotMatch(block,/isLateLegacy|RSVP_CUTOFF/);
});

test('Preview não altera o Supabase real ao clicar em confirmar',()=>{
 assert.match(admin,/next==='yes'&&window\.location\.hostname!=='cha-oliver-mvp\.vercel\.app'/);
 assert.match(admin,/indisponível na Preview para proteger o banco oficial/);
 assert.match(admin,/event_capacity_reached/);
 assert.match(admin,/next==='yes'&&g\?\.person_type==='child'/);
});

test('reversão de ausências permanece disponível sem confirmar todos do núcleo',()=>{
 assert.match(admin,/restoreAttendance\(f,g,'pending'\)/);
 assert.match(admin,/restoreAttendance\(f,g,'yes'\)/);
 assert.match(admin,/restoreAttendance\(f\)/);
 assert.match(api,/next==="yes"\?!\["pending","no"\]/);
 assert.match(api,/only_absent_can_be_restored/);
 assert.match(api,/no===current\.length\?"declined":yes===current\.length\?"confirmed"/);
});
