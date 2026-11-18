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

test('consulta exige apenas WhatsApp com DDD e aceita prefixo +55',()=>{
 assert.match(edge,/digits\.length===12\|\|digits\.length===13/);
 assert.match(edge,/const phone=normalizePhone\(b\.whatsapp\)/);
 assert.match(edge,/if\(!validPhone\(phone\)/);
 assert.match(edge,/\.eq\("contact_whatsapp",phone\)/);
 assert.match(edge,/if\(guessId\)query=query\.eq\("id",guessId\)/);
 assert.match(online,/Informe apenas o telefone com DDD utilizado no cadastro/);
 assert.match(online,/action:'lookupBirthByContact',whatsapp:normalizeBirthPhone\(lookupPhone\)/);
 assert.doesNotMatch(online,/lookupName|lookupProtocol/);
});

test('consulta retorna todos os palpites de um mesmo WhatsApp, sem aceitar telefone incompleto',()=>{
 assert.match(edge,/if\(!matches\?\.length\)return reply\(\{error:"guess_not_found"\},404\)/);
 assert.match(edge,/const guesses=matches/);
 assert.match(edge,/return reply\(\{ok:true,guess,guesses,published,result:results\[guess\.id\]\|\|null,results\}\)/);
 assert.match(online,/\.map\(g=>\{const result=lookupResult\.results/);
 assert.match(online,/g\.participant_name/);
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

test('API aceita nome simples e telefone de 10 ou 11 dígitos no cadastro e consulta',()=>{
 assert.match(edge,/const validParticipantName=\(v:any\)=>/);
 assert.match(edge,/value.length>=2&&value.length<=100/);
 assert.match(edge,/const validPhone=\(v:any\)=>/);
 assert.match(edge,/digits.length===10\|\|digits.length===11/);
 assert.match(edge,/if\(!validParticipantName\(name\)\)return reply/);
 assert.match(online,/Nome do participante/);
 assert.match(online,/sobrenome opcional/);
 assert.match(online,/maxLength=\{22\}/);
});
