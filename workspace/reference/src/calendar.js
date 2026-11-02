(function(root){
 const escape=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const utc=(date,time)=>new Date(date+'T'+time+':00+08:00').toISOString().replace(/[-:]/g,'').replace('.000','');
 const stamp=()=>new Date().toISOString().replace(/[-:]/g,'').replace('.000','');
 function calendar(term,owner){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Academic Assistant//Study Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  function event(id,title,date,time,end,extra=[]){lines.push('BEGIN:VEVENT','UID:'+escape(owner+'-'+term.id+'-'+id)+'@academic-assistant','DTSTAMP:'+stamp(),'SUMMARY:'+escape(title),time?'DTSTART:'+utc(date,time):'DTSTART;VALUE=DATE:'+date.replace(/-/g,''),...(end?['DTEND:'+utc(date,end)]:[]),...extra,'END:VEVENT');}
  for(const task of term.tasks)event('task-'+task.id,task.mod+' · '+task.title,task.date,null,null,['DESCRIPTION:'+escape(task.min+' minutes planned · '+(task.done?'Completed':'Not completed'))]);
  for(const [i,a] of term.assessments.entries())event('assessment-'+(a.id||i),a.mod+' · '+a.name,a.date,a.time||null,null,['DESCRIPTION:'+escape(a.type)]);
  for(const [i,c] of term.timetable.entries()){
   let date=term.start;const weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(c.d);const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+(weekday-d.getUTCDay()+7)%7);date=d.toISOString().slice(0,10);if(date>term.end)continue;
   const [start,end]=c.range.split('–');event('class-'+(c.id||i),c.mod+' · '+c.kind,date,start,end,['LOCATION:'+escape(c.venue),'RRULE:FREQ=WEEKLY;UNTIL='+utc(term.end,'23:59')]);
  }
  lines.push('END:VCALENDAR');
  // RFC 5545: fold lines at 75 UTF-8 octets without splitting a character.
  return lines.map(line=>{let out='',part='',bytes=0;for(const ch of line){const size=new TextEncoder().encode(ch).length;if(bytes+size>75){out+=part+'\r\n';part=' ';bytes=1;}part+=ch;bytes+=size;}return out+part;}).join('\r\n')+'\r\n';
 }
 root.AcademicCalendar={calendar};
})(globalThis);
