import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const core=await readFile(new URL('../workspace/ntulearn-sync.js',import.meta.url),'utf8');
const hook=await readFile(new URL('../workspace/ntulearn-auto-hook.js',import.meta.url),'utf8');
const item={kind:'ann',id:'a',courseId:'c',courseName:'SC1004',title:'Update',text:'Read this',date:'2026-11-03',deadlineDate:'',url:'https://ntulearn.ntu.edu.sg/'};
function setup(){const semester={name:'S1',start:'2026-08-01',end:'2026-12-31',ntuAuto:{owner:'owner',enabled:true,mapping:{c:'SC1004'}}};let saves=0,resolve;
 const ctx=vm.createContext({TextEncoder,URL,settings:()=>'',term:()=>semester,ReferenceCloud:{user:{id:'owner'}},HUB:[],MODS:['SC1004'],esc:s=>s,ntuSyncNotice:'',recordWritable(){},recordDate:d=>d,nextHubId:a=>a.length+1,go(){saves++;},setInterval(){},setTimeout(){},document:{visibilityState:'visible',querySelector:()=>null,activeElement:null,getElementById:()=>null,addEventListener(){}},ntuContext:()=>({owner:ctx.ReferenceCloud.user.id,semester:ctx.active}),ntuSame:(a,b)=>a.owner===b.owner&&a.semester===b.semester,active:'s1'});ctx.window=ctx;ctx.addEventListener=()=>{};
 vm.runInContext(core,ctx);ctx.ntuRequest=async()=>({format:'academic-assistant-ntulearn-sync',schemaVersion:1,exportedAt:'2026-11-03T01:00:00Z',items:[item],warnings:[]});vm.runInContext(hook,ctx);
 return {ctx,semester,saves:()=>saves,delay(){ctx.ntuRequest=()=>new Promise(r=>resolve=r);return ()=>resolve({format:'academic-assistant-ntulearn-sync',schemaVersion:1,exportedAt:'2026-11-03T01:00:00Z',items:[item],warnings:[]});}};
}
test('automatic imports are idempotent and update untouched imports while protecting personal notes',async()=>{
 const f=setup();await f.ctx.runNTULearnAuto();assert.equal(f.ctx.HUB.length,1);assert.equal(f.saves(),1);await f.ctx.runNTULearnAuto();assert.equal(f.saves(),1);
 f.ctx.HUB[0].desc='Personal notes';await f.ctx.runNTULearnAuto();assert.equal(f.ctx.HUB[0].desc,'Personal notes');assert.equal(f.saves(),1);
});
test('opt-out, wrong owner, unmapped courses, hidden pages and active typing never save',async()=>{
 for(const change of [f=>f.semester.ntuAuto.enabled=false,f=>f.semester.ntuAuto.owner='other',f=>f.semester.ntuAuto.mapping={},f=>f.ctx.document.visibilityState='hidden',f=>f.ctx.document.activeElement={tagName:'INPUT'},f=>f.ctx.recordWritable=()=>{throw Error('blocked');}]){const f=setup();change(f);await f.ctx.runNTULearnAuto();assert.equal(f.saves(),0);assert.equal(f.ctx.HUB.length,0);}
});
test('account/semester changes or withdrawn consent during a fetch discard its result',async()=>{
 for(const change of [f=>f.ctx.active='s2',f=>f.ctx.ReferenceCloud.user.id='other',f=>f.semester.ntuAuto.enabled=false,f=>f.semester.ntuAuto.mapping.c='OTHER']){const f=setup(),finish=f.delay(),pending=f.ctx.runNTULearnAuto();change(f);finish();await pending;assert.equal(f.saves(),0);assert.equal(f.ctx.HUB.length,0);}
});
test('missing source records never delete imports; outside-term and unmapped items are held',()=>{
 const f=setup();const parsed=f.ctx.NTULearnSync.parse(JSON.stringify({format:'academic-assistant-ntulearn-sync',schemaVersion:1,exportedAt:'2026-11-03T01:00:00Z',items:[item,{...item,id:'outside',date:'2027-01-01'},{...item,id:'unmapped',courseId:'unknown'}],warnings:[]}));
 const result=f.ctx.NTULearnSync.automatic([{id:99,title:'Existing'}],parsed,['SC1004'],f.semester.start,f.semester.end,{c:'SC1004'});assert.equal(result.changes.length,1);assert.equal(result.unmapped,1);
});
test('consent and module mappings survive the actual workspace preferences projection',async()=>{
 const f=setup();vm.runInContext(await readFile(new URL('../workspace/production-bridge.js',import.meta.url),'utf8'),f.ctx);
 const semester={...f.semester,id:'s1',yearId:'y2026',mods:['SC1004'],tasks:[],assessments:[],inbox:[]};
 const payload=f.ctx.ProductionWorkspace.preferencesOf({years:[{id:'y2026',start:2026}],terms:[semester],active:'s1',current:'s1'},new Map());
 const restored=f.ctx.ProductionWorkspace.project({tasks:[],assessments:[]},payload);
 assert.equal(JSON.stringify(restored.snapshot.terms.find(x=>x.id==='s1').ntuAuto),JSON.stringify(semester.ntuAuto));
});
