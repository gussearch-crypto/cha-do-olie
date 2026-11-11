import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const admin=read('admin-entry.jsx');
const api=read('supabase/functions/invite-api/index.ts');
const css=read('admin-panel.css');
const familyAction=api.slice(api.indexOf('if(action==="adminUpdateFamily"){'),api.indexOf('if(action==="search"){'));

test('Convidados: a lista principal mostra apenas situações, sem botões de alteração por pessoa',()=>{
 const list=admin.slice(admin.indexOf('<div className="guestList">'),admin.indexOf('<section className="guestHistoryPanel"'));
 assert.match(list,/g\.attendance==='yes'\?'Confirmado':g\.attendance==='no'\?'Ausência registrada':'A confirmar'/);
 assert.match(list,/>Editar<\/button>/);
 assert.doesNotMatch(list,/restoreAttendance|markAbsent|guestPendingActions|Reabrir ausências do núcleo|Ausência do núcleo/);
});

test('Editar núcleo oferece A confirmar, Confirmado e Não irá para todos os integrantes',()=>{
 assert.match(admin,/const guestEditor=\(guests,setter,withAttendance=false\)/);
 assert.match(admin,/\{guestEditor\(editing\.guests,g=>setEditing\(\{\.\.\.editing,guests:g\}\),true\)\}/);
 assert.match(admin,/className="guestAttendanceEditor">Status de presença/);
 assert.match(admin,/<option value="pending">A confirmar<\/option><option value="yes">Confirmado<\/option><option value="no">Não irá<\/option>/);
 assert.match(admin,/expectedAttendance:g\.attendance\|\|'pending'/);
 assert.match(css,/\.guestTypeEditor>\.guestAttendanceEditor/);
});

test('O botão Salvar alterações é o único salvamento de presença e exige senha quando houver mudanças',()=>{
 assert.match(admin,/const changed=valid\.filter\(g=>\(g\.attendance\|\|'pending'\)!==\(g\.expectedAttendance\|\|'pending'\)\)/);
 assert.match(admin,/const summary=changed\.map/);
 assert.match(admin,/confirmationCode=window\.prompt\('Informe a senha administrativa/);
 assert.match(admin,/action:'adminUpdateFamily'/);
 assert.match(admin,/attendance:g\.attendance\|\|'pending'/);
 assert.match(admin,/expectedAttendance:g\.expectedAttendance/);
 assert.match(admin,/if\(historyOpen\)loadAttendanceHistory\(\)/);
});

test('A API exige dupla autorização quando há alteração de status',()=>{
 assert.match(familyAction,/await isAdmin\(body\.adminCode\)/);
 assert.match(familyAction,/const changedStatus=desired\.some/);
 assert.match(familyAction,/changedStatus&&!\(await isAdmin\(body\.confirmationCode\)\)/);
 assert.match(familyAction,/attendance_changed_elsewhere/);
 assert.match(familyAction,/update_guest_attendance_with_source/);
 assert.match(familyAction,/p_source:"administrador"/);
 assert.match(familyAction,/invite_status:status/);
});

test('O servidor suporta reversões nas três direções e controla capacidade e crianças',()=>{
 assert.match(familyAction,/groups:any=\{pending:\[\],no:\[\],yes:\[\]\}/);
 assert.match(familyAction,/for\(const kind of \["pending","no","yes"\]\)/);
 assert.match(familyAction,/child_age_required/);
 assert.match(familyAction,/g\.child_age_group==="under_5"/);
 assert.match(familyAction,/projectedGlobal>capacity/);
 assert.match(familyAction,/event_capacity_reached/);
 assert.doesNotMatch(familyAction,/isLateLegacy|RSVP_CUTOFF/);
});

test('A Preview bloqueia salvar mudanças em presenças reais antes de publicar o backend',()=>{
 assert.match(admin,/changed\.length&&window\.location\.hostname!=='cha-oliver-mvp\.vercel\.app'/);
 assert.match(admin,/as confirmações e reversões ficarão disponíveis após publicação do backend/);
 assert.match(admin,/data-admin-tab|Editar núcleo familiar/);
});
