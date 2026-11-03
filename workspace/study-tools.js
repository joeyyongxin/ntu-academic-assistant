(function(root){
 const DAY=86400000;
 function date(value){return typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
 function weekly(rule,term){
  if(!date(rule.start)||!date(rule.end)||rule.start<term.start||rule.end>term.end||rule.end<rule.start)throw Error('Choose a date range inside this semester.');
  if(!Array.isArray(rule.days)||!rule.days.length||rule.days.some(x=>!Number.isInteger(x)||x<0||x>6)||!Number.isInteger(rule.interval)||rule.interval<1||rule.interval>8)throw Error('Choose weekdays and repeat every 1–8 weeks.');
  const start=Date.parse(rule.start+'T00:00:00Z'),end=Date.parse(rule.end+'T00:00:00Z'),monday=start-((new Date(start).getUTCDay()+6)%7)*DAY,dates=[];
  for(let day=start;day<=end;day+=DAY){const weekday=(new Date(day).getUTCDay()+6)%7;if(Math.floor((day-monday)/(7*DAY))%rule.interval===0&&rule.days.includes(weekday))dates.push(new Date(day).toISOString().slice(0,10));if(dates.length>300)throw Error('Limit each recurring schedule to 300 tasks.');}
  if(!dates.length)throw Error('No selected weekdays fall in this date range.');return dates;
 }
 function deadline(dateValue,time,fallback='09:00'){
  if(!date(dateValue))return null;if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;const clock=time||fallback;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))return null;
  return Date.parse(dateValue+'T'+clock+':00+08:00');
 }
 function dueReminders(events,offsets,now,sent={}){
  if(!Array.isArray(offsets)||offsets.some(x=>!Number.isInteger(x)||x<0||x>43200))throw Error('Reminder lead times must be 0–43,200 minutes.');
  const due=[],seen=new Set();for(const event of events){if(!Number.isFinite(event.at)||event.at<now-3600000)continue;
   for(const minutes of [...new Set(offsets)]){const at=event.at-minutes*60000,key=JSON.stringify([event.id,event.at,minutes]);if(seen.has(key)||sent[key]||now<at||now-at>DAY)continue;seen.add(key);due.push({...event,key,leadMinutes:minutes,remindAt:at});}
  }return due.sort((a,b)=>b.remindAt-a.remindAt);
 }
 function gradeTotals(entries){
  let allocated=0,scored=0,earned=0;
  for(const x of entries){const weight=Number(x.weight);if(x.weight==null||x.weight===''||!Number.isFinite(weight)||weight<0||weight>100)throw Error('Assessment weights must be between 0 and 100%.');allocated+=weight;
   if(x.score===''||x.score==null)continue;const score=Number(x.score),max=Number(x.max);if(!Number.isFinite(score)||!Number.isFinite(max)||max<=0||score<0||score>max)throw Error('Enter a score between zero and its maximum.');scored+=weight;earned+=weight*score/max;
  }
  if(allocated>100.000001)throw Error('The module’s assessment weights exceed 100%.');
  return {allocated,scored,earned,unassigned:Math.max(0,100-allocated),unscored:Math.max(0,100-scored),average:scored?earned/scored*100:null};
 }
 function elapsed(timer,now){const duration=Math.max(0,Number(timer?.elapsedMs)||0)+(timer?.running?Math.max(0,now-timer.startedAt):0);return Math.min(duration,24*3600000);}
 function searchPages(index,query,module=''){
  const codes=query.toUpperCase().match(/\b[A-Z]{2}\d{4}\b/g)||[],selectedModule=module||(codes.length===1?codes[0]:'');
  const stop=new Set(['when','is','the','what','for','please','tell','me','about','my','are']);
  const terms=(query.toLowerCase().replace(/\b[a-z]{2}\d{4}\b/g,'').match(/[\p{L}\p{N}]+/gu)||[]).filter(x=>(x.length>1||/^\d+$/.test(x))&&!stop.has(x));if(!terms.length&&!selectedModule)return [];
  const results=[];for(const doc of index){if(selectedModule&&doc.module!==selectedModule)continue;for(const page of doc.pages||[]){const lower=page.text.toLowerCase();if(!terms.every(t=>lower.includes(t)))continue;const first=terms.length?Math.min(...terms.map(t=>lower.indexOf(t))):0;results.push({id:doc.assetId,name:doc.name,module:doc.module,page:page.number,text:page.text.slice(Math.max(0,first-90),Math.min(page.text.length,first+300))});if(results.length>=50)return results;}}return results;
 }
 root.StudyTools={date,weekly,deadline,dueReminders,gradeTotals,elapsed,searchPages};
})(globalThis);
