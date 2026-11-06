(function(root){
 function prepare(snapshot,type,id){
  const {years,terms}=snapshot;
  if(!['year','semester'].includes(type))throw Error('Choose an academic year or semester.');
  const item=(type==='year'?years:terms).find(x=>x.id===id&&!x.trashedAt);
  if(!item)throw Error('This workspace is no longer available.');
  const affected=type==='year'?terms.filter(t=>t.yearId===id&&!t.trashedAt):[item];
  const ids=new Set(affected.map(t=>t.id)),remaining=terms.filter(t=>!t.trashedAt&&!ids.has(t.id)&&!years.find(y=>y.id===t.yearId)?.trashedAt);
  if(!remaining.length)throw Error('Keep at least one semester. Create another semester before deleting this one.');
  const fallback=remaining.find(t=>t.id===snapshot.current)||remaining[0];
  return {item,affected,active:ids.has(snapshot.active)?fallback.id:snapshot.active,current:ids.has(snapshot.current)?fallback.id:snapshot.current};
 }
 function restore(years,terms,type,id){
  if(!['year','semester'].includes(type))throw Error('Choose an academic year or semester.');
  const item=(type==='year'?years:terms).find(x=>x.id===id&&x.trashedAt);
  if(!item)throw Error('This workspace is not in Trash.');
  const batch=item.trashBatch;delete item.trashedAt;delete item.trashBatch;
  if(type==='year'){for(const t of terms.filter(t=>t.yearId===id&&t.trashBatch===batch)){delete t.trashedAt;delete t.trashBatch;}}
  else{const year=years.find(y=>y.id===item.yearId);if(year){delete year.trashedAt;delete year.trashBatch;}}
 }
 root.WorkspaceTrash={prepare,restore};
})(globalThis);
