(function(root){
 const fields=['mod','type','title','desc','date','deadlineDate','url'];
 function fingerprint(row){return JSON.stringify(fields.map(key=>row[key]||''));}
 function validDate(value){return typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
 function parse(text){
  if(new TextEncoder().encode(text).length>4*1024*1024)throw Error('Connector snapshot exceeds 4 MB.');
  let data;try{data=JSON.parse(text);}catch{throw Error('Invalid connector snapshot.');}
  if(data?.format!=='academic-assistant-ntulearn-sync'||data.schemaVersion!==1||!Array.isArray(data.items)||data.items.length>2000||!Array.isArray(data.warnings)||data.warnings.length>100||!data.warnings.every(x=>typeof x==='string'&&x.length<=1000)||typeof data.exportedAt!=='string'||!Number.isFinite(Date.parse(data.exportedAt)))throw Error('Unsupported connector snapshot.');
  const seen=new Set(),items=[];let duplicates=0;
  for(const x of data.items){
   for(const [key,max] of [['id',200],['courseId',200],['courseName',500],['title',500],['text',20000],['url',2000]])if(typeof x[key]!=='string'||x[key].length>max||(['id','courseId','title'].includes(key)&&!x[key].trim()))throw Error('Invalid connector '+key+'.');
   if(!['ann','file','deadline'].includes(x.kind)||!validDate(x.date)||x.deadlineDate!==(x.kind==='deadline'?x.date:''))throw Error('Invalid connector item date or type.');
   let url;try{url=new URL(x.url);}catch{throw Error('Invalid source link.');}
   if(url.origin!=='https://ntulearn.ntu.edu.sg'||url.username||url.password)throw Error('Unexpected source link destination.');
   const sourceKey=JSON.stringify([x.courseId,x.kind,x.id]);if(seen.has(sourceKey)){duplicates++;continue;}seen.add(sourceKey);
   items.push({...x,sourceKey,suggestedModules:[...new Set((x.courseName+' '+x.title).match(/\b[A-Z]{2}\d{4}\b/g)||[])]});
  }return {items,warnings:data.warnings,exportedAt:data.exportedAt,duplicates};
 }
 function row(item,module,previous){
  return {mod:module,type:item.kind,title:item.title,desc:item.text.length>5000?item.text.slice(0,4950)+'\n[Shortened: see original NTULearn item.]':item.text,date:item.dateEstimated&&previous?previous.date:item.date,deadlineDate:item.deadlineDate,url:item.url};
 }
 function find(rows,item){return rows.find(x=>x.ntulearnSyncKey===item.sourceKey||(item.kind==='ann'&&x.announcementSourceKey===JSON.stringify([item.courseId,item.id])));}
 function classify(rows,item,module){const old=find(rows,item);if(!old)return 'new';if(!old.ntulearnSyncBaseline||old.ntulearnSyncBaseline!==fingerprint(old))return 'personal edit kept';return fingerprint(row(item,module||old.mod,old))===old.ntulearnSyncBaseline?'unchanged':'source changed';}
 function automatic(rows,parsed,mods,start,end,mapping){
  const changes=[];let protectedCount=0,unmapped=0;
  for(const item of parsed.items){if(item.date<start||item.date>end)continue;
   const module=Object.prototype.hasOwnProperty.call(mapping,item.courseId)?mapping[item.courseId]:'';
   if(!mods.includes(module)){unmapped++;continue;}
   const mode=classify(rows,item,module);if(mode==='personal edit kept'){protectedCount++;continue;}if(mode==='unchanged')continue;
   changes.push({item,module,old:find(rows,item)});
  }return {changes,protectedCount,unmapped};
 }
 root.NTULearnSync={parse,fingerprint,row,find,classify,automatic};
})(globalThis);
