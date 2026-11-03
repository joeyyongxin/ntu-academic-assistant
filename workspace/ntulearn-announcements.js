(function(root){
 function parse(text){
  if(new TextEncoder().encode(text).length>5*1024*1024)throw Error('Choose an announcement export up to 5 MB.');
  let input;try{input=JSON.parse(text)}catch{throw Error('Choose a valid announcement JSON export.');}
  if(input?.format!=='academic-assistant-ntulearn-announcements'||input.schemaVersion!==1||!Array.isArray(input.items)||input.items.length>1000)throw Error('Unsupported NTULearn announcement export.');
  const seen=new Set(),items=[];let duplicates=0;
  for(const item of input.items){
   for(const [key,max] of [['id',200],['courseId',200],['courseName',500],['title',500],['text',20000]])if(typeof item[key]!=='string'||item[key].length>max||(['id','courseId','title'].includes(key)&&!item[key].trim()))throw Error('Invalid announcement '+key+'.');
   if(typeof item.created!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(item.created)||!Number.isFinite(Date.parse(item.created)))throw Error('An announcement has an invalid creation date.');
   const sourceDate=item.created.slice(0,10);if(new Date(sourceDate+'T00:00:00Z').toISOString().slice(0,10)!==sourceDate)throw Error('An announcement has an invalid calendar date.');
   const d=new Date(Date.parse(item.created)+8*3600000),date=d.toISOString().slice(0,10),sourceKey=JSON.stringify([item.courseId,item.id]);
   if(seen.has(sourceKey)){duplicates++;continue;}seen.add(sourceKey);
   items.push({title:item.title,text:item.text,date,courseName:item.courseName,sourceKey,suggestedModules:[...new Set((item.courseName+' '+item.title).match(/\b[A-Z]{2}\d{4}\b/g)||[])]});
  }
  return {items,duplicates};
 }
 root.NTULearnAnnouncements={parse};
})(globalThis);
