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
 assert.match(list,/<Pencil\/> Editar<\/button>/);
 assert.doesNotMatch(list,/restoreAttendance|markAbsent|guestPendingActions|Reabrir ausências do núcleo|Ausência do núcleo/);
});

test('Editar núcleo oferece A confirmar, Confirmado e Não irá para todos os integrantes',()=>{
 assert.match(admin,/const guestEditor=\(guests,setter,withAttendance=false\)/);
 assert.match(admin,/\{guestEditor\(editing\.guests,g=>setEditing\(\{\.\.\.editing,guests:g\}\),true\)\}/);
 assert.match(admin,/className="guestAttendanceSelect"/);
 assert.match(admin,/aria-label=\{`Status de presença de \$\{g\.name\|\|'novo convidado'\}`\}/);
 assert.doesNotMatch(admin,/className="guestAttendanceEditor"/);
 assert.match(admin,/<option value="pending">A confirmar<\/option><option value="yes">Confirmado<\/option><option value="no">Não irá<\/option>/);
 assert.match(admin,/expectedAttendance:g\.attendance\|\|'pending'/);
 assert.match(css,/\.guestTypeEditor\.guestEditWithAttendance>\.guestAttendanceSelect/);
});

test('O botão Salvar alterações é o único salvamento de presença e exige senha quando houver mudanças',()=>{
 assert.match(admin,/const changed=valid\.filter\(g=>\(g\.attendance\|\|'pending'\)!==\(g\.expectedAttendance\|\|'pending'\)\)/);
 assert.match(admin,/const summary=changed\.map/);
 assert.match(admin,/confirmationCode=window\.prompt\('Salvar '\+changed\.length/);
 const saveEdit=admin.slice(admin.indexOf('const saveEdit=async()=>{'),admin.indexOf('const message=f=>'));
 assert.equal((saveEdit.match(/confirmationCode=window\.prompt/g)||[]).length,1,'senha solicitada uma única vez no salvamento');
 assert.doesNotMatch(saveEdit,/window\.confirm/,'sem confirmação modal extra antes da senha');
 assert.match(admin,/uma única senha será solicitada apenas ao salvar/);
 assert.match(admin,/mudança\(s\) de presença aguardando salvamento/);
 assert.match(css,/\.guestAttendanceSaveHint/);
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
 assert.match(admin,/As confirmações e reversões ficarão disponíveis após publicação do backend/);
 assert.match(admin,/data-admin-tab|Editar núcleo familiar/);
});

test('edição compacta: status ocupa a mesma linha de nome, criança e remover no desktop',()=>{
 const editor=admin.slice(admin.indexOf('const guestEditor='),admin.indexOf('return <div className="adminPage">',admin.indexOf('const guestEditor=')));
 assert.match(editor,/guestEditWithAttendance/);
 assert.match(editor,/guestEditChild/);
 assert.match(editor,/guestEditAdult/);
 assert.match(editor,/<select className="guestAttendanceSelect"/);
 assert.match(editor,/g\.isChild&&<select className="guestAgeSelect"/);
 assert.match(editor,/!g\.isChild&&!withAttendance/,'adulto em edição não reserva campo etário invisível');
 assert.doesNotMatch(editor,/guestAttendanceEditor|Status de presença\s*<select/,'não repetir título por pessoa');
 const block=css.slice(css.indexOf('/* Edição compacta do núcleo:'),css.indexOf('/* A senha é pedida somente no salvamento'));
 assert.match(block,/\.guestEditWithAttendance\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) 112px minmax\(160px,190px\) 96px/);
 assert.match(block,/\.guestEditWithAttendance\.guestEditChild\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) 108px minmax\(135px,165px\) minmax\(155px,175px\) 94px/);
 assert.match(block,/grid-column:3;grid-row:1/);
 assert.match(block,/\.guestEditChild>\.guestAttendanceSelect\{[\s\S]*?grid-column:4/);
 assert.match(block,/height:44px;min-height:44px;max-height:44px/);
});

test('layout responsivo reorganiza os campos sem largura fixa no mobile',()=>{
 const block=css.slice(css.indexOf('/* Edição compacta do núcleo:'),css.indexOf('/* A senha é pedida somente no salvamento'));
 assert.match(block,/@media\(max-width:930px\)/);
 assert.match(block,/@media\(max-width:740px\)/);
 assert.match(block,/@media\(max-width:500px\)/);
 assert.match(block,/\.guestEditChild>\.guestAttendanceSelect\{[\s\S]*?grid-column:1\/4;grid-row:3/);
 assert.match(block,/\.guestEditWithAttendance>select\{[\s\S]*?min-width:0/);
 assert.doesNotMatch(block,/flex:0 1 230px/);
});
