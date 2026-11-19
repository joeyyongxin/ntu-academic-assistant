// Optional Singapore-local times, separate from task date and actual timer minutes.
(function(root){
 const valid=v=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
 const minutes=v=>Number(v.slice(0,2))*60+Number(v.slice(3));
 function read(start='',end=''){
  if(!start&&!end)return {};
  if(!valid(start))throw Error('Choose a valid start time, or leave both times blank.');
  if(end&&!valid(end))throw Error('Choose a valid end time.');
  if(end&&end<=start)throw Error('End time must be later on the same day. Split overnight study into two tasks.');
  return {startTime:start,...(end?{endTime:end}:{})};
 }
 function stored(row){try{return read(row?.startTime||'',row?.endTime||'');}catch{return {};}}
 function compare(a,b){return String(a.date).localeCompare(String(b.date))||(stored(a).startTime||'99:99').localeCompare(stored(b).startTime||'99:99');}
 root.TaskTimes={valid,read,stored,compare,duration:(s,e)=>{read(s,e);return s&&e?minutes(e)-minutes(s):null;},label:row=>{const v=stored(row);return v.startTime?v.startTime+(v.endTime?' - '+v.endTime:''):'';}};
})(globalThis);
