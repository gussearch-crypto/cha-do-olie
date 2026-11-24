import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../supabase/functions/oliver-games/index.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/202611240001_rank_winners_settings.sql',import.meta.url),'utf8');

// Testa a implementação REAL da Edge Function, transformando somente anotações TS.
const helpersStart=source.indexOf('const ruleLabels:Record<string,string>=');
const helpersEnd=source.indexOf('const validPixPayload=',helpersStart);
const rankStart=source.indexOf('function birthRank(rows:any[],official:any){');
const rankEnd=source.indexOf('\nDeno.serve(',rankStart);
assert.ok(helpersStart>=0&&helpersEnd>helpersStart&&rankStart>=0&&rankEnd>rankStart);
const helpers=source.slice(helpersStart,helpersEnd)
 .replace('const ruleLabels:Record<string,string>=','const ruleLabels=')
 .replaceAll('(settings:any)','(settings)')
 .replace('(rows:any[],settings:any)','(rows,settings)');
const rank=source.slice(rankStart,rankEnd)
 .replace('function birthRank(rows:any[],official:any)','function birthRank(rows,official)')
 .replace('const point=(max:number,diff:number,ref:number)','const point=(max,diff,ref)');
const {countWinners,awardRule,sortForAwards,birthRank}=runInNewContext(helpers+'\n'+rank+'\n({countWinners,awardRule,sortForAwards,birthRank})');

const official={date:'2027-01-28',time:'10:00',weight:3000,length:50};
const guess=(id,{date='2027-01-28',time='10:00',weight=3000,length=50,registeredAt='2026-11-20T10:00:00Z'}={})=>({
 id,participant_name:'Participante '+id,participation_source:'online',
 birth_date:date,birth_time:time,weight_g:weight,length_cm:length,created_at:registeredAt
});
const sample=[
 guess('quase-perfeito',{weight:3050,registeredAt:'2026-11-21T00:00:00Z'}),
 guess('peso-exato',{date:'2027-01-30',weight:3000,length:49}),
 guess('mais-longe',{date:'2027-02-03',weight:3400,length:54})
];

test('premiação inicial é uma pessoa, por maior pontuação no ranking real da API',()=>{
 const sorted=sortForAwards(birthRank(sample,official),{});
 assert.equal(countWinners({}),1);
 assert.equal(awardRule({}),'overall_score');
 assert.equal(sorted[0].id,'quase-perfeito');
 assert.equal(sorted.slice(0,countWinners({})).length,1);
 assert.ok(sorted[0].total>sorted[1].total);
});

test('alterar o critério organiza os participantes pela proximidade e mantém o mesmo total de pontos',()=>{
 const scored=birthRank(sample,official);
 const byWeight=sortForAwards(scored,{winner_rule:'closest_weight'});
 assert.equal(byWeight[0].id,'peso-exato');
 assert.equal(byWeight[0].differenceGrams,0);
 const byDateTime=sortForAwards(scored,{winner_rule:'closest_datetime'});
 assert.equal(byDateTime[0].id,'quase-perfeito');
 const byLength=sortForAwards(scored,{winner_rule:'closest_length'});
 assert.equal(byLength[0].id,'quase-perfeito');
 assert.equal(countWinners({winner_count:3}),3);
 assert.equal(byWeight.slice(0,countWinners({winner_count:2})).length,2);
});

test('empates absolutos são resolvidos pelo registro mais antigo, independentemente do nome',()=>{
 const tied=[
  guess('mais-recente',{registeredAt:'2026-11-24T10:00:00Z'}),
  guess('mais-antigo',{registeredAt:'2026-11-22T10:00:00Z'})
 ];
 const ranking=sortForAwards(birthRank(tied,official),{winner_rule:'overall_score'});
 assert.equal(ranking[0].id,'mais-antigo');
 assert.equal(ranking.slice(0,countWinners({})).length,1);
});

test('consulta individual, premiação, demonstração e ranking público usam a mesma ordenação',()=>{
 assert.match(source,/const ranking=sortForAwards\(birthRank\(all\|\|\[\],official\),config\)/);
 assert.match(source,/const ranked=sortForAwards\(birthRank\(guesses\|\|\[\],official\),config\)/);
 assert.match(source,/const ranking=sortForAwards\(birthRank\(guesses\|\|\[\],official\),config\)/);
 assert.match(source,/ranked\.slice\(0,countWinners\(config\)\)/);
 assert.match(source,/isWinner:index<countWinners\(config\)/);
 assert.match(source,/\.slice\(0,countWinners\(config\)\)\.some/);
 assert.match(source,/if\(!isAdmin&&!config\.results_published\)return reply\(\{ready:false,ranking:\[\]\}\)/);
});

test('migração focalizada não modifica participantes nem divulga resultados',()=>{
 assert.match(migration,/add column if not exists winner_count integer not null default 1/);
 assert.match(migration,/add column if not exists winner_rule text not null default 'overall_score'/);
 assert.match(migration,/winner_count between 1 and 3/);
 assert.doesNotMatch(migration,/\b(delete|truncate|update|drop table)\b/i);
});
