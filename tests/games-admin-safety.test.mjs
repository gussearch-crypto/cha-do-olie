import test from 'node:test';
import assert from 'node:assert/strict';
import {canExecuteGamesAdminAction,gamesAdminPhase} from '../games-admin-safety.mjs';
test('Preview de jogos pode ler dados, mas não alterar os dados reais',()=>{
 for(const action of ['adminGet','adminBirthGet','adminBirthRanking','adminAuditList']){
   assert.equal(canExecuteGamesAdminAction('cha-oliver-preview.vercel.app',action),true,action);
 }
 for(const action of ['adminBirthSave','adminBirthUpload','adminBirthPublish','adminBirthToggle','adminReveal','adminSet','adminResetGuesses','adminResultPublication','adminBirthTime','adminPrizeContact']){
   assert.equal(canExecuteGamesAdminAction('cha-oliver-preview.vercel.app',action),false,action);
   assert.equal(canExecuteGamesAdminAction('cha-oliver-mvp.vercel.app',action),true,action);
 }
 assert.equal(canExecuteGamesAdminAction('localhost','adminBirthPublish'),false);
});
test('etapas separadas: encerrar, registrar oficialmente e divulgar ranking',()=>{
 const open=gamesAdminPhase({birth_open:true});
 assert.deepEqual(open.steps.map(x=>x.done),[false,false,false]);
 const closed=gamesAdminPhase({birth_open:false,birth_closed_at:'2027-01-01T13:00:00Z'});
 assert.deepEqual(closed.steps.map(x=>x.done),[true,false,false]);
 const ready=gamesAdminPhase({birth_open:false,actual_birth_date:'2027-01-15',actual_weight_g:3200,actual_length_cm:50});
 assert.deepEqual(ready.steps.map(x=>x.done),[true,true,false]);
 const published=gamesAdminPhase({...ready,results_published:true});
 assert.deepEqual(published.steps.map(x=>x.done),[true,true,true]);
});
