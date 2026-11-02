import test from 'node:test';
import assert from 'node:assert/strict';
import '../workspace/updates.js';
function fixture(){const rows={tasks:[{id:'a',updated_at:'one',deleted_at:null}],assessments:[]};const events=[];
 const b={owner:'alice',epoch:1,pending:0,loading:false,blocked:false,remoteRows:structuredClone(rows),preferencesAvailable:true,preferencesRevision:1,service:{async revisions(){if(b.race)b.race();return rows;},async verify(){}},preferences:{async revision(){return {available:true,revision:b.remoteRevision||1};}}};
 return {b,rows,events,watch:new AcademicUpdates.Watcher(b,x=>events.push(x))};}
test('notifies for changed, deleted and newly inserted tasks without replacing the view',async()=>{for(const change of [f=>f.rows.tasks[0].updated_at='two',f=>f.rows.tasks[0].deleted_at='now',f=>f.rows.tasks.push({id:'b',updated_at:'two'})]){const f=fixture();change(f);await f.watch.check();assert.equal(f.events[0].changed,true);assert.equal(f.b.remoteRows.tasks[0].updated_at,'one');}});
test('self-saved versions do not produce a remote-change notice',async()=>{const f=fixture();f.b.remoteRows=structuredClone(f.rows);await f.watch.check();assert.equal(f.events[0].changed,false);});
test('metadata revision changes notify; local saves and account switches discard polling results',async()=>{const f=fixture();f.b.remoteRevision=2;await f.watch.check();assert.equal(f.events[0].changed,true);for(const race of [b=>b.owner='bob',b=>b.epoch++,b=>b.pending++]){const x=fixture();x.b.race=()=>race(x.b);await x.watch.check();assert.equal(x.events.length,0);}});
test('network errors preserve the current work and report failed checking',async()=>{const f=fixture();f.b.service.revisions=async()=>{throw Error('offline');};await f.watch.check();assert.ok(f.events[0].error);assert.equal(f.b.blocked,false);assert.equal(f.b.remoteRows.tasks[0].id,'a');});
