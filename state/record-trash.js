(function(root){
 const copy=x=>JSON.parse(JSON.stringify(x));
 const TASK_RETENTION_MS=7*24*60*60*1000;
 const expires=entry=>entry?.kind==='tasks'&&Number.isFinite(Date.parse(entry.at))?Date.parse(entry.at)+TASK_RETENTION_MS:null;
 const expired=(entry,now=Date.now())=>expires(entry)!==null&&now>=expires(entry);
 const remainingDays=(entry,now=Date.now())=>expires(entry)===null?null:Math.max(0,Math.ceil((expires(entry)-now)/(24*60*60*1000)));
 const list=(term,now=Date.now())=>(term.recordTrash||[]).filter(entry=>!expired(entry,now));
 function take(term,kind,list,index,extra={}){if(!Number.isInteger(index)||index<0||index>=list.length)throw Error('This item is no longer available.');term.recordTrash??=[];const entry={id:crypto.randomUUID(),kind,row:copy(list[index]),index,at:new Date().toISOString(),...extra};list.splice(index,1);term.recordTrash.push(entry);return entry;}
 function restore(term,id,list){const entry=term.recordTrash?.find(x=>x.id===id);if(!entry)throw Error('This item is no longer in Trash.');if(expired(entry))throw Error('The 7-day restore window has ended.');if(entry.row?.id!=null&&list.some(x=>x.id===entry.row.id))throw Error('This item already exists.');list.splice(Math.min(entry.index,list.length),0,copy(entry.row));term.recordTrash=term.recordTrash.filter(x=>x.id!==id);return entry;}
 function remove(term,id){const entry=term.recordTrash?.find(e=>e.id===id&&e.kind==='tasks');if(!entry)throw Error('This task is no longer in Trash.');term.recordTrash=term.recordTrash.filter(e=>e.id!==id);return entry;}
 root.RecordTrash={take,restore,remove,list,expires,expired,remainingDays,TASK_RETENTION_MS};
})(globalThis);
