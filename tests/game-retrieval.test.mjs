import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const edge=readFileSync(new URL('../supabase/functions/oliver-games/index.ts',import.meta.url),'utf8');
const online=readFileSync(new URL('../games-online.jsx',import.meta.url),'utf8');
const admin=readFileSync(new URL('../admin-games.jsx',import.meta.url),'utf8');
const style=readFileSync(new URL('../games.css',import.meta.url),'utf8');

test('os palpites online são gravados e consultados no Supabase, sem escrita em storage local',()=>{
 assert.match(online,/await call\(\{action:'remoteBirthSubmit'/);
 assert.match(edge,/from\("oliver_game_guesses"\)\.insert/);
 assert.match(edge,/action==="lookupBirthByContact"/);
 assert.doesNotMatch(online,/localStorage\.setItem|sessionStorage\.setItem/);
});

test('consulta exige WhatsApp e nome ou protocolo, com DDI brasileiro opcional',()=>{
 assert.match(edge,/digits\.length===13&&digits\.startsWith\("55"\)\?digits\.slice\(2\):digits/);
 assert.match(edge,/const name=norm\(String\(b\.name\|\|""\)\.trim\(\)\),phone=normalizePhone\(b\.whatsapp\),guessId=/);
 assert.match(edge,/if\(!validPhone\(phone\)\|\|\(guessId\?/);
 assert.match(edge,/\.eq\("contact_whatsapp",phone\)/);
 assert.match(edge,/if\(guessId\)q=q\.eq\("id",guessId\)/);
 assert.match(online,/Tenho o protocolo do meu palpite/);
 assert.match(online,/guessId:lookupProtocol\.trim\(\)/);
});

test('listagem de contingência é autenticada e somente leitura',()=>{
 const start=edge.indexOf('if(action==="adminListGuesses")');
 const end=edge.indexOf('if(action==="adminGiftSet")',start);
 assert.ok(start>=0&&end>start);
 const block=edge.slice(start,end);
 assert.match(block,/await admin\(b\.adminCode\)/);
 assert.match(block,/\.select\("id,participant_name,participation_source/);
 assert.doesNotMatch(block,/\.insert\(|\.delete\(|\.update\(/);
 assert.match(admin,/action:'adminListGuesses'/);
});

test('palpites online ficam visíveis na aba Palpites e podem ser atualizados',()=>{
 assert.match(admin,/Palpites online registrados/);
 assert.match(admin,/id="olie-remote-received"/);
 assert.match(admin,/onClick=\{load\} disabled=\{guessesLoading\}/);
 assert.match(style,/\.olieOnlineEntriesList\{/);
 assert.match(admin,/WhatsApp final/);
 assert.match(admin,/String\(g\.contact_whatsapp\)\.slice\(-4\)/);
 assert.match(edge,/guest_id,contact_whatsapp/);
});
