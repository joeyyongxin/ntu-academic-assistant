// Adapt the approved interface to the existing production task/assessment API.
(() => {
 const copy=x=>JSON.parse(JSON.stringify(x));
 const dateNow=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function project(records,preferences=null){
  const years=copy(preferences?.years||[]),terms=copy(preferences?.terms||[]),map=new Map();let n=0;
  for(const t of terms){t.tasks=[];t.assessments=[];}
  function semester(date,assigned){
   const target=terms.find(t=>t.id===assigned)||terms.find(t=>date>=t.start&&date<=t.end);if(target)return target;
   if(!/^\d{4}-\d\d-\d\d$/.test(date))throw Error('A saved record has no valid date. Export it from the current app before proceeding.');
   const year=Number(date.slice(0,4)),month=Number(date.slice(5,7)),start=year-(month<8?1:0),y='y'+start,part=month>=8?1:2;let id='s'+(start*2+part);if(terms.some(t=>t.id===id))id='s'+(1+Math.max(0,...terms.map(t=>Number(t.id.slice(1)))));
   if(!years.some(a=>a.id===y))years.push({id:y,start,label:'AY'+start+'/'+String(start+1).slice(-2)});
   if(!terms.some(a=>a.id===id))terms.push({id,yearId:y,label:'Semester '+part,name:'AY'+start+'/'+String(start+1).slice(-2)+' · Semester '+part,start:part===1?start+'-08-01':(start+1)+'-01-01',end:part===1?start+'-12-31':(start+1)+'-07-31',weeks:13,date,mods:[],tasks:[],assessments:[],classes:[],topics:{},inbox:[],files:[],timetable:[],hub:[],messages:[],imported:false});
   return terms.find(a=>a.id===id);
  }
  const current=terms.find(t=>t.id===preferences?.current)?.id||semester(dateNow()).id;
  for(const table of ['tasks','assessments'])for(const row of records[table].filter(r=>!r.deleted_at).sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
   const t=semester(row.date,preferences?.recordTerms?.[table]?.[row.id]),mod=row.module.toUpperCase();if(!t.mods.includes(mod))t.mods.push(mod);
   const id=++n;map.set(table+':'+id,copy(row));
   if(table==='tasks')t.tasks.push({id,mod,title:row.title,date:row.date,min:row.minutes??0,done:!!row.done,done_at:row.done_at??null,notes:row.notes||'',fix:preferences?.recordExtras?.tasks?.[row.id]?.fix===true});
   else t.assessments.push({id,mod,name:row.title,date:row.date,type:preferences?.recordExtras?.assessments?.[row.id]?.type||'Assessment',time:preferences?.recordExtras?.assessments?.[row.id]?.time||''});
  }
  return {map,snapshot:{years:years.sort((a,b)=>a.start-b.start),terms,active:current,current,studyYear:preferences?.studyYear||'Other',n:Math.max(n,preferences?.n||0),lastByYear:{},theme:null}};
 }
 function flatten(snapshot){const rows=new Map();for(const t of snapshot.terms)for(const table of ['tasks','assessments'])for(const r of t[table])rows.set(table+':'+r.id,{table,row:r,termId:t.id});return rows;}
 function fields(table,r){
  const doc={title:table==='tasks'?r.title:r.name,date:r.date,module:r.mod==='OTHER'?'Other':r.mod};
  if(table==='tasks')Object.assign(doc,{minutes:r.min,done:r.done,done_at:r.done_at??null,notes:r.notes||''});
  return doc;
 }
 function preferencesOf(snapshot,map){
  const payload=copy(snapshot);payload.active=payload.current;payload.theme=null;payload.lastByYear={};
  payload.recordTerms={tasks:{},assessments:{}};payload.recordExtras={tasks:{},assessments:{}};
  for(const [key,{table,row,termId}] of flatten(snapshot)){
   const saved=map.get(key);if(!saved)continue;
   payload.recordTerms[table][saved.id]=termId;
   payload.recordExtras[table][saved.id]=table==='tasks'?{fix:!!row.fix}:{type:row.type,time:row.time};
  }
  for(const t of payload.terms){t.tasks=[];t.assessments=[];}
  return payload;
 }
 class ProductionBridge{
  constructor(client,hooks){this.client=client;this.service=new PlannerDataService(client);this.preferences=new WorkspacePreferences(client,this.service);this.preferencesAvailable=false;this.preferencesRevision=0;this.hooks=hooks;this.owner=null;this.pending=0;this.blocked=false;this.loading=false;this.epoch=0;this.queue=Promise.resolve();this.map=new Map();}
  async open(user){const epoch=++this.epoch;this.owner=user.id;this.loading=true;this.blocked=false;this.hooks.loading();try{
   const [data,settings]=await Promise.all([this.service.load(user.id),this.preferences.load(user.id)]);if(this.epoch!==epoch)return;
   this.preferencesAvailable=settings.available;this.preferencesRevision=settings.revision;
   this.remoteRows=copy(data);const result=project(data,settings.payload);ReferenceLocalStore.validate(result.snapshot);this.map=result.map;this.base=result.snapshot;this.preferenceSignature=JSON.stringify(preferencesOf(this.base,this.map));this.loading=false;ReferenceCloud.user=user;this.hooks.loaded(copy(this.base),user);this.hooks.status('saved');
  }catch(e){if(epoch===this.epoch){this.loading=false;this.blocked=true;this.hooks.error(e);}}}
  changed(snapshot,forceMetadata=false){if(!this.owner||this.loading||this.blocked)return;
   const data=copy(snapshot),epoch=this.epoch,owner=this.owner;let coreWrites=0;this.pending++;
   this.queue=this.queue.then(async()=>{
    if(epoch!==this.epoch||this.blocked)return;
    ReferenceLocalStore.validate(data);
    const before=flatten(this.base),after=flatten(data),ops=[];
    for(const [key,{table,row}] of after){const old=before.get(key)?.row;if(!old||JSON.stringify(fields(table,row))!==JSON.stringify(fields(table,old)))ops.push({key,table,row});}
    for(const [key,{table,row}] of before)if(!after.has(key))ops.push({key,table,row,deleted:true});
    const metadataChanged=forceMetadata||JSON.stringify(preferencesOf(data,this.map))!==this.preferenceSignature;
    if(!ops.length&&(!metadataChanged||!this.preferencesAvailable))return;
    this.hooks.status('saving');
    for(const op of ops){
     if(epoch!==this.epoch)return;
     const old=this.map.get(op.key);let patch=op.deleted?{deleted_at:new Date().toISOString()}:fields(op.table,op.row);
     if(old&&!op.deleted){const previous=fields(op.table,before.get(op.key).row);patch=Object.fromEntries(Object.entries(patch).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(previous[k])));}
     const id=old?.id||crypto.randomUUID();
     const change=old?{kind:'update',table:op.table,id,expected:old.updated_at,base:old,patch}:{kind:'insert',table:op.table,id,doc:{id,user_id:owner,...patch,...(op.table==='tasks'?{source:'manual'}:{})}};
     const saved=await this.service.apply(owner,change);coreWrites++;if(epoch!==this.epoch)return;
     const rawRows=this.remoteRows[op.table],index=rawRows.findIndex(r=>r.id===saved.id);if(index<0)rawRows.push(copy(saved));else rawRows[index]=copy(saved);
     if(op.deleted)this.map.delete(op.key);else this.map.set(op.key,saved);
    }
    if(this.preferencesAvailable){
     const payload=preferencesOf(data,this.map),signature=JSON.stringify(payload);
     if(forceMetadata||signature!==this.preferenceSignature){this.preferencesRevision=await this.preferences.save(owner,this.preferencesRevision,payload);if(epoch!==this.epoch)return;this.preferenceSignature=signature;}
    }
    this.base=data;
   }).catch(e=>{if(epoch===this.epoch){this.blocked=true;this.hooks.error(coreWrites?new Error('Some task or assessment changes were saved. Export this tab and reload before retrying. '+e.message):e);}}).finally(()=>{this.pending--;if(epoch===this.epoch)this.hooks.status(this.blocked?'error':this.pending?'saving':'saved');});
  }
  async ensurePreferences(){
   if(!this.preferencesAvailable)throw Error('Private files require the production workspace storage setup.');
   if(this.blocked)throw Error('Resolve unsaved workspace changes before uploading.');
   if(this.preferencesRevision===0)this.changed(copy(this.base),true);
   await this.queue;if(this.blocked)throw Error('Workspace settings could not save. Reload before uploading.');
  }
  close(){globalThis.AcademicStopUpdates?.();globalThis.AcademicClearFilePreview?.();this.epoch++;this.owner=null;this.map.clear();ReferenceCloud.user=null;this.hooks.closed();}
 }
 ReferenceCloud.start=async function(hooks){this.hooks=hooks;try{
  const client=await this.client();this.bridge=new ProductionBridge(client,hooks);
  client.auth.onAuthStateChange((event,session)=>setTimeout(()=>{
   if(event==='PASSWORD_RECOVERY'){this.recovering=true;this.recoveryOwner=session?.user?.id;this.recoverySession={access_token:session?.access_token,refresh_token:session?.refresh_token};this.bridge.close();hooks.recovery();}
   else if(event==='SIGNED_OUT'){this.recovering=false;this.recoveryOwner=null;this.recoverySession=null;this.bridge.close();}
   else if(session?.user&&!this.recovering&&session.user.id!==this.bridge.owner)void this.bridge.open(session.user);
  },0));
  const {data:{session},error}=await client.auth.getSession();if(error)throw error;
  if(session?.user&&!this.recovering&&session.user.id!==this.bridge.owner)await this.bridge.open(session.user);else if(!session)hooks.signedOut();
 }catch(e){hooks.error(e);}};
 globalThis.ProductionWorkspace={project,flatten,fields,preferencesOf,ProductionBridge};
})();
