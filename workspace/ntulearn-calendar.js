// Read-only parsing. No feed URL, credential, network access or database writes.
(function(root){
 'use strict';
 const unescape=s=>String(s||'').replace(/\\([nN,;\\])/g,(_,c)=>/[nN]/.test(c)?'\n':c);
 function dateValue(property){
  const m=property.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if(!m)throw Error('Unsupported event date.');
  const date=m[1]+'-'+m[2]+'-'+m[3];
  if(new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid event date.');
  if(!m[4])return {date,time:'',allDay:true};
  if(+m[4]>23||+m[5]>59||+m[6]>59)throw Error('Invalid event time.');
  const zone=property.params.TZID;
  if(zone&&!['Asia/Singapore','UTC','Etc/UTC'].includes(zone))throw Error('Unsupported timezone: '+zone);
  const utc=m[7]||zone==='UTC'||zone==='Etc/UTC';
  if(utc){const d=new Date(date+'T'+m[4]+':'+m[5]+':'+m[6]+'Z');d.setUTCHours(d.getUTCHours()+8);return {date:d.toISOString().slice(0,10),time:d.toISOString().slice(11,16),allDay:false};}
  return {date,time:m[4]+':'+m[5],allDay:false,floating:!zone};
 }
 function parse(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>5*1024*1024)throw Error('Choose a calendar file up to 5 MB.');
  const lines=text.replace(/^\uFEFF/,'').replace(/\r?\n[ \t]/g,'').split(/\r?\n/);
  if(!lines.includes('BEGIN:VCALENDAR')||!lines.includes('END:VCALENDAR'))throw Error('This is not an iCalendar file.');
  const events=[],warnings=[];let event=null,depth=0,count=0;
  for(const line of lines){
   if(line==='BEGIN:VEVENT'){if(event)throw Error('Invalid nested event.');event={};depth=0;continue;}
   if(!event)continue;
   if(line==='END:VEVENT'){
    if(++count>2000)throw Error('Calendar exceeds 2,000 events.');
    try{
     if(event.RRULE||event['RECURRENCE-ID'])throw Error('Recurring events require separate review and were skipped.');
     if(event.STATUS?.value==='CANCELLED')throw Error('Cancelled event skipped.');
     if(!event.UID?.value||!event.DTSTART||!event.SUMMARY?.value)throw Error('Event is missing its ID, title or start date.');
     const title=unescape(event.SUMMARY.value).trim();if(title.length>500)throw Error('Event title is too long.');
     const when=dateValue(event.DTSTART),description=unescape(event.DESCRIPTION?.value).slice(0,4000),uid=event.UID.value;
     if(uid.length>1000)throw Error('Event ID is too long.');
     const suggestedModules=[...new Set((title+' '+description).match(/\b[A-Z]{2}\d{4}\b/g)||[])];
     events.push({uid,title,description,...when,suggestedModules});
    }catch(e){warnings.push(e.message);}
    event=null;continue;
   }
   if(line.startsWith('BEGIN:')){depth++;continue;}if(line.startsWith('END:')){depth--;continue;}if(depth)continue;
   const colon=line.indexOf(':');if(colon<1)continue;const parts=line.slice(0,colon).split(';'),key=parts.shift().toUpperCase(),params={};for(const part of parts){const n=part.indexOf('=');if(n>0)params[part.slice(0,n).toUpperCase()]=part.slice(n+1).replace(/^"|"$/g,'');}event[key]={params,value:line.slice(colon+1)};
  }
  if(event)throw Error('Calendar has an unfinished event.');
  return {events,warnings};
 }
 const key=e=>JSON.stringify([e.uid,e.date,e.time||'']);
 root.NTULearnCalendar={parse,key};
})(globalThis);
