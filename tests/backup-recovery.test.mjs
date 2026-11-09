import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const context=vm.createContext({structuredClone,crypto,Blob,btoa,atob,Uint8Array,Date,JSON,Error,Set,Map,Number,String,Object,Array,RegExp,Math});
vm.runInContext(await readFile(new URL('../workspace/local-store.js',import.meta.url),'utf8'),context);
vm.runInContext(await readFile(new URL('../workspace/backup-recovery.js',import.meta.url),'utf8'),context);
const api=context.AcademicBackup,validate=context.ReferenceLocalStore.validate;
vm.runInContext(await readFile(new URL('../workspace/file-library.js',import.meta.url),'utf8'),context);
const term=(tasks=[],assessments=[])=>({id:'s1',yearId:'y2026',label:'Semester 1',name:'AY2026/27 · Semester 1',start:'2026-08-10',end:'2026-12-04',weeks:13,date:'2026-11-03',mods:['SC1001'],tasks,classes:[],topics:{SC1001:[['Arrays',2,1]]},inbox:[],files:[],assessments,timetable:[],hub:[],messages:[],imported:false});
const task={id:1,mod:'SC1001',title:'Review arrays',date:'2026-11-03',min:30,fix:false,done:false,done_at:null,notes:'Read chapter 4'};
const assessment={id:2,mod:'SC1001',name:'Quiz 1',date:'2026-11-20',time:'09:00',type:'Quiz'};
const workspace=(t=term())=>({years:[{id:'y2026',start:2026,label:'AY2026/27'}],terms:[t],active:'s1',current:'s1',studyYear:'Year 2',n:2,lastByYear:{},theme:'light'});

test('full archive round-trips semester settings, task, assessment and private file bytes',async()=>{
 const bytes=new TextEncoder().encode('synthetic private file');
 const backup=await api.create(workspace(term([task],[assessment])),[{row:{semester_id:'s1',module:'SC1001',name:'notes.txt',bytes:bytes.length,mime:'text/plain'},blob:new Blob([bytes])}]);
 const restored=await api.parse(JSON.stringify(backup),validate);
 assert.deepEqual(JSON.parse(JSON.stringify(restored.data)),JSON.parse(JSON.stringify(workspace(term([task],[assessment])))));
 assert.equal(restored.assets[0].name,'notes.txt');assert.equal(new TextDecoder().decode(restored.assets[0].bytesData),'synthetic private file');
});

test('legacy version 1 JSON backups restore records and explicitly contain no file bytes',async()=>{
 const old={schemaVersion:1,exportedAt:'2026-10-01T00:00:00.000Z',reference:'Academic_Assistant_v2_9_Settings.html',data:workspace(term([task],[assessment]))};
 const parsed=await api.parse(JSON.stringify(old),validate);assert.equal(parsed.legacy,true);assert.equal(parsed.assets.length,0);assert.equal(parsed.data.terms[0].tasks[0].title,'Review arrays');
});

test('backup integrity check rejects changed file bytes',async()=>{
 const bytes=new TextEncoder().encode('original');
 const backup=await api.create(workspace(),[{row:{semester_id:'s1',module:'SC1001',name:'notes.txt',bytes:bytes.length,mime:'text/plain'},blob:new Blob([bytes])}]);
 backup.assets[0].contentBase64='Y2hhbmdlZA==';
 await assert.rejects(()=>api.parse(JSON.stringify(backup),validate),/size does not match|checksum/);
});

test('restore merge adds missing planner records and is idempotent without replacing progress',()=>{
 const incoming=workspace(term([task],[assessment])),current=workspace(term());
 const first=api.merge(current,incoming,validate);
 assert.equal(first.summary.addedTasks,1);assert.equal(first.summary.addedAssessments,1);assert.equal(first.summary.addedTerms,0);
 assert.deepEqual(first.snapshot.terms[0].topics.SC1001,[['Arrays',2,1]]);
 const again=api.merge(first.snapshot,incoming,validate);
 assert.equal(again.summary.addedTasks,0);assert.equal(again.summary.addedAssessments,0);assert.equal(again.snapshot.terms[0].tasks.length,1);assert.equal(again.snapshot.terms[0].assessments.length,1);
});

test('restore adds another academic year/semester without changing existing terms',()=>{
 const current=workspace(),incoming=workspace();incoming.years.push({id:'y2027',start:2027,label:'AY2027/28'});
 incoming.terms.push({...term([{...task,id:3,date:'2027-09-01'}],[]),id:'s3',yearId:'y2027',label:'Semester 1',name:'AY2027/28 · Semester 1',start:'2027-08-09',end:'2027-12-03',date:'2027-09-01'});incoming.current='s3';incoming.active='s3';incoming.n=3;
 const result=api.merge(current,incoming,validate);assert.equal(result.summary.addedTerms,1);assert.equal(result.snapshot.terms.length,2);assert.equal(result.snapshot.current,'s3');assert.equal(result.snapshot.terms.find(x=>x.id==='s1').name,'AY2026/27 · Semester 1');
});

