import test from 'node:test';
import assert from 'node:assert/strict';
import {MESSAGE_STORE_KEY,MESSAGE_DEFAULTS,MESSAGE_TYPES,
 renderMessageTemplate,familyMessage,messageParameters,messageBackup,parseMessageBackup,
 readMessageTemplates,validateMessageTemplates,messageTemplateType} from '../oliver-message-templates.mjs';
import {DAY_CHECKS,safeDayChecks,safeProductionBaseline,
 compareProductionBase,dayKitData,dayKitCsv} from '../oliver-day-utils.mjs';
import {productionReference} from '../oliver-production-reference.mjs';
import {readFileSync} from 'node:fs';

const family={display_name:'Família Oliveira',invite_pin_plain:'3782',invite_sent_at:'2026-11-10T12:00:00Z'};
const families=[{id:'x',guests:[
 {name:'Adulto',attendance:'yes',person_type:'adult'},
 {name:'Criança pequena',attendance:'yes',person_type:'child',child_age_group:'under_5'},
 {name:'Criança de 7',attendance:'yes',person_type:'child',child_age_group:'five_or_more'},
 {name:'Pendente',attendance:'pending',person_type:'adult'}
]}];
const planning={tasks:[
 {id:'t1',title:'Montar mesas',eventDate:'2026-12-04',eventTime:'17:00',eventEnd:'17:30',status:'todo',responsible:'Organização'},
 {id:'t2',title:'Brincadeira da barriga',eventDate:'2026-12-04',eventTime:'20:00',eventEnd:'20:30',status:'done',responsible:'Organização'}],
 expenses:[],shopping:[{id:'a',title:'Batata palha',quantity:1,unit:'pacote',status:'pending',responsible:''}]
};
const source=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('mensagens renderizam nome, PIN, data, emojis e quebras de linha sem link de WhatsApp',()=>{
 const text=familyMessage(family,'invitation',MESSAGE_DEFAULTS,'2026-11-10');
 assert.match(text,/Família Oliveira! 💛/);
 assert.match(text,/3782/);
 assert.match(text,/📅 04\/12\/2026/);
 assert.match(text,/\n\n/);
 assert.match(text,/🗺️ Mapa:/);
 assert.doesNotMatch(text,/wa\.me|api\.whatsapp/);
 assert.match(familyMessage(family,'reminder',MESSAGE_DEFAULTS,'2026-11-10'),/Faltam 24 dia\(s\)/);
});
test('novos convites após 30/11 usam o modelo tardio e não declaram fechamento das vagas',()=>{
 assert.equal(messageTemplateType(family,'invitation','2026-12-01'),'lateInvitation');
 const text=familyMessage(family,'invitation',MESSAGE_DEFAULTS,'2026-12-01');
 assert.match(text,/últimas vagas/);
 assert.match(text,/confirmem a presença assim que possível/);
 assert.doesNotMatch(text,/prazo encerrado|evento fechado/i);
 assert.equal(messageTemplateType(family,'reminder','2026-12-01'),'reminder');
});
test('variáveis são restritas e modelo inválido não é salvo',()=>{
 assert.ok(MESSAGE_TYPES.length===4);
 assert.equal(renderMessageTemplate('Oi, {nome_familia}! ',{nome_familia:'Oliver'}),'Oi, Oliver! ');
 assert.throws(()=>validateMessageTemplates({...MESSAGE_DEFAULTS,invitation:'Olá {token_secreto}'}),/não reconhecidas/);
 assert.throws(()=>validateMessageTemplates({...MESSAGE_DEFAULTS,reminder:''}),/5.000/);
 const clean=validateMessageTemplates(MESSAGE_DEFAULTS);
 assert.deepEqual(Object.keys(clean).sort(),Object.keys(MESSAGE_DEFAULTS).sort());
});
test('backup preserva unicode e não copia modelos de outros aparelhos automaticamente',()=>{
 const original={...MESSAGE_DEFAULTS,reminder:'Olá, {nome_familia}! 🦁🐼🦒🐓\n\nConfirmem por favor.'};
 const encoded=messageBackup(original);
 assert.deepEqual(parseMessageBackup(encoded),original);
 assert.deepEqual(readMessageTemplates({getItem:()=>null}),MESSAGE_DEFAULTS);
 assert.equal(MESSAGE_STORE_KEY,'oliver-message-templates-v1');
});
test('convidados: 30/11 é referência de produção; crianças menores de 5 não ocupam vaga',()=>{
 const r=productionReference(families,planning,'2026-11-30');
 assert.equal(r.confirmedCounted,2);
 assert.equal(r.childrenUnderFive,1);
 assert.equal(r.available,98);
 assert.equal(r.isExactReferenceDay,true);
 const next=productionReference(families,planning,'2026-12-03');
 assert.equal(next.isExactReferenceDay,false);
 assert.equal(next.isRetrospective,true);
});
test('base guarda data real de captura e permite comparação de mudanças posteriores',()=>{
 const reference=productionReference(families,planning,'2026-11-30');
 const safe=safeProductionBaseline(reference);
 const later={...reference,captureDate:'2026-12-02',confirmedCounted:4,adults:3,available:96,contracted:250};
 const result=compareProductionBase(safe,later);
 assert.equal(result.officialDay,true);
 assert.equal(result.countedChange,2);
 assert.equal(result.contractChange,250);
 assert.equal(result.currentCount,4);
 assert.throws(()=>safeProductionBaseline({...reference,confirmedCounted:10}),/inconsistente/);
});
test('checklist local não altera tarefas e ignora identificadores inesperados',()=>{
 assert.equal(DAY_CHECKS.length,7);
 assert.deepEqual(safeDayChecks(['qr','qr','invalid','montagem']),['qr','montagem']);
 assert.deepEqual(planning.tasks.map(t=>t.status),['todo','done']);
});
test('kit agrega cronograma, responsáveis, compras e pagamentos, protegendo CSV',()=>{
 const kit=dayKitData({planning,families,today:'2026-11-10'});
 assert.equal(kit.schedule.scheduled,2);
 assert.equal(kit.shopping.length,1);
 assert.equal(kit.rsvp.counted,2);
 const csv=dayKitCsv(kit);
 assert.match(csv,/Montar mesas/);
 assert.match(csv,/Batata palha/);
 assert.match(csv,/Vagas restantes/);
 const changed={...kit,shopping:[{title:'=danger',quantity:1,unit:'u',responsible:'',status:'pending',notes:''}]};
 assert.match(dayKitCsv(changed),/"'=danger"/);
});
test('Sprint 6 publica apenas UI de Preview sem novas rotas que gravem em Supabase',()=>{
 const admin=source('admin-entry.jsx'),tab=source('admin-tabs.js');
 const center=source('oliver-day-operations.jsx');
 assert.match(tab,/operation:\['#oliver-day-operations'\]/);
 assert.match(tab,/'#oliver-message-center'/);
 assert.match(admin,/<OliverDayOperations families=\{families\}/);
 assert.match(admin,/<OliverMessageCenter families=\{families\}/);
 assert.match(center,/hostname===prodHost/);
 assert.match(center,/action:'get',adminCode/);
 assert.doesNotMatch(center,/action:'save',adminCode/);
 assert.doesNotMatch(admin,/wa\.me\/\?text/);
});


test('Central de Mensagens inicia recolhida e expande sem desmontar o editor',()=>{
 const ui=source('oliver-message-center.jsx');
 const css=source('oliver-message-center.css');
 const match=ui.match(/<details className="olieMessageDisclosure"([^>]*)>/);
 assert.ok(match,'Central deve usar details nativo');
 assert.doesNotMatch(match[1],/\bopen(?:=|\s|$)/,'Central deve começar fechada');
 assert.match(ui,/<summary className="olieMessageIntro olieMessageToggle">/);
 assert.match(ui,/Exibir \/ ocultar/);
 assert.match(ui,/<textarea rows=\{12\}/);
 assert.match(ui,/<\/details>/);
 assert.match(ui,/window\.localStorage\.setItem\(MESSAGE_STORE_KEY,messageBackup\(clean\)\)/);
 assert.match(css,/\.olieMessageDisclosure\[open\]/);
 assert.match(css,/:focus-visible/);
});
