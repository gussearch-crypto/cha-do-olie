import test from 'node:test';
import assert from 'node:assert/strict';
import {AWARD_RULES,awardSettings,winnerText,validPixPayload} from '../game-awards.mjs';
import {readFileSync} from 'node:fs';

test('um vencedor por maior pontuação é o padrão',()=>{
 assert.deepEqual(awardSettings(),{count:1,rule:'overall_score'});
 assert.equal(winnerText(1),'1 vencedor');
 assert.equal(winnerText(3),'3 vencedores');
});
test('configuração admite até três e as quatro dinâmicas',()=>{
 for(const rule of AWARD_RULES)assert.deepEqual(awardSettings({winner_count:2,winner_rule:rule.value}),{count:2,rule:rule.value});
 assert.equal(awardSettings({winner_count:100,winner_rule:'invalid'}).count,1);
 assert.equal(awardSettings({winner_rule:'invalid'}).rule,'overall_score');
});
function testPix(domain='br.gov.bcb.pix'){
 const merchant='0014'+domain+'0116test@example.com';
 const raw='00020101021126'+String(merchant.length).padStart(2,'0')+merchant+'5204000053039865802BR5911EXEMPLO PIX6009SAO PAULO6304';
 let crc=0xffff;
 for(const ch of raw){crc^=ch.charCodeAt(0)<<8;for(let i=0;i<8;i++)crc=crc&0x8000?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}
 return raw+crc.toString(16).toUpperCase().padStart(4,'0');
}
test('valida CRC de código PIX emitido pelo banco sem rede externa',()=>{
 const sample=testPix();
 assert.equal(validPixPayload(sample),true);
 assert.equal(validPixPayload(testPix('BR.GOV.BCB.PIX')),true); // Nubank e outros bancos podem usar o identificador em maiúsculas.
 assert.equal(validPixPayload(sample.slice(0,-4)+'FFFF'),false);
 assert.equal(validPixPayload('000201chave@banco'),false);
 assert.equal(validPixPayload(''),false);
});
test('API vincula número de vencedores ao ranking público e à consulta',()=>{
 const src=readFileSync(new URL('../supabase/functions/oliver-games/index.ts',import.meta.url),'utf8');
 assert.match(src,/ranked\.slice\(0,countWinners\(config\)\)/);
 assert.match(src,/sortForAwards\(birthRank\(all\|\|\[\],official\),config\)/);
 assert.match(src,/action==="adminAwardSettings"/);
 assert.match(src,/action==="adminGiftSet"/);
});
test('formulário público informa opção PIX e acesso gratuito',()=>{
 const online=readFileSync(new URL('../games-online.jsx',import.meta.url),'utf8');
 assert.match(online,/<OnlineGiftCard message=\{giftConfig\.message\}/);
 const shared=readFileSync(new URL('../online-gift-card.jsx',import.meta.url),'utf8');
 assert.match(shared,/<PixGift enabled=\{pixEnabled\}/);
 assert.match(online,/nenhuma compra, PIX ou presente é necessário/);
});

test('simulação de presentes está disponível sem gravação em Preview',()=>{
 const admin=readFileSync(new URL('../admin-games.jsx',import.meta.url),'utf8');
 assert.match(admin,/onClick=\{isPreviewGamesHost\(window\.location\.hostname\)\?simulateOnlineGift:saveOnlineGift\}/);
 assert.match(admin,/Simular mensagem e PIX/);
 assert.match(admin,/Simulação local/);
 const safety=readFileSync(new URL('../games-admin-safety.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(safety,/READ_ONLY_GAME_ACTIONS[\s\S]*['"]adminGiftSet['"]/);
});

test('dados de conferência do recebedor são exibidos somente no componente PIX',()=>{
 const pix=readFileSync(new URL('../pix-gift.jsx',import.meta.url),'utf8');
 const shared=readFileSync(new URL('../online-gift-card.jsx',import.meta.url),'utf8');
 const admin=readFileSync(new URL('../admin-games.jsx',import.meta.url),'utf8');
 const online=readFileSync(new URL('../games-online.jsx',import.meta.url),'utf8');
 assert.match(pix,/Recebedor/);
 assert.match(pix,/Instituição/);
 assert.match(pix,/receiverName\|\|'Não informado'/);
 assert.match(pix,/antes de pagar/i);
 assert.match(shared,/receiverName=\{pixReceiverName\}/);
 assert.match(shared,/institution=\{pixInstitution\}/);
 assert.match(admin,/Nome do recebedor/);
 assert.match(admin,/Instituição financeira/);
 assert.match(admin,/pixReceiverName:pixReceiverName/);
 assert.match(online,/pixReceiverName=\{giftConfig\.pixReceiverName\}/);
 const edge=readFileSync(new URL('../supabase/functions/oliver-games/index.ts',import.meta.url),'utf8');
 assert.match(edge,/remote_pix_receiver_name:receiverName/);
 assert.match(edge,/remote_pix_institution:institution/);
 assert.match(edge,/pix_recipient_required/);
});