test('restore pipeline saves records before files and a retry does not duplicate either',async()=>{
 const bytes=new TextEncoder().encode('recovery file fixture');
 const backup=await api.parse(JSON.stringify(await api.create(workspace(term([task],[assessment])),[{row:{semester_id:'s1',module:'SC1001',name:'notes.txt',bytes:bytes.length,mime:'text/plain'},blob:new Blob([bytes])}])),validate);
 let saved=workspace(term()),files=[];const writes=[];
 const adapter={
  async saveWorkspace(snapshot){validate(snapshot);saved=structuredClone(snapshot);writes.push('workspace');},
  async listFiles(semesterId){return files.filter(x=>x.semester_id===semesterId);},
  async downloadFile(row){return row.blob;},
  async uploadFile(file){const row={semester_id:file.semesterId,module:file.module,name:file.name,bytes:file.bytes,mime:file.mime,blob:new Blob([file.bytesData])};files.push(row);writes.push('file');return row;}
 };
 const first=await api.restore(saved,backup,adapter,validate);assert.equal(first.addedTasks,1);assert.equal(first.addedAssessments,1);assert.equal(first.addedFiles,1);assert.deepEqual(writes,['workspace','file']);
 const second=await api.restore(saved,backup,adapter,validate);assert.equal(second.addedTasks,0);assert.equal(second.addedAssessments,0);assert.equal(second.addedFiles,0);assert.equal(second.skippedFiles,1);assert.equal(files.length,1);assert.equal(saved.terms[0].tasks.length,1);assert.equal(saved.terms[0].assessments.length,1);
});

test('restore preserves intentionally repeated tasks and identical file copies',async()=>{
 const duplicateTask={...task,id:3},duplicateAssessment={...assessment,id:4},data=workspace(term([task,duplicateTask],[assessment,duplicateAssessment]));data.n=4;
 const bytes=new TextEncoder().encode('same file bytes'),file={row:{semester_id:'s1',module:'SC1001',name:'notes.txt',bytes:bytes.length,mime:'text/plain'},blob:new Blob([bytes])};
 const backup=await api.parse(JSON.stringify(await api.create(data,[file,file])),validate);let saved=workspace(term()),files=[];
 const adapter={async saveWorkspace(s){validate(s);saved=structuredClone(s);},async listFiles(id){return files.filter(f=>f.semester_id===id);},async downloadFile(r){return r.blob;},async uploadFile(f){const row={semester_id:f.semesterId,module:f.module,name:f.name,bytes:f.bytes,blob:new Blob([f.bytesData])};files.push(row);return row;}};
 const first=await api.restore(saved,backup,adapter,validate);assert.equal(first.addedTasks,2);assert.equal(first.addedAssessments,2);assert.equal(first.addedFiles,2);
 const second=await api.restore(saved,backup,adapter,validate);assert.equal(second.addedTasks,0);assert.equal(second.addedAssessments,0);assert.equal(second.skippedFiles,2);assert.equal(saved.terms[0].tasks.length,2);assert.equal(files.length,2);
});

test('semester setting conflicts stop before producing a modified restore result',()=>{
 const current=workspace(),incoming=workspace();incoming.terms[0].end='2026-12-05';
 assert.throws(()=>api.merge(current,incoming,validate),/conflicts with existing semester settings/);
 assert.equal(current.terms[0].end,'2026-12-04');
});

test('restored file downloads through the actual Library adapter with matching bytes and checksum',async()=>{
 const original=new TextEncoder().encode('Restored download verification: π and newline\n');
 const packed=await api.create(workspace(),[{row:{semester_id:'s1',module:'SC1001',name:'recovered.txt',bytes:original.length,mime:'text/plain'},blob:new Blob([original])}]);
 const backup=await api.parse(JSON.stringify(packed),validate),objects=new Map(),rows=[];
 await api.restore(workspace(),backup,{async saveWorkspace(s){validate(s)},async listFiles(){return rows},async downloadFile(row){return objects.get(row.path)},async uploadFile(f){const row={user_id:'fixture-owner',path:'fixture-owner/s1/recovered.txt',module:f.module,name:f.name,bytes:f.bytes};objects.set(row.path,new Blob([f.bytesData]));rows.push(row);return row}},validate);
 const library=new context.AcademicFiles.Library({auth:{async getUser(){return {data:{user:{id:'fixture-owner'}}}}},storage:{from(){return {async download(path){return {data:objects.get(path),error:null}}}}}});
 const downloaded=new Uint8Array(await (await library.download('fixture-owner',rows[0])).arrayBuffer());
 assert.deepEqual(downloaded,original);assert.equal(await api.digest(downloaded),packed.assets[0].sha256);
});

