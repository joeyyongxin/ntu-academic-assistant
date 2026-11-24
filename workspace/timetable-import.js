(function(root){
 const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 const dayPattern='mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?';
 const typePattern='Lecture|Tutorial|Laboratory|Lab|Seminar|Workshop|Lec|Tut';
 const timePattern='(?:[01]?\\d|2[0-3])[:.][0-5]\\d\\s*(?:[ap]\\.?m\\.?)?|\\d{3,4}|(?:1[0-2]|[1-9])\\s*[ap]\\.?m\\.?';
 const rangePattern='('+timePattern+')\\s*(?:[-–—]|to)\\s*('+timePattern+')';
 const dayOf=s=>days.find(d=>d.toLowerCase()===s.slice(0,3).toLowerCase());
 function time(s){
  let value=s.toLowerCase().replace(/[.](?=[apm]|$)/g,'').replace(/\s/g,'');const suffix=value.match(/([ap])m$/)?.[1];value=value.replace(/[ap]m$/,'');
  let h,m;if(/[:.]/.test(value)){[h,m]=value.split(/[:.]/).map(Number);}else if(suffix){h=Number(value);m=0;}else{value=value.padStart(4,'0');h=Number(value.slice(0,2));m=Number(value.slice(2));}
  if(suffix){if(h<1||h>12)return '';h=h%12+(suffix==='p'?12:0);}if(h>23||m>59)return '';
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
 }
 const moduleTokens=line=>[...line.matchAll(/\b([A-Z]{2,4})\s*\d{4}[A-Z]?\b/gi)].filter(m=>!/^(mon|tue|wed|thu|fri|sat|sun|lec|tut|lab)$/i.test(m[1]));
 function moduleFrom(line,modules=[]){
  const exact=moduleTokens(line)[0];if(exact)return {mod:exact[0].replace(/\s/g,'').toUpperCase(),token:exact[0]};
  const matches=[];
  for(const mod of modules){const pattern=mod.replace(/[01]/g,c=>c==='0'?'[0O]':'[1Il]');const match=line.match(new RegExp('\\b'+pattern+'\\b','i'));if(match)matches.push({mod,token:match[0],corrected:true});}
  return matches.length===1?matches[0]:null;
 }
 function partial(line,modules=[],columnDay){
  const module=moduleFrom(line,modules),dayMatches=[...line.matchAll(new RegExp('\\b('+dayPattern+')\\b','gi'))],rangeMatches=[...line.matchAll(new RegExp('\\b'+rangePattern+'\\b','gi'))],type=line.match(new RegExp('\\b('+typePattern+')\\b','i'));
  const foundDays=[...new Set(dayMatches.map(m=>dayOf(m[0])))];
  const issues=[];if(!module)issues.push('Module unreadable');if(new Set(moduleTokens(line).map(m=>m[0].replace(/\s/g,'').toUpperCase())).size>1)issues.push('Several module codes found');if(foundDays.length>1)issues.push('Several weekdays found');
  const d=foundDays.length===1?foundDays[0]:columnDay||'';if(!d)issues.push('Weekday unreadable');if(columnDay&&foundDays.length===1&&columnDay!==d)issues.push('Weekday conflicts with its column');
  const range=rangeMatches.length===1?rangeMatches[0]:null,start=range?time(range[1]):'',end=range?time(range[2]):'';
  if(!range||!start||!end||end<=start)issues.push(rangeMatches.length>1?'Several time ranges found':'Start/end time unreadable');
  if(!type)issues.push('Class type unreadable');
  if(/\b(?:odd|even)\s+weeks?\b|\b(?:wk|wks|weeks?)\s*\d/i.test(line))issues.push('Week-specific schedule: verify before adding a repeating weekly class');
  const aliases={lec:'Lecture',tut:'Tutorial',lab:'Lab',laboratory:'Lab'};
  const kind=type?(aliases[type[0].toLowerCase()]||type[0][0].toUpperCase()+type[0].slice(1).toLowerCase()):'';
  let tail=line;if(module)tail=tail.replace(module.token,'');for(const m of dayMatches)tail=tail.replace(m[0],'');if(range)tail=tail.replace(range[0],'');if(type)tail=tail.replace(type[0],'');
  let venue=tail.replace(/^[\s,|;]+|[\s,|;]+$/g,'').replace(/\s*[,|;]\s*/g,' ').trim();
  // A name/index before the weekday is not a venue. Prefer explicit text after the range/type.
  if(range){const after=line.slice(range.index+range[0].length).replace(new RegExp('\\b('+typePattern+'|'+dayPattern+')\\b','gi'),'').replace(/^[\s,|;]+|[\s,|;]+$/g,'').trim();if(after)venue=after;}
  return {mod:module?.mod||'',d,start,end,kind,venue,raw:line,issues,correction:module?.corrected?'Read '+module.token+' as enrolled module '+module.mod:''};
 }
 function parse(text,modules=[]){
  if(typeof text!=='string'||text.length>100000)throw Error('Use up to 100,000 characters.');
  const lines=text.replace(/[−–—]/g,'-').replace(/\b([0-2]?\d)\s*[:.]\s*([0-5]\d)\b/g,'$1:$2').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),organised=[];
  let pending=[];
  const flush=()=>{if(pending.length){organised.push(pending.join(' '));pending=[];}};
  for(const line of lines){
   if(moduleFrom(line,modules)){flush();pending=[line];}
   else if(pending.length&&pending.length<8)pending.push(line);
   else{flush();organised.push(line);}
   if(pending.length&&!partial(pending.join(' '),modules).issues.length)flush();
  }flush();
  const rows=[],unread=[],flagged=[];
  for(const line of organised){
   if(/^(?:module|course)(?:\s+code)?\s*[,\t|]/i.test(line))continue;
   const row=partial(line,modules);if(row.issues.length){unread.push(line);flagged.push(row);}else rows.push(row);
   if(rows.length+flagged.length>200)throw Error('Import at most 200 classes at a time.');
  }
  return {rows,unread,flagged,layout:'list'};
 }
 function wordsOf(data){
  const words=data.words||data.blocks?.flatMap(b=>b.paragraphs?.flatMap(p=>p.lines?.flatMap(l=>l.words||[])||[])||[])||data.lines?.flatMap(l=>l.words||[])||[];
  return words.filter(w=>w.text?.trim()&&w.bbox&&['x0','x1','y0','y1'].every(k=>Number.isFinite(w.bbox[k]))).map(w=>({...w,text:w.text.trim(),x:(w.bbox.x0+w.bbox.x1)/2,y:(w.bbox.y0+w.bbox.y1)/2}));
 }
 function lineText(words){
  const groups=[];
  for(const word of [...words].sort((a,b)=>a.y-b.y||a.x-b.x)){const height=word.bbox.y1-word.bbox.y0;const group=groups.find(g=>Math.abs(g.y-word.y)<=Math.max(5,Math.min(g.height,height)*.55));if(group){group.words.push(word);group.y=group.words.reduce((n,w)=>n+w.y,0)/group.words.length;}else groups.push({y:word.y,height,words:[word]});}
  return groups.sort((a,b)=>a.y-b.y).map(g=>g.words.sort((a,b)=>a.x-b.x).map(w=>w.text).join(' ')).join('\n');
 }
 function fromOcr(data,modules=[]){
  const words=wordsOf(data),headers=words.filter(w=>new RegExp('^('+dayPattern+')[.:]?$','i').test(w.text));
  // A weekly grid requires at least three distinct aligned weekday headings.
  let header=[];
  for(const word of headers){const peers=headers.filter(h=>Math.abs(h.y-word.y)<=Math.max(12,word.bbox.y1-word.bbox.y0)).sort((a,b)=>a.x-b.x);if(new Set(peers.map(h=>dayOf(h.text))).size===peers.length&&peers.length>=3&&peers.length>header.length)header=peers;}
  if(header.length){
   const rows=[],flagged=[],unread=[];
   for(let i=0;i<header.length;i++){
    const h=header[i],left=i?(header[i-1].x+h.x)/2:h.x-(header[1].x-h.x)/2,right=i<header.length-1?(h.x+header[i+1].x)/2:h.x+(h.x-header[i-1].x)/2;
    const column=words.filter(w=>w.x>left&&w.x<right&&w.bbox.y0>h.bbox.y1),seeds=column.filter(w=>moduleFrom(w.text,modules));
    for(const a of column.filter(w=>/^[A-Z]{2,4}$/i.test(w.text))){const b=column.find(w=>/^\d{4}[A-Z]?$/i.test(w.text)&&w.bbox.x0>=a.bbox.x1&&w.bbox.x0-a.bbox.x1<60&&Math.abs(w.y-a.y)<12);if(b&&moduleFrom(a.text+' '+b.text,modules))seeds.push(a);}
    seeds.sort((a,b)=>a.y-b.y);
    for(let j=0;j<seeds.length;j++){
     const seed=seeds[j],block=column.filter(w=>w.y>=seed.bbox.y0-3&&(!seeds[j+1]||w.y<seeds[j+1].bbox.y0-3));
     const row=partial(lineText(block).replace(/\n/g,' '),modules,dayOf(h.text));
     if(block.some(w=>Number.isFinite(w.confidence)&&w.confidence<55))row.correction=[row.correction,'Some image text has low confidence; verify against the image.'].filter(Boolean).join('. ');
     if(row.issues.length){flagged.push(row);unread.push(row.raw);}else rows.push(row);
    }
   }
   if(rows.length+flagged.length){if(rows.length+flagged.length>200)throw Error('Import at most 200 classes at a time.');return {rows,flagged,unread,layout:'weekly grid'};}
  }
  const organised=lineText(words),text=data.text||'';
  const fromWords=parse(organised||text,modules),fromText=parse(text,modules);
  return fromWords.rows.length>=fromText.rows.length?fromWords:fromText;
 }
 function validate(rows,modules,existing){
  if(!rows.length||rows.length>200)throw Error('Select between 1 and 200 classes.');
  const accepted=[],duplicates=[];
  for(const row of rows){
   if(!modules.includes(row.mod)||!days.includes(row.d)||typeof row.kind!=='string'||!row.kind.trim()||row.kind.length>120||typeof row.venue!=='string'||row.venue.length>500||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.end)||row.end<=row.start)throw Error('Check each module, day, class type and time range.');
   const item={mod:row.mod,d:row.d,kind:row.kind.trim(),venue:row.venue.trim(),at:Number(row.start.slice(0,2)),range:row.start+'–'+row.end};
   const all=[...existing,...accepted],canonical=s=>s.trim().replace(/\s+/g,' ').toLowerCase(),type=s=>canonical(s).replace(/^lec\b/,'lecture').replace(/^tut\b/,'tutorial').replace(/^laboratory\b/,'lab'),range=s=>s.replace(/[-—]/g,'–').replace(/\s/g,'');
   if(all.some(x=>x.mod===item.mod&&x.d===item.d&&range(x.range)===item.range&&type(x.kind)===type(item.kind)&&canonical(x.venue)===canonical(item.venue))){duplicates.push(item);continue;}
   if(all.some(x=>x.d===item.d&&range(x.range).split('–')[0]<row.end&&range(x.range).split('–')[1]>row.start))throw Error('A class overlaps another class on '+item.d+'. Correct the preview before importing.');
   accepted.push(item);
  }
  return {accepted,duplicates};
 }
 let loader;
 async function recognizeDetailed(file,progress,modules=[]){
  if(!['image/png','image/jpeg','image/webp'].includes(file?.type)||file.size>10*1024*1024)throw Error('Choose a PNG, JPG or WebP image up to 10 MB.');
  if(!root.Tesseract){
   if(!loader)loader=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>{script.remove();loader=null;reject(Error('Image reader could not load. Reconnect or paste the timetable text below.'));};document.head.append(script);});await loader;
  }
  let worker;
  try{
   worker=await root.Tesseract.createWorker('eng',1,{logger:m=>progress?.(m.status,m.progress)});
   // AUTO retains coordinates for both tables and text. No image is uploaded.
   await worker.setParameters?.({tessedit_pageseg_mode:3,preserve_interword_spaces:'1'});
   const data=(await worker.recognize(file,{}, {text:true,blocks:true})).data;
   const result=fromOcr(data,modules);return {...result,text:data.text||''};
  }finally{if(worker)await worker.terminate();}
 }
 async function recognize(file,progress){return (await recognizeDetailed(file,progress)).text;}
 root.TimetableImport={parse,validate,recognize,recognizeDetailed,fromOcr};
})(globalThis);
