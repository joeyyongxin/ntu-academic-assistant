import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {collectCourse,plainText} from '../extension/ntulearn-connect/collect.mjs';
import {appUrl,validContext,sameContext} from '../extension/ntulearn-connect/policy.mjs';
const c=vm.createContext({TextEncoder,Date,Set,JSON,Error,URL});
vm.runInContext(await readFile(new URL('../workspace/ntulearn-sync.js',import.meta.url),'utf8'),c);
const api=c.NTULearnSync;
const item={kind:'ann',id:'a1',courseId:'c1',courseName:'SC1004',title:'Vectors',text:'Read chapter 2',date:'2026-11-03',deadlineDate:'',url:'https://ntulearn.ntu.edu.sg/webapps/blackboard/execute/announcement?course_id=c1'};
const pack=items=>JSON.stringify({format:'academic-assistant-ntulearn-sync',schemaVersion:1,exportedAt:'2026-11-03T01:00:00Z',items,warnings:[]});
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
test('snapshot validates types, dates, source destinations and stable deduplication',()=>{
 const parsed=api.parse(pack([item,{...item,title:'Repeated'}]));assert.equal(parsed.items.length,1);assert.equal(parsed.duplicates,1);assert.equal(parsed.items[0].suggestedModules[0],'SC1004');
 for(const change of [{date:'2026-02-30'},{kind:'unknown'},{url:'https://evil.example'},{title:''},{deadlineDate:'2026-11-03'}])assert.throws(()=>api.parse(pack([{...item,...change}])));
});
test('source refresh protects personal edits while allowing untouched imported updates',()=>{
 const x=api.parse(pack([item])).items[0],fields=api.row(x,'SC1004'),old={id:1,...fields,ntulearnSyncKey:x.sourceKey,ntulearnSyncBaseline:api.fingerprint(fields)};
 assert.equal(api.classify([old],x),'unchanged');assert.equal(api.classify([old],{...x,text:'Updated by lecturer'}),'source changed');
 for(const change of [{title:'My title'},{desc:'My notes'},{mod:'OTHER'},{date:'2026-11-04'},{type:'file'}])assert.equal(api.classify([{...old,...change}],x),'personal edit kept');
 assert.equal(api.classify([{...old,unread:false}],x),'unchanged');
 assert.equal(api.classify([{announcementSourceKey:JSON.stringify(['c1','a1']),title:'Old import'}],x),'personal edit kept');
});
test('material source date fallback does not shift previously imported dates every day',()=>{
 const x={...item,kind:'file',dateEstimated:true,date:'2026-11-05'};assert.equal(api.row(x,'SC1004',{date:'2026-11-03'}).date,'2026-11-03');
});
test('collector traverses nested material folders, decodes text and scopes explicit deadlines',async()=>{
 const calls=[];const response=await collectCourse({id:'c1',name:'SC1004'},async url=>{calls.push(url);const p=new URL(url).pathname;
  if(p.endsWith('/announcements'))return json({results:[{id:'a1',title:'Hello',body:'<p>A &amp; B</p><script>secret()</script>',created:'2026-11-03T18:00:00Z'}]});
  if(p.endsWith('/items'))return json({results:[{id:'d1',title:'Assignment',type:'GradebookColumn',start:'2026-11-09T18:00:00Z'},{id:'e1',title:'Other',type:'Course'}]});
  if(p.endsWith('/children'))return json({results:[{id:'file1',title:'Lecture notes',created:'2026-11-03T01:00:00Z'}]});
  return json({results:[{id:'folder1',title:'Week 1',hasChildren:true,contentHandler:{id:'resource/x-bb-folder'}},{id:'hidden',title:'Hidden',availability:{available:'No'}}]});
 },new Date('2026-11-03T00:00:00Z'));
 assert.equal(response.warnings.length,0);assert.equal(response.items.length,3);assert.equal(response.items[0].text,'A & B');assert.equal(response.items[0].date,'2026-11-04');assert.equal(response.items[1].deadlineDate,'2026-11-10');assert.ok(calls.some(x=>x.includes('/folder1/children')));
 assert.equal(plainText('&#x110000; &lt;img src=x&gt;'),'<img src=x>');
});
test('failed child listings discard that partial category and report a warning',async()=>{
 const result=await collectCourse({id:'c1',name:'SC1004'},async url=>{const p=new URL(url).pathname;if(p.endsWith('/children'))return new Response('',{status:403});if(p.endsWith('/contents'))return json({results:[{id:'first',title:'A file'},{id:'folder',title:'Folder',hasChildren:true}]});return json({results:[]});});
 assert.equal(result.items.length,0);assert.equal(result.warnings.length,1);assert.match(result.warnings[0],/materials.*403/);
});
test('pairing policy rejects sibling sites, extra paths, frames and mismatched account/semester contexts',()=>{
 assert.equal(appUrl('https://joeyyongxin.github.io/ntu-academic-assistant/index.html#settings'),true);
 for(const url of ['https://joeyyongxin.github.io/other/','https://evil.example/ntu-academic-assistant/','http://joeyyongxin.github.io/ntu-academic-assistant/','https://joeyyongxin.github.io/ntu-academic-assistant/tests/ui-workspace.html'])assert.equal(appUrl(url),false);
 const context={owner:'owner-1',semester:'s1',label:'Account',termName:'Semester'};assert.equal(validContext(context),true);assert.equal(validContext({...context,owner:''}),false);assert.equal(sameContext(context,{...context,semester:'s2'}),false);
});
const hook=(await readFile(new URL('../workspace/ntulearn-sync-hook.js',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
function setup(){const error={textContent:''},ctx=vm.createContext({settings:()=>'',ntulearn:()=>'',ReferenceCloud:{user:{id:'owner',email:'account@example.invalid'}},active:'s1',term:()=>({name:'Semester'}),HUB:[],MODS:['SC1004'],NTULearnSync:api,recordWritable(){},recordDate:d=>d,nextHubId:a=>a.length+1,go(){},esc:s=>s,document:{querySelectorAll:()=>[{dataset:{ntuSync:'0'}}],querySelector:()=>({value:'SC1004'}),getElementById:()=>error}});ctx.applyOrPropose=c=>{if(c.before)ctx.HUB[ctx.HUB.indexOf(c.before)]=structuredClone(c.after);else ctx.HUB.push(structuredClone(c.after));};ctx.window=ctx;vm.runInContext(hook,ctx);ctx.fixtureItem=api.parse(pack([item])).items[0];vm.runInContext("ntuSyncPreview={context:ntuContext(),items:[fixtureItem]}",ctx);return {ctx,error};}
test('reviewed imports deduplicate, update untouched records, preserve edits and obey scope/write guards',()=>{
 const {ctx,error}=setup();ctx.saveNTULearnSync();assert.equal(ctx.HUB.length,1);assert.equal(ctx.HUB[0].mod,'SC1004');
 ctx.fixtureItem.text='Lecturer changed text';vm.runInContext('ntuSyncPreview={context:ntuContext(),items:[fixtureItem]}',ctx);ctx.saveNTULearnSync();assert.equal(ctx.HUB.length,1);assert.equal(ctx.HUB[0].desc,'Lecturer changed text');
 ctx.HUB[0].desc='My own notes';vm.runInContext('ntuSyncPreview={context:ntuContext(),items:[fixtureItem]}',ctx);ctx.saveNTULearnSync();assert.equal(ctx.HUB[0].desc,'My own notes');assert.match(error.textContent,/edited locally/);
 for(const change of ["active='s2'","ReferenceCloud.user.id='other'","MODS=[]","recordWritable=()=>{throw Error('blocked')}"]){const fixture=setup();vm.runInContext(change,fixture.ctx);fixture.ctx.saveNTULearnSync();assert.equal(fixture.ctx.HUB.length,0);assert.ok(fixture.error.textContent);}
});
test('both entrypoints contain the same connection hook and parse successfully',async()=>{
 let previous;for(const name of ['index.html','workspace.html']){const html=(await readFile(new URL('../'+name,import.meta.url),'utf8')).replace(/\r\n/g,'\n');assert.ok(html.includes(hook));assert.match(html,/src="workspace\/ntulearn-sync.js"/);for(const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);if(previous)assert.equal(html,previous);previous=html;}
});