test('backup restores missing study metadata without overwriting current sessions, grades or reminder choices',async()=>{
 const current=workspace(term([task],[assessment])),incoming=workspace(term([task],[assessment]));
 current.terms[0].studyTools={owner:'owner',rules:[],sessions:[{id:'same',minutes:25}],grades:{g:{weight:20,score:9}},reminders:{enabled:false}};
 incoming.terms[0].studyTools={owner:'owner',rules:[{id:'weekly'}],sessions:[{id:'same',minutes:10},{id:'missing',minutes:15}],grades:{g:{weight:20,score:7},restored:{weight:10}},reminders:{enabled:true}};
 const archive=await api.parse(JSON.stringify(await api.create(incoming,[])),validate);
 const first=api.merge(current,archive.data,validate).snapshot;
 assert.equal(first.terms[0].studyTools.sessions.length,2);assert.equal(first.terms[0].studyTools.sessions[0].minutes,25);assert.equal(first.terms[0].studyTools.grades.g.score,9);assert.equal(first.terms[0].studyTools.grades.restored.weight,10);assert.equal(first.terms[0].studyTools.reminders.enabled,false);
 const again=api.merge(first,archive.data,validate).snapshot;assert.equal(again.terms[0].studyTools.sessions.length,2);assert.equal(again.terms[0].studyTools.rules.length,1);assert.equal(current.terms[0].studyTools.sessions.length,1);
});
test('backup does not combine study metadata owned by different accounts',()=>{
 const current=workspace(),incoming=workspace();current.terms[0].studyTools={owner:'a',sessions:[]};incoming.terms[0].studyTools={owner:'b',sessions:[{id:'foreign'}]};const result=api.merge(current,incoming,validate);assert.equal(result.snapshot.terms[0].studyTools.sessions.length,0);
});

test('backups preserve task priorities and merge moved history once',async()=>{const source=workspace(term([{...task,priority:'high'}]));source.terms[0].studyTools={owner:'alice',moves:[{id:'move-1',title:task.title,module:task.mod,from:'2026-11-01',to:task.date}]};const packed=await api.create(source,[]),parsed=await api.parse(JSON.stringify(packed),validate);assert.equal(parsed.data.terms[0].tasks[0].priority,'high');const current=structuredClone(source);current.terms[0].studyTools.moves=[];const merged=api.merge(current,parsed.data,validate);assert.equal(merged.snapshot.terms[0].studyTools.moves.length,1);assert.equal(api.merge(merged.snapshot,parsed.data,validate).snapshot.terms[0].studyTools.moves.length,1);});

test('backup merging preserves deleted task records with distinct local IDs',()=>{const incoming=workspace(term());incoming.terms[0].recordTrash=[{id:'deleted-task',kind:'tasks',row:{...task,id:1},index:0}];const current=workspace(term([{...task,title:'Different active task'}]));const restored=api.merge(current,incoming,validate);const result=restored.data||restored.snapshot||restored;assert.equal(result.terms[0].recordTrash.length,1);assert.notEqual(result.terms[0].recordTrash[0].row.id,result.terms[0].tasks[0].id);});

test('backup restore remaps a deleted file to its restored storage ID',async()=>{
 const data=workspace(),bytes=new TextEncoder().encode('trashed file');data.terms[0].fileTrash={'old-file':{name:'notes.txt',module:'SC1001',at:'2026-11-09T00:00:00Z'}};
 const archive=await api.parse(JSON.stringify(await api.create(data,[{row:{id:'old-file',semester_id:'s1',module:'SC1001',name:'notes.txt',bytes:bytes.length,mime:'text/plain'},blob:new Blob([bytes])}])),validate);
 let saved;await api.restore(workspace(),archive,{async saveWorkspace(s){saved=structuredClone(s);},async listFiles(){return [];},async uploadFile(){return {id:'restored-file'};}},validate);
 assert.equal(saved.terms[0].fileTrash['old-file'],undefined);assert.equal(saved.terms[0].fileTrash['restored-file'].name,'notes.txt');
});

test('imported schedule proposals remain preserved but cannot target a recycled local task ID',()=>{const incoming=workspace(term([task])),current=workspace(term([{...task,title:'Current task'}]));incoming.terms[0].inbox=[{id:999,t:'change',s:'p',mod:task.mod,title:'Delete restored task',date:task.date,min:task.min,change:{source:'user',entity:'tasks',operation:'delete',before:task,after:null,recordId:'original-uuid'}}];const merged=api.merge(current,incoming,validate).snapshot;assert.equal(merged.terms[0].inbox[0].change.unavailable,true);assert.equal(merged.terms[0].tasks[0].title,'Current task');assert.equal(merged.terms[0].inbox[0].change.recordId,'original-uuid');});
