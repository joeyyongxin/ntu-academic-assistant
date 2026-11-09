(function(root){
 const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 function parse(text){
  if(typeof text!=='string'||text.length>100000)throw Error('Use up to 100,000 characters.');
  const rows=[],unread=[];
  // OCR often splits a class into several lines. Join only within one module block;
  // never infer a missing weekday/time or merge two course codes.
  const lines=text.replace(/[−–—]/g,'-').replace(/\b([0-2]?\d)\s*[:.]\s*([0-5]\d)\b/g,'$1:$2').split(/\r?\n/).map(x=>x.trim()).filter(Boolean), organised=[];
  let pending=[];
  const flush=()=>{if(pending.length){organised.push(pending.join(' '));pending=[];}};
  for(const line of lines){
   if(/\b[A-Z]{2,4}\d{4}[A-Z]?\b/i.test(line)){flush();pending=[line];}
   else if(pending.length && pending.length<6)pending.push(line);
   else {flush();organised.push(line);}
   const joined=pending.join(' ');
   if(/\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?\b/i.test(joined)&&/\d(?:\d|:)\d\s*-\s*\d/.test(joined)&&/\b(?:lecture|tutorial|laboratory|lab|seminar|workshop|lec|tut)\b/i.test(joined))flush();
  }
  flush();
  for(const line of organised){
   if(/^module[,\t]/i.test(line))continue;
   const mod=line.match(/\b[A-Z]{2,4}\d{4}[A-Z]?\b/i),day=line.match(/\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i);
   const range=line.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*[-–—]\s*([01]?\d|2[0-3])[:.]([0-5]\d)\b/)||line.match(/\b([01]\d|2[0-3])([0-5]\d)\s*[-–—]\s*([01]\d|2[0-3])([0-5]\d)\b/);
   if(!mod||!day||!range){unread.push(line);continue;}
   const start=range[1].padStart(2,'0')+':'+range[2],end=range[3].padStart(2,'0')+':'+range[4];
   const tail=line.replace(mod[0],'').replace(day[0],'').replace(range[0],'').replace(/^[,\s]+|[,\s]+$/g,'');
   const parts=tail.split(/[,\t|]+/).map(x=>x.trim()).filter(Boolean);
   if(parts.length===1){const type=parts[0].match(/^(Lecture|Tutorial|Laboratory|Lab|Seminar|Workshop|Lec|Tut)\b\s*(.*)$/i);if(type&&type[2])parts.splice(0,1,type[1],type[2]);}
   rows.push({mod:mod[0].toUpperCase(),d:days.find(x=>x.toLowerCase()===day[0].slice(0,3).toLowerCase()),start,end,kind:parts[0]||'Lecture',venue:parts.slice(1).join(', ')});
   if(rows.length>200)throw Error('Import at most 200 classes at a time.');
  }
  return {rows,unread};
 }
 function validate(rows,modules,existing){
  if(!rows.length)throw Error('Add or extract at least one class.');
  const accepted=[],duplicates=[];
  for(const row of rows){
   if(!modules.includes(row.mod)||!days.includes(row.d)||!row.kind.trim()||row.kind.length>120||row.venue.length>500||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.end)||row.end<=row.start)throw Error('Check each module, day, class type and time range.');
   const item={mod:row.mod,d:row.d,kind:row.kind.trim(),venue:row.venue.trim(),at:Number(row.start.slice(0,2)),range:row.start+'–'+row.end};
   const all=[...existing,...accepted];
   if(all.some(x=>x.mod===item.mod&&x.d===item.d&&x.range===item.range&&x.kind===item.kind&&x.venue===item.venue)){duplicates.push(item);continue;}
   if(all.some(x=>x.d===item.d&&x.range.split('–')[0]<row.end&&x.range.split('–')[1]>row.start))throw Error('A class overlaps another class on '+item.d+'. Correct the preview before importing.');
   accepted.push(item);
  }
  return {accepted,duplicates};
 }
 let loader;
 async function recognize(file,progress){
  if(!['image/png','image/jpeg','image/webp'].includes(file?.type)||file.size>10*1024*1024)throw Error('Choose a PNG, JPG or WebP image up to 10 MB.');
  if(!root.Tesseract){
   if(!loader)loader=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>{script.remove();loader=null;reject(Error('Image reader could not load. Reconnect or paste the timetable text below.'));};document.head.append(script);});
   await loader;
  }
  let worker;
  try{worker=await root.Tesseract.createWorker('eng',1,{logger:m=>progress?.(m.status, m.progress)});return (await worker.recognize(file)).data.text;}
  finally{if(worker)await worker.terminate();}
 }
 root.TimetableImport={parse,validate,recognize};
})(globalThis);
