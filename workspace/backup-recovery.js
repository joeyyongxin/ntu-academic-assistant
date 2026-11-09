// Self-contained, integrity-checked Academic Assistant backups and safe merge.
(function(root){
 'use strict';
 const copy=x=>structuredClone(x);
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
 const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 const check=(ok,message)=>{if(!ok)throw Error(message)};
 const MAX_TOTAL=50*1024*1024,MAX_JSON=72*1024*1024;
 const allowed=new Set(['pdf','txt','md','csv','png','jpg','jpeg','webp','docx','pptx','xlsx','zip']);
 function taskKey(t){return {mod:t.mod,title:t.title,date:t.date,min:t.min,fix:!!t.fix,done:!!t.done,done_at:t.done_at||null,notes:t.notes||'',priority:['high','low'].includes(t.priority)?t.priority:'normal'}}
 function assessmentKey(a){return {mod:a.mod,name:a.name,date:a.date,time:a.time||'',type:a.type||'Assessment'}}
 async function digest(bytes){const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()}
 function b64(bytes){let out='';for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(out)}
 function unb64(text){check(typeof text==='string'&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text),'A backed-up file is not valid Base64.');const raw=atob(text),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
 async function create(snapshot,assets){
  const packed=[];let total=0;
  for(const item of assets){const bytes=new Uint8Array(await item.blob.arrayBuffer());total+=bytes.length;check(bytes.length===item.row.bytes&&bytes.length>0,'A file changed while the backup was being created. Refresh the Library and try again.');check(total<=MAX_TOTAL,'Backups can include up to 50 MB of uploaded files.');packed.push({...(item.row.id?{sourceId:item.row.id}:{}),semesterId:item.row.semester_id,module:item.row.module,name:item.row.name,bytes:bytes.length,mime:item.row.mime||'application/octet-stream',sha256:await digest(bytes),contentBase64:b64(bytes)});}
  return {format:'academic-assistant-backup',schemaVersion:2,exportedAt:new Date().toISOString(),data:copy(snapshot),assets:packed};
 }
 async function parse(text,validate){
  check(typeof text==='string'&&text.length<=MAX_JSON,'This backup is larger than the supported 72 MB limit.');let input;try{input=JSON.parse(text)}catch{throw Error('This file is not valid JSON.');}
  if(input?.schemaVersion===1&&input.data&&!input.format&&!input.assets){validate(input.data);return {data:copy(input.data),assets:[],exportedAt:input.exportedAt||null,legacy:true};}
  check(input?.format==='academic-assistant-backup'&&input.schemaVersion===2,'This is not a supported Academic Assistant backup. Export a new backup from Settings.');
  check(Array.isArray(input.assets)&&input.assets.length<=1000,'Backup file list is missing or too large.');validate(input.data);
  let total=0;const decoded=[];
  for(const f of input.assets){check(f&&typeof f==='object'&&/^s\d+$/.test(f.semesterId)&&/^[A-Z0-9_-]{2,16}$/.test(f.module),'A backed-up file has invalid semester or module details.');check(typeof f.name==='string'&&f.name.trim()&&f.name.length<=240&&allowed.has(f.name.split('.').pop().toLowerCase()),'A backed-up file has an unsupported filename.');check(Number.isSafeInteger(f.bytes)&&f.bytes>0&&f.bytes<=10*1024*1024,'A backed-up file has an invalid size.');check(typeof f.mime==='string'&&f.mime.length<=200,'A backed-up file has an invalid content type.');check(typeof f.sha256==='string'&&/^[A-F0-9]{64}$/.test(f.sha256),'A backed-up file has an invalid checksum.');check(typeof f.contentBase64==='string'&&f.contentBase64.length===Math.ceil(f.bytes/3)*4,'A backed-up file size does not match its manifest.');const term=input.data.terms.find(t=>t.id===f.semesterId);check(term&&term.mods.includes(f.module),'A backed-up file refers to a module outside its semester.');const bytes=unb64(f.contentBase64);check(bytes.length===f.bytes,'A backed-up file size does not match its manifest.');total+=bytes.length;check(total<=MAX_TOTAL,'Backup files exceed the 50 MB total limit.');check(await digest(bytes)===f.sha256,'A backed-up file failed its checksum: '+f.name);decoded.push({...f,contentBase64:undefined,bytesData:bytes});}
  return {data:copy(input.data),assets:decoded,exportedAt:input.exportedAt};
 }
 function merge(current,incoming,validate){
  const out=copy(current),source=copy(incoming),yearIds=new Map(out.years.map(y=>[y.id,y])),termIds=new Map(out.terms.map(t=>[t.id,t]));let addedTasks=0,addedAssessments=0,addedTerms=0,addedFiles=0,duplicates=0;
  for(const y of source.years){const old=yearIds.get(y.id);if(old){check(old.start===y.start&&old.label===y.label,'Academic year '+y.label+' conflicts with the existing year settings. No data was restored.');}else{check(!out.years.some(a=>a.start===y.start),'Two academic year IDs have the same start year. No data was restored.');out.years.push(y);yearIds.set(y.id,y);}}
  let nextId=Math.max(Number(out.n)||0,...out.terms.flatMap(t=>[...t.tasks,...t.assessments,...(t.recordTrash||[]).filter(e=>['tasks','assessments'].includes(e.kind)).map(e=>e.row)].map(x=>Number(x.id)||0)));
  const mergeUnique=(target,items)=>{const counts=new Map();for(const x of target){const key=JSON.stringify(canonical(x));counts.set(key,(counts.get(key)||0)+1);}const used=new Map();for(const item of items||[]){const key=JSON.stringify(canonical(item)),seen=used.get(key)||0;used.set(key,seen+1);if(seen<(counts.get(key)||0)){duplicates++;continue;}const row=copy(item);if(Number.isSafeInteger(row.id)&&target.some(x=>x.id===row.id)){row.id=Math.max(0,...target.map(x=>Number(x.id)||0))+1;}if(row.change?.before)row.change.unavailable=true;target.push(row);}};
  for(const src of source.terms){let target=termIds.get(src.id);if(target){check(target.yearId===src.yearId&&target.label===src.label&&target.name===src.name&&target.start===src.start&&target.end===src.end&&target.weeks===src.weeks,'Semester '+src.name+' conflicts with existing semester settings. No data was restored.');}else{target=copy(src);target.recordTrash=[];target.libraryLinks={};target.tasks=[];target.assessments=[];target.classes=[];target.inbox=[];target.files=[];target.timetable=[];target.hub=[];target.topics={};target.mods=[];out.terms.push(target);termIds.set(src.id,target);addedTerms++;}
   for(const m of src.mods)if(!target.mods.includes(m))target.mods.push(m);
   const taskCounts=new Map();for(const x of target.tasks){const key=JSON.stringify(canonical(taskKey(x)));taskCounts.set(key,(taskCounts.get(key)||0)+1);}const taskUsed=new Map();
   for(const task of src.tasks){const key=JSON.stringify(canonical(taskKey(task))),seen=taskUsed.get(key)||0;taskUsed.set(key,seen+1);if(seen<(taskCounts.get(key)||0)){duplicates++;continue;}const row=copy(task);row.id=++nextId;target.tasks.push(row);addedTasks++;}
   const assessmentCounts=new Map();for(const x of target.assessments){const key=JSON.stringify(canonical(assessmentKey(x)));assessmentCounts.set(key,(assessmentCounts.get(key)||0)+1);}const assessmentUsed=new Map();
   for(const a of src.assessments){const key=JSON.stringify(canonical(assessmentKey(a))),seen=assessmentUsed.get(key)||0;assessmentUsed.set(key,seen+1);if(seen<(assessmentCounts.get(key)||0)){duplicates++;continue;}const row=copy(a);row.id=++nextId;target.assessments.push(row);addedAssessments++;}
   for(const field of ['classes','files','timetable','hub','inbox','messages'])mergeUnique(target[field]||(target[field]=[]),src[field]||[]);
   for(const [mod,topics] of Object.entries(src.topics||{})){target.topics[mod]??=[];for(const topic of topics){if(target.topics[mod].some(x=>String(x[0]).toLowerCase()===String(topic[0]).toLowerCase())){duplicates++;continue;}target.topics[mod].push(copy(topic));}}
   if(src.studyTools){
    if(!target.studyTools)target.studyTools=copy(src.studyTools);
    else if(target.studyTools.owner===src.studyTools.owner){
     for(const field of ['rules','sessions','moves']){const current=target.studyTools[field]||[],incoming=src.studyTools[field]||[];check(Array.isArray(current)&&Array.isArray(incoming),'Invalid backed-up study tools.');const ids=new Set(current.map(x=>x.id));for(const item of incoming)if(!ids.has(item.id)){current.push(copy(item));ids.add(item.id);}target.studyTools[field]=current;}
     target.studyTools.grades={...copy(src.studyTools.grades||{}),...(target.studyTools.grades||{})};
     if(!target.studyTools.reminders&&src.studyTools.reminders)target.studyTools.reminders=copy(src.studyTools.reminders);
    }
   }
   target.recordTrash??=[];for(const entry of src.recordTrash||[]){if(target.recordTrash.some(e=>e.id===entry.id))continue;const saved=copy(entry);if(['tasks','assessments'].includes(saved.kind)){const key=saved.kind==='tasks'?taskKey:assessmentKey;if(target[saved.kind].some(row=>JSON.stringify(canonical(key(row)))===JSON.stringify(canonical(key(saved.row)))))continue;saved.row.id=++nextId;delete saved.recordId;delete saved.unavailable;}target.recordTrash.push(saved);}
   target.fileTrash={...copy(src.fileTrash||{}),...(target.fileTrash||{})};
   target.libraryLinks??={};for(const [assetId,link] of Object.entries(src.libraryLinks||{})){if(target.libraryLinks[assetId])continue;const associations=[];for(const association of [link,...(link.related||[])]){const sourceMaterials=[...src.hub,...(src.recordTrash||[]).filter(e=>e.kind==='hub').map(e=>e.row)],targetMaterials=[...target.hub,...(target.recordTrash||[]).filter(e=>e.kind==='hub').map(e=>e.row)];const original=sourceMaterials.find(m=>m.id===association.materialId||(association.sourceKey&&m.ntulearnSyncKey===association.sourceKey));if(!original)continue;const matches=targetMaterials.filter(m=>association.sourceKey?m.ntulearnSyncKey===association.sourceKey:same({...m,id:null},{...original,id:null}));if(matches.length===1)associations.push({materialId:matches[0].id,sourceKey:association.sourceKey||null});}if(associations.length)target.libraryLinks[assetId]={...associations[0],...(associations.length>1?{related:associations.slice(1)}:{})};}

   target.date=src.date;target.imported=!!(target.imported||src.imported);
  }
  out.years.sort((a,b)=>a.start-b.start);out.terms.sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
  check(termIds.has(source.current),'Backup current semester is missing.');out.current=source.current;out.active=out.current;out.studyYear=source.studyYear;out.n=nextId;out.lastByYear={};
  validate(out);
  return {snapshot:out,summary:{addedTerms,addedTasks,addedAssessments,duplicates,addedFiles}};
 }
 async function restore(current,backup,adapter,validate){
  const result=merge(current,backup.data,validate);await adapter.saveWorkspace(result.snapshot);
  let addedFiles=0,skippedFiles=0,trashRemapped=false;const fileCounts=new Map(),fileUsed=new Map();
  for(let i=0;i<backup.assets.length;i++){
   const file=backup.assets[i],key=JSON.stringify([file.semesterId,file.module,file.name,file.bytes,file.sha256]),seen=fileUsed.get(key)||0;fileUsed.set(key,seen+1);
   if(!fileCounts.has(key)){const rows=await adapter.listFiles(file.semesterId),candidates=rows.filter(r=>r.module===file.module&&r.name===file.name&&r.bytes===file.bytes);const matches=[];for(const row of candidates)if(await digest(await adapter.downloadFile(row).then(blob=>blob.arrayBuffer()))===file.sha256)matches.push(row);fileCounts.set(key,matches);}
   let saved;if(seen<fileCounts.get(key).length){saved=fileCounts.get(key)[seen];skippedFiles++;}else{saved=await adapter.uploadFile(file);addedFiles++;}
   const target=result.snapshot.terms.find(t=>t.id===file.semesterId),archived=file.sourceId&&target.fileTrash?.[file.sourceId];if(archived&&saved?.id&&saved.id!==file.sourceId){target.fileTrash[saved.id]=archived;delete target.fileTrash[file.sourceId];trashRemapped=true;}
   if(file.sourceId&&saved?.id&&saved.id!==file.sourceId){if(target.libraryLinks?.[file.sourceId]){target.libraryLinks[saved.id]=target.libraryLinks[file.sourceId];delete target.libraryLinks[file.sourceId];trashRemapped=true;}for(const entry of target.recordTrash||[])if(entry.libraryFiles&&Object.hasOwn(entry.libraryFiles,file.sourceId)){entry.libraryFiles[saved.id]=entry.libraryFiles[file.sourceId];delete entry.libraryFiles[file.sourceId];trashRemapped=true;}}
   adapter.progress?.({done:i+1,total:backup.assets.length,added:addedFiles,skipped:skippedFiles});
  }
  if(trashRemapped)await adapter.saveWorkspace(result.snapshot);
  return {...result.summary,addedFiles,skippedFiles};
 }
 root.AcademicBackup={MAX_TOTAL,create,parse,merge,restore,digest,taskKey,assessmentKey};
})(globalThis);
