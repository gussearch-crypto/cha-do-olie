import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('convites não abrem WhatsApp com mensagem codificada automaticamente',()=>{
 const publicEntry=read('src.jsx');
 assert.doesNotMatch(publicEntry,/wa\.me\/\?text=|api\.whatsapp\.com\/send|encodeURIComponent\(message\(f\)\)/);
 assert.match(publicEntry,/Copiar convite/);
 const admin=read('admin-entry.jsx');
 assert.match(admin,/navigator\.clipboard\.writeText\(text\)/);
 assert.match(admin,/action:'adminGetMessageTemplates'/);
 assert.match(admin,/Copiar convite/);
});
test('lembretes preservam texto livre e exigem envio manual para atualizar o histórico',()=>{
 const admin=read('admin-entry.jsx');
 assert.match(admin,/navigator\.clipboard\.writeText\(reminderText\)/);
 assert.match(admin,/Cole e envie manualmente/);
 assert.match(admin,/Marque como enviado somente depois/);
 assert.match(admin,/adminRecordReminder/);
 assert.doesNotMatch(admin,/Abrir o WhatsApp não registra/);
});
test('o texto do convite mantém emoji e quebras de linha na cópia sem URL intermediária',()=>{
 const admin=read('admin-entry.jsx');
 const templates=read('oliver-message-templates.mjs');
 assert.match(admin,/familyMessage\(f,kind,data\.templates\)/);
 assert.match(templates,/Olá, \{nome_familia\}! 💛/);
 assert.match(templates,/📅 \{data_evento\}/);
 assert.match(templates,/🕕 \{horario_evento\}/);
 assert.match(templates,/\.join\('\\n'\)/);
 assert.doesNotMatch(admin,/wa\.me\/\?text=/);
});
