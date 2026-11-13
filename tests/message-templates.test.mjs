import test from 'node:test';
import assert from 'node:assert/strict';
import {MESSAGE_DEFAULTS,validateMessageTemplates,messageTemplateType,familyMessage,renderMessageTemplate} from '../oliver-message-templates.mjs';
const family={display_name:'Núcleo Teste',invite_pin_plain:'0000'};

test('lembrete de confirmação e lembrete do evento são modelos distintos',()=>{
 const before=familyMessage(family,'reminder',MESSAGE_DEFAULTS,'2026-11-13');
 const after=familyMessage(family,'eventReminder',MESSAGE_DEFAULTS,'2026-11-13');
 assert.match(before,/aguardamos a confirmação/);
 assert.doesNotMatch(after,/aguardamos a confirmação/);
 assert.match(after,/contagem regressiva/);
});

test('edições oficiais alteram o texto da mensagem correta',()=>{
 const templates=validateMessageTemplates({
  ...MESSAGE_DEFAULTS,
  reminder:'Confirmação para {nome_familia} 💚',
  eventReminder:'Evento confirmado para {nome_familia} ✅'
 });
 assert.equal(familyMessage(family,'reminder',templates,'2026-11-13'),'Confirmação para Núcleo Teste 💚');
 assert.equal(familyMessage(family,'eventReminder',templates,'2026-11-13'),'Evento confirmado para Núcleo Teste ✅');
});

test('convite após 30 de novembro seleciona o modelo de nova inclusão',()=>{
 assert.equal(messageTemplateType(family,'invitation','2026-11-30'),'invitation');
 assert.equal(messageTemplateType(family,'invitation','2026-12-01'),'lateInvitation');
 assert.equal(messageTemplateType({...family,invite_sent_at:'2026-12-01T12:00:00-03:00'},'invitation','2026-11-29'),'lateInvitation');
 assert.equal(messageTemplateType(family,'eventReminder','2026-12-01'),'eventReminder');
});

test('variáveis não autorizadas são rejeitadas e variáveis válidas são preenchidas',()=>{
 assert.throws(()=>validateMessageTemplates({...MESSAGE_DEFAULTS,reminder:'Olá, {senha_admin}'}),/Variáveis não reconhecidas/);
 assert.equal(renderMessageTemplate('Olá, {nome_familia}!',{nome_familia:'Equipe'}),'Olá, Equipe!');
});

test('data, endereço e código de acesso são inseridos sem modificar o modelo',()=>{
 const original=MESSAGE_DEFAULTS.invitation;
 const result=familyMessage(family,'invitation',MESSAGE_DEFAULTS,'2026-11-13');
 assert.match(result,/Núcleo Teste/);
 assert.match(result,/0000/);
 assert.match(result,/04\/12\/2026/);
 assert.equal(MESSAGE_DEFAULTS.invitation,original);
});
