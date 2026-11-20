// Task Trash is a 30-day restore window, not a database hard-delete job.
(() => {
 let sheet=null;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 window.openTaskTrash=function(){
  const owner=WorkspaceProvider.account?.id;if(!owner)return;
  if(sheet?.isConnected){PlannerUI.Sheet.close(sheet);sheet.remove();}
  const card=el('section',undefined,'card task-trash-sheet');card.append(el('h2','Task Trash'),el('p','Deleted tasks can be restored for 30 days from deletion. After that they disappear from this Trash and cannot be restored here.','sub'));
  const entries=WorkspaceProvider.settings.terms.flatMap(t=>RecordTrash.list(t).filter(e=>e.kind==='tasks').map(entry=>({term:t,entry}))).sort((a,b)=>String(b.entry.at).localeCompare(String(a.entry.at)));
  visibleIds=owner+':'+JSON.stringify(entries.map(x=>x.entry.id).sort());
  if(!entries.length)card.append(el('p','No tasks in Trash.','sub'));
  for(const {term:t,entry:e} of entries){const row=el('div',undefined,'task-trash-row'),body=el('div');body.append(el('b',e.row.title));const expiry=RecordTrash.expires(e),days=RecordTrash.remainingDays(e);body.append(el('small',e.row.mod+' | '+e.row.date+' | '+t.name),el('small',expiry===null?'Deletion date unavailable':days+' day'+(days===1?'':'s')+' left | until '+new Date(expiry).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})));
   const restore=el('button','Restore','btn');restore.type='button';restore.disabled=!!e.unavailable;restore.onclick=()=>{try{if(owner!==WorkspaceProvider.account?.id)throw Error('Sign in to the original account to restore this task.');window.restoreDeletedRecord(t.id,e.id,owner);window.openTaskTrash();PlannerUI.UndoToast.show('Task restored.');}catch(error){PlannerUI.UndoToast.show(error.message);}};row.append(body,restore);card.append(row);
  }
  sheet=PlannerUI.Sheet.create({key:'task-trash',content:card,title:'Task Trash',open:true,trigger:document.activeElement});
 };
 const base=settings;settings=function(){const t=document.createElement('template');t.innerHTML=base();const card=el('section',undefined,'card');card.append(el('h2','Task Trash'),el('p','Restore deleted tasks within 30 days.','sub'));const b=el('button','Open Task Trash','btn');b.type='button';b.setAttribute('onclick','openTaskTrash()');card.append(b);t.content.append(card);return t.innerHTML;};
 // Re-evaluate expiry while this sheet is open, without touching the database.
 let visibleIds='';setInterval(()=>{if(!sheet?.isConnected||!sheet.classList.contains('open'))return;if(!WorkspaceProvider.account){PlannerUI.Sheet.close(sheet);sheet.remove();sheet=null;return;}const ids=WorkspaceProvider.account.id+':'+JSON.stringify(WorkspaceProvider.settings.terms.flatMap(t=>RecordTrash.list(t).filter(e=>e.kind==='tasks').map(e=>e.id)).sort());if(visibleIds&&visibleIds!==ids)window.openTaskTrash();visibleIds=ids;},60000);
 const style=el('style');style.textContent='body.more-open #ui-toasts,html.mopen #ui-toasts{visibility:hidden}.task-trash-sheet{width:min(680px,100%);max-height:calc(100dvh - 32px);overflow:auto}.task-trash-sheet p{max-width:65ch}.task-trash-row{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--ln)}.task-trash-row>div{min-width:0;overflow-wrap:anywhere}.task-trash-row small{display:block;color:var(--mut);margin-top:5px}.task-trash-row .btn{flex-shrink:0}@media(max-width:480px){.task-trash-row{flex-wrap:wrap}}';document.head.append(style);
})();
