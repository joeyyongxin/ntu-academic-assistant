import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const validator=await readFile(new URL('../workspace/local-store.js',import.meta.url),'utf8');
const source=await readFile(new URL('../workspace/production-bridge.js',import.meta.url),'utf8');
function setup(){const prefs={available:false,revision:0,payload:null},writes=[],records={tasks:[{id:'old-uuid',user_id:'alice',module:'SC1004',title:'Existing task',date:'2026-11-02',minutes:null,done:false,updated_at:'version-1'}],assessments:[]},errors=[];
const c=vm.createContext({Intl,Date,Map,crypto,ReferenceCloud:{},WorkspacePreferences:class{async load(){return structuredClone(prefs);}async save(owner,revision,payload){if(revision!==prefs.revision)throw Error('settings conflict');prefs.payload=structuredClone(payload);return ++prefs.revision;}},PlannerDataService:class{async load(){return structuredClone(records);}async apply(owner,op){writes.push(op);if(c.fail)throw Error('conflict');return {id:op.id,user_id:owner,...op.patch,updated_at:'version-2'};}},structuredClone});vm.runInContext(validator,c);vm.runInContext(source,c);
const hooks={loading(){},loaded(s){c.snapshot=s;},status(){},error(e){errors.push(e);},closed(){}};
return {c,prefs,writes,records,errors,bridge:new c.ProductionWorkspace.ProductionBridge({},hooks)};}
test('existing rows are projected into calendar semesters without changing source records',async()=>{const f=setup();await f.bridge.open({id:'alice'});assert.equal(f.records.tasks[0].id,'old-uuid');const t=f.c.snapshot.terms.find(t=>t.tasks.length);assert.equal(t.yearId,'y2026');assert.equal(t.tasks[0].title,'Existing task');assert.equal(f.bridge.map.get('tasks:'+t.tasks[0].id).id,'old-uuid');});
test('title edit uses original UUID and revision without replacing missing duration',async()=>{const f=setup();await f.bridge.open({id:'alice'});const s=structuredClone(f.c.snapshot);s.terms.find(t=>t.tasks.length).tasks[0].title='New title';f.bridge.changed(s);await f.bridge.queue;assert.equal(f.writes.length,1);assert.equal(f.writes[0].id,'old-uuid');assert.equal(f.writes[0].expected,'version-1');assert.deepEqual(JSON.parse(JSON.stringify(f.writes[0].patch)),{title:'New title'});});
test('removal soft deletes the original record and failed writes are not retried',async()=>{const f=setup();await f.bridge.open({id:'alice'});const s=structuredClone(f.c.snapshot);s.terms.find(t=>t.tasks.length).tasks=[];f.c.fail=true;f.bridge.changed(s);await f.bridge.queue;assert.ok(f.writes[0].patch.deleted_at);assert.equal(f.bridge.blocked,true);f.bridge.changed(s);await f.bridge.queue;assert.equal(f.writes.length,1);});

test('classes, topic progress and module settings survive a production metadata round trip',async()=>{
 const f=setup();f.prefs.available=true;await f.bridge.open({id:'alice'});const s=structuredClone(f.c.snapshot),term=s.terms.find(t=>t.tasks.length);
 term.mods.push('SC2000');term.topics.SC1004=[['Vectors',2,0]];term.timetable.push({id:'class-1',mod:'SC1004',d:'Mon',kind:'Lecture',range:'09:00–10:00',at:9,venue:'LT1'});
 f.bridge.changed(s);await f.bridge.queue;assert.equal(f.errors.length,0);assert.equal(f.prefs.revision,1);assert.equal(f.writes.length,0);
 const restored=f.c.ProductionWorkspace.project(f.records,f.prefs.payload).snapshot.terms.find(t=>t.id===term.id);assert.equal(restored.timetable[0].venue,'LT1');assert.equal(restored.topics.SC1004[0][1],2);assert.ok(restored.mods.includes('SC2000'));
});
test('explicit semester assignment survives overlapping calendar ranges',async()=>{
 const f=setup();f.prefs.available=true;await f.bridge.open({id:'alice'});const s=structuredClone(f.c.snapshot),source=s.terms.find(t=>t.tasks.length),other=structuredClone(source);other.id='s99999';other.name='Special semester';source.tasks=[];s.terms.push(other);
 f.bridge.changed(s);await f.bridge.queue;assert.equal(f.errors.length,0);const restored=f.c.ProductionWorkspace.project(f.records,f.prefs.payload).snapshot;assert.equal(restored.terms.find(t=>t.id==='s99999').tasks.length,1);assert.equal(restored.terms.find(t=>t.id===source.id).tasks.length,0);
});
test('first file upload can register inferred semester settings before Storage checks them',async()=>{
 const f=setup();f.prefs.available=true;await f.bridge.open({id:'alice'});
 assert.equal(f.prefs.payload,null);await f.bridge.ensurePreferences();
 assert.equal(f.prefs.revision,1);assert.equal(f.prefs.payload.terms.some(t=>t.mods.includes('SC1004')),true);
 await f.bridge.ensurePreferences();assert.equal(f.prefs.revision,1);
});
