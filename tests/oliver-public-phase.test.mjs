import test from 'node:test';
import assert from 'node:assert/strict';
import {daysToOliverDpp,oliverPublicPhase,oliverDppMessage} from '../oliver-public-phase.mjs';

test('DPP é apenas referência, com diferença correta antes e depois',()=>{
 assert.equal(daysToOliverDpp('2027-01-27'),1);
 assert.equal(daysToOliverDpp('2027-01-28'),0);
 assert.equal(daysToOliverDpp('2027-01-29'),-1);
 assert.equal(daysToOliverDpp('2027-02-30'),null);
 assert.match(oliverDppMessage(-2),/passou/);
});
test('final do chá não publica nascimento nem resultados',()=>{
 const r=oliverPublicPhase({today:'2026-12-05',settings:{birth_open:true},announcement:{published:false}});
 assert.equal(r.phase,'waiting');
 assert.equal(r.born,false);
 assert.equal(r.results,false);
 assert.equal(r.canGuess,true);
});
test('encerramento manual conserva página de espera, sem reabrir palpites',()=>{
 const r=oliverPublicPhase({today:'2027-01-01',settings:{birth_open:false,birth_closed_at:'2027-01-01T10:00:00Z'},announcement:{published:false}});
 assert.equal(r.phase,'waiting');
 assert.equal(r.canGuess,false);
 assert.equal(r.locked,true);
});
test('dados oficiais privados e data provável não antecipam anúncio',()=>{
 const r=oliverPublicPhase({today:'2027-02-10',settings:{birth_open:false,actual_birth_date:'2027-02-10'},announcement:{published:false}});
 assert.equal(r.born,false);assert.equal(r.phase,'waiting');
});
test('ranking e anúncio do nascimento exigem publicações independentes',()=>{
 const a=oliverPublicPhase({today:'2027-02-01',settings:{results_published:true},announcement:{published:false}});
 assert.equal(a.phase,'ranking');assert.equal(a.born,false);assert.equal(a.results,true);
 const b=oliverPublicPhase({today:'2027-02-01',settings:{results_published:false},announcement:{published:true}});
 assert.equal(b.phase,'born');assert.equal(b.born,true);assert.equal(b.results,false);
});
