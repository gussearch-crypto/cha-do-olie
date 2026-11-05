import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICIAL_EVENT_ORIGIN,qrTarget,isEventOfficialOrigin,qrIsPrintable} from '../games-qr-target.mjs';

test('QR de impressão mantém sempre os endereços estáveis do evento',()=>{
 assert.equal(qrTarget('presencial'),OFFICIAL_EVENT_ORIGIN+'/games');
 assert.equal(qrTarget('online'),OFFICIAL_EVENT_ORIGIN+'/games/online');
});
test('endereço temporário de Preview não pode ser impresso como definitivo',()=>{
 const temporary='https://cha-oliver-example-gh-57f5.vercel.app';
 assert.equal(qrTarget('online',temporary),temporary+'/games/online');
 assert.equal(qrIsPrintable(temporary),false);
 assert.equal(qrIsPrintable(OFFICIAL_EVENT_ORIGIN),true);
 assert.equal(isEventOfficialOrigin('https://cha-oliver-mvp.vercel.app'),true);
 assert.equal(isEventOfficialOrigin(temporary),false);
});
test('o gerador não aceita destino com canal ou origem inválida',()=>{
 for(const channel of ['../admin','/games/online','test',null,''])assert.throws(()=>qrTarget(channel),/Canal inválido/);
 for(const origin of ['http://example.com','https://example.com/search','https://name:pass@example.com/'])assert.throws(()=>qrTarget('presencial',origin),/Origem inválida/);
});
