(function(root){
 const copy=x=>JSON.parse(JSON.stringify(x));
 function take(term,kind,list,index,extra={}){if(!Number.isInteger(index)||index<0||index>=list.length)throw Error('This item is no longer available.');term.recordTrash??=[];const entry={id:crypto.randomUUID(),kind,row:copy(list[index]),index,at:new Date().toISOString(),...extra};list.splice(index,1);term.recordTrash.push(entry);return entry;}
 function restore(term,id,list){const entry=term.recordTrash?.find(x=>x.id===id);if(!entry)throw Error('This item is no longer in Trash.');if(entry.row?.id!=null&&list.some(x=>x.id===entry.row.id))throw Error('This item already exists.');list.splice(Math.min(entry.index,list.length),0,copy(entry.row));term.recordTrash=term.recordTrash.filter(x=>x.id!==id);return entry;}
 root.RecordTrash={take,restore};
})(globalThis);
