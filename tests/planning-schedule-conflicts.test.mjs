import test from 'node:test';import assert from 'node:assert/strict';import {scheduleConflicts} from '../planning-schedule-conflicts.mjs';
const task=(id,start,end,extra={})=>({id,title:id,responsible:'Gustavo',eventDate:'2026-12-04',eventTime:start,eventEnd:end,...extra});
test('same responsible overlaps are detected once, with normalized names and no adjacent interval conflict',()=>{
 const rows=[task('a','16:00','17:00'),task('b','16:30','17:30',{responsible:' GÚSTAVO '}),task('c','17:30','18:00'),task('d','16:30','17:00',{responsible:'Vanessa'}),task('e','16:30','17:00',{eventDate:'2026-12-03'}),task('f','16:00','17:00',{responsible:''})];
 assert.deepEqual(scheduleConflicts(rows,'2026-12-04').map(c=>[c.first.id,c.second.id]),[['a','b']]);
});
test('missing ends are points: same starts or inside known duration conflict, with no invented duration',()=>{
 assert.equal(scheduleConflicts([task('a','16:00',''),task('b','16:30','')],'2026-12-04').length,0);assert.equal(scheduleConflicts([task('a','16:00',''),task('b','16:00','')],'2026-12-04').length,1);assert.equal(scheduleConflicts([task('a','16:00','17:00'),task('b','16:30','')],'2026-12-04').length,1);assert.equal(scheduleConflicts([task('a','16:00','17:00'),task('b','17:00','')],'2026-12-04').length,0);assert.equal(scheduleConflicts([task('a','bad','17:00'),task('b','16:30','')],'2026-12-04').length,0);
});
