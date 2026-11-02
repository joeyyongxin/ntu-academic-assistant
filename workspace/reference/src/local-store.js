/* Local persistence only. This adapter never connects to a remote service. */
(function(root){
 const KEY='aa-reference-v29-workspace-v1';
 const copy=value=>JSON.parse(JSON.stringify(value));
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 const date=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 const words=(value,max=5000)=>typeof value==='string'&&value.length<=max;
 function validate(data){
  check(data&&Array.isArray(data.years)&&data.years.length>0&&data.years.length<=100,'Academic years are missing or invalid.');
  check(Array.isArray(data.terms)&&data.terms.length>0&&data.terms.length<=300,'Semester records are missing or invalid.');
  const years=new Set();for(const y of data.years){check(/^y\d+$/.test(y.id)&&!years.has(y.id)&&Number.isInteger(y.start)&&y.start>=2000&&y.start<=2098&&words(y.label,80),'Invalid academic year.');years.add(y.id);}
  check(new Set(data.years.map(y=>y.start)).size===data.years.length,'Duplicate academic years.');
  const ids=new Set(),taskIds=new Set();let count=0;
  for(const t of data.terms){
   check(/^s\d+$/.test(t.id)&&!ids.has(t.id)&&years.has(t.yearId)&&words(t.label,40)&&words(t.name,140),'Invalid semester identity.');ids.add(t.id);
   check(date(t.start)&&date(t.end)&&t.end>=t.start&&date(t.date)&&Number.isInteger(t.weeks)&&t.weeks>=1&&t.weeks<=52,'Invalid semester dates or teaching weeks.');
   check(Array.isArray(t.mods)&&t.mods.every(m=>typeof m==='string'&&/^[A-Z0-9_-]{2,16}$/.test(m))&&new Set(t.mods).size===t.mods.length,'Invalid module enrolments.');
   for(const key of ['tasks','classes','inbox','files','assessments','timetable','hub'])check(Array.isArray(t[key])&&t[key].length<=10000,'Invalid '+key+' collection.');
   count+=t.tasks.length+t.classes.length+t.inbox.length+t.files.length+t.assessments.length+t.timetable.length+t.hub.length;
   for(const x of t.tasks){check(Number.isSafeInteger(x.id)&&x.id>0&&!taskIds.has(x.id)&&t.mods.includes(x.mod)&&date(x.date)&&words(x.title,500)&&x.title.trim()&&Number.isInteger(x.min)&&x.min>=0&&x.min<=1440&&typeof x.done==='boolean','Invalid task record or semester assignment.');taskIds.add(x.id);}
   for(const f of t.files)check(Array.isArray(f)&&f.length>=5&&f.slice(0,5).every(x=>words(x))&&t.mods.includes(f[1]),'Invalid library record.');
   for(const a of t.assessments)check(t.mods.includes(a.mod)&&date(a.date)&&words(a.name,500)&&words(a.type,80)&&words(a.time,40),'Invalid assessment record.');
   for(const c of t.classes)check(Array.isArray(c)&&date(c[0])&&t.mods.includes(c[1])&&words(c[2],80)&&words(c[3],80),'Invalid planner class.');
   for(const c of t.timetable)check(t.mods.includes(c.mod)&&['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].includes(c.d)&&words(c.kind,120)&&words(c.range,80)&&words(c.venue,500),'Invalid timetable record.');
   check(t.topics&&typeof t.topics==='object'&&!Array.isArray(t.topics),'Invalid topic records.');for(const [module,topics] of Object.entries(t.topics)){check(t.mods.includes(module)&&Array.isArray(topics),'Invalid topic module.');for(const topic of topics)check(Array.isArray(topic)&&words(topic[0],500)&&[0,1,2,3].includes(topic[1])&&Number.isFinite(topic[2])&&topic[2]>=0,'Invalid topic progress.');}
   for(const p of t.inbox)check(Number.isSafeInteger(p.id)&&['p','a','r'].includes(p.s)&&(!p.mod||t.mods.includes(p.mod))&&(!p.title||words(p.title,500)),'Invalid Inbox record.');
   for(const h of t.hub)check(Number.isSafeInteger(h.id)&&t.mods.includes(h.mod)&&['ann','file','deadline'].includes(h.type)&&words(h.title,500)&&words(h.desc)&&words(h.date,80)&&words(h.origin,500)&&typeof h.unread==='boolean','Invalid course feed record.');
   if(t.messages)for(const m of t.messages)check(['me','bot'].includes(m.role)&&words(m.text,10000),'Invalid demo chat record.');
  }
  check(count<=50000,'Workspace is too large for this local development build.');
  check(ids.has(data.active)&&ids.has(data.current)&&['Year 1','Year 2','Year 3','Year 4','Year 5+','Postgraduate','Other'].includes(data.studyYear),'Invalid active semester or profile.');
  check(Number.isSafeInteger(data.n)&&data.n>=0,'Invalid task counter.');
  check(!data.theme||['light','dark'].includes(data.theme),'Invalid appearance preference.');
  if(data.lastByYear)for(const [year,id] of Object.entries(data.lastByYear))check(years.has(year)&&data.terms.some(t=>t.id===id&&t.yearId===year),'Invalid remembered semester.');
  return data;
 }
 class ConflictError extends Error{constructor(){super('Another tab saved newer changes. Export this tab’s work before reloading the saved workspace.');this.name='ConflictError';}}
 class Store{
  constructor(storage,key=KEY){this.storage=storage;this.key=key;}
  load(){const raw=this.storage.getItem(this.key);if(raw==null)return null;check(raw.length<=10000000,'Saved workspace exceeds the local size limit.');const envelope=JSON.parse(raw);check(envelope.schemaVersion===1&&Number.isSafeInteger(envelope.revision)&&envelope.revision>0,'Unsupported saved workspace.');validate(envelope.data);return copy(envelope);}
  save(data,expected){validate(data);const existing=this.load();if((existing?.revision||0)!==expected)throw new ConflictError();const next={schemaVersion:1,revision:expected+1,savedAt:new Date().toISOString(),data:copy(data)};const raw=JSON.stringify(next);check(raw.length<=10000000,'Workspace exceeds the local size limit. Export a backup.');this.storage.setItem(this.key,raw);return copy(next);}
 }
 root.ReferenceLocalStore={Store,ConflictError,validate,copy,KEY};
})(globalThis);
