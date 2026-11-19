// Copy/paste plans only. No AI requests, credentials, network calls or writes.
(function(root){
 const format='ntu-study-plan-v1';
 const allowed=['date','module','title','minutes','startTime','endTime','notes','priority'];
 const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const signature=t=>JSON.stringify([t.date,(t.module||t.mod||'').toUpperCase(),t.title.trim().replace(/\s+/g,' ').toLowerCase(),t.startTime||'',t.endTime||'']);
 function parse(source,context,existing=[]){
  if(typeof source!=='string'||source.length>200000)throw Error('Paste at most 200,000 characters.');
  let raw=source.trim();if(raw.startsWith('```')){const m=raw.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);if(!m)throw Error('Paste only the JSON block, without surrounding commentary.');raw=m[1];}
  let data;try{data=JSON.parse(raw);}catch{throw Error('Invalid JSON. Ask ChatGPT to return only the requested JSON format.');}
  if(!data||Array.isArray(data)||typeof data!=='object'||Object.keys(data).some(k=>!['format','semesterId','tasks'].includes(k))||data.format!==format)throw Error('Use the ntu-study-plan-v1 format from Copy prompt.');
  if(data.semesterId!==context.id)throw Error('This plan is for another semester. Copy a fresh prompt for the selected semester.');
  if(!Array.isArray(data.tasks)||!data.tasks.length||data.tasks.length>100)throw Error('Include between 1 and 100 tasks per import.');
  const seen=new Set(existing.map(signature));
  return data.tasks.map((row,index)=>{
   try{
    if(!row||Array.isArray(row)||typeof row!=='object'||Object.keys(row).some(k=>!allowed.includes(k)))throw Error('Task has unsupported fields.');
    if(!date(row.date)||row.date<context.start||row.date>context.end)throw Error('Date must be valid and inside the selected semester.');
    if(typeof row.module!=='string'||!context.mods.includes(row.module.toUpperCase()))throw Error('Choose an enrolled module from the prompt.');
    if(!text(row.title,500))throw Error('Task title is required (up to 500 characters).');
    if(row.notes!==undefined&&(typeof row.notes!=='string'||row.notes.length>5000))throw Error('Notes must be text, up to 5000 characters.');
    if(row.priority!==undefined&&!['low','normal','high'].includes(row.priority))throw Error('Priority must be low, normal or high.');
    if(row.startTime!==undefined&&typeof row.startTime!=='string'||row.endTime!==undefined&&typeof row.endTime!=='string')throw Error('Times must be HH:mm strings.');
    const time=root.TaskTimes.read(row.startTime||'',row.endTime||'');
    let min=row.minutes===undefined?30:row.minutes;if(!Number.isInteger(min)||min<1||min>1440)throw Error('Minutes must be a whole number from 1 to 1440.');
    if(time.endTime)min=root.TaskTimes.duration(time.startTime,time.endTime);
    const task={date:row.date,mod:row.module.toUpperCase(),title:row.title.trim(),min,notes:row.notes||'',priority:row.priority||'normal',...time};
    const key=signature(task),duplicate=seen.has(key);seen.add(key);
    return {index,task,duplicate,defaultMinutes:row.minutes===undefined&&!time.endTime};
   }catch(e){return {index,error:e.message};}
  });
 }
 function prompt(context,today){
  return 'Convert my study plan into JSON for my planner. Do not call any plugin or change records. Return only JSON, no markdown or commentary.\n'+
  'Format: '+format+'. Semester ID: '+context.id+'. Semester dates: '+context.start+' to '+context.end+'. Enrolled modules: '+context.mods.join(', ')+'. Today in Singapore: '+today+'.\n'+
  'Ask me to clarify missing or ambiguous dates, modules or task titles before producing JSON. Resolve dates using Singapore calendar dates (YYYY-MM-DD), not UTC. Preserve supplied times in 24-hour HH:mm. Omit startTime/endTime for flexible tasks; never invent times. End time must be later on the same date; split overnight sessions across dates. Keep each timed study/correction block as a separate task and give repeated titles enough context to distinguish their paper/topic. Do not add breaks/meals unless I request them. Do not claim the plan is saved. Maximum 100 tasks.\n'+
  'Required task fields: date, module, title. Optional: minutes (integer 1-1440), startTime, endTime, notes, priority (low/normal/high). End minus start determines duration when both are supplied. Otherwise omit minutes if unknown; the app visibly defaults it to 30 for my review. No task IDs, completion flags, credentials, files, deletion or edit instructions.\n'+
  'Use this exact envelope with your converted tasks: '+JSON.stringify({format,semesterId:context.id,tasks:[]})+'\n\nMy study plan:\n[Paste my plan here]';
 }
 root.PlanImport={parse,prompt,signature};
})(globalThis);
