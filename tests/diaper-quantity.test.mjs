import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../src.jsx',import.meta.url),'utf8');
const enhancer=readFileSync(new URL('../gift-brands.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../supabase/functions/invite-api/index.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');

test('um convidado sozinho pode selecionar de 1 a 20 pacotes independentemente do núcleo',()=>{
 assert.match(ui,/Array\.from\(\{length:20\}/);
 assert.match(ui,/value=\{diaperQuantity\}/);
 assert.match(ui,/onChange=\{e=>setDiaperQuantity\(Number\(e\.target\.value\)\)\}/);
 assert.match(ui,/Uma pessoa pode escolher mais de um pacote/);
 assert.doesNotMatch(enhancer,/getAttendingAdults|setReactGiftMode|oliverDiaperQty|sessionStorage/);
 assert.match(css,/\.giftChoice \.diaperQuantityChoice\{/);
});

test('quantidade selecionada é enviada ao servidor e restaurada da atribuição persistida',()=>{
 assert.match(ui,/diaperQuantity:giftMode==='unknown'\?undefined:diaperQuantity/);
 assert.match(ui,/setDiaperQuantity\(Math\.max\(1,d\.diapers\?\.length\|\|1\)\)/);
 assert.match(ui,/const gifts=giftMode==='unknown'\?0:diapers\.length/);
 assert.match(api,/hasDiaperQuantity=body\.diaperQuantity!==undefined/);
 assert.match(api,/requestedDiaperQuantity<1\|\|requestedDiaperQuantity>20/);
 assert.match(api,/giftMode==="family"\?\(hasDiaperQuantity\?requestedDiaperQuantity:1\)/);
});

test('backend preserva tamanhos atribuídos ao aumentar a quantidade e mantém compatibilidade legada',()=>{
 assert.match(api,/const assigned:any\[\]=\(existing\|\|\[\]\)\.slice\(0,slots\)/);
 assert.match(api,/if\(assigned\.length<slots\)/);
 assert.match(api,/assigned\.push\(entry\)/);
 assert.match(api,/giftMode==="adult"\?adults/);
 assert.match(api,/Math\.max\(1,\(assigned\|\|\[\]\)\.length\)/);
});

test('prévia não grava respostas reais enquanto API de produção aguarda ativação',()=>{
 assert.match(ui,/const isInvitePreview=/);
 assert.match(ui,/if\(isInvitePreview\)\{setError\('Prévia de leitura/);
 assert.match(ui,/className="giftPreviewNotice"/);
});
