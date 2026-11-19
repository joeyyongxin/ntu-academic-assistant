// Import is an explicit user-reviewed creation flow, never an autonomous ChatGPT write.
(() => {
 let sheet=null,draft=null,importBusy=false;
 const scope=()=>WorkspaceProvider.scope();
 const context=()=>({id:active,start:term().start,end:term().end,mods:[...MODS]});
 const fingerprint=()=>JSON.stringify([scope(),context()]);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const message=text=>{const n=document.getElementById('planImportStatus');if(n)n.textContent=text;};
 const button=(text,fn,primary=false)=>{const n=el('button',text,'btn'+(primary?' p':''));n.type='button';n.onclick=fn;return n;};
 window.openChatGPTPlanImport=function(){
  if(sheet?.isConnected){PlannerUI.Sheet.close(sheet);sheet.remove();}draft=null;
  const card=el('section',undefined,'card plan-import-sheet');card.append(el('h2','Import a ChatGPT plan'),el('p','Copy the format prompt into ChatGPT with your study plan. Paste its JSON reply below, preview, then choose tasks to add. No plugin connection is needed.','sub'));
  const prompt=el('textarea');prompt.id='planImportPrompt';prompt.readOnly=true;prompt.value=PlanImport.prompt(context(),new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));prompt.setAttribute('aria-label','ChatGPT formatting prompt');prompt.rows=5;
  card.append(prompt,button('Copy prompt',async()=>{try{await navigator.clipboard.writeText(prompt.value);message('Prompt copied. Add your study plan in ChatGPT.');}catch{prompt.focus();prompt.select();message('Copy the selected prompt manually.');}}));
  const label=el('label','Paste ChatGPT JSON reply'),input=el('textarea');input.id='planImportInput';input.rows=8;input.maxLength=200000;input.placeholder='{"format":"ntu-study-plan-v1","semesterId":"'+active+'","tasks":[...]}';input.oninput=()=>{draft=null;document.getElementById('planImportPreview').replaceChildren();message('Reply changed. Preview again before importing.');};label.append(input);card.append(label,button('Preview tasks',()=>window.previewChatGPTPlan(),true));
  const status=el('p','No tasks added yet. Existing tasks are never edited or removed by this import.','sub');status.id='planImportStatus';status.setAttribute('role','status');const preview=el('div');preview.id='planImportPreview';card.append(status,preview);
  sheet=PlannerUI.Sheet.create({key:'chatgpt-plan-import',content:card,title:'Import a ChatGPT plan',open:true,trigger:document.activeElement,onClose:()=>{draft=null;}});
 };
 window.previewChatGPTPlan=function(){
  const preview=document.getElementById('planImportPreview');preview.replaceChildren();draft=null;
  try{recordWritable();const source=document.getElementById('planImportInput').value,rows=PlanImport.parse(source,context(),T);draft={fingerprint:fingerprint(),source,rows};
   for(const row of rows){const line=el('label',undefined,'plan-import-row'),check=el('input');check.type='checkbox';check.dataset.planIndex=row.index;check.disabled=!!row.error||row.duplicate;check.checked=!check.disabled;
    const text=row.error?'Row '+(row.index+1)+': '+row.error:row.task.date+' | '+row.task.mod+' | '+row.task.title+' | '+(TaskTimes.label(row.task)||'Flexible')+' | '+row.task.min+' min'+(row.defaultMinutes?' (default)':'')+(row.duplicate?' | Already listed; skipped':'');
    line.append(check,el('span',text));preview.append(line);
   }
   preview.append(button('Add selected tasks',()=>window.commitChatGPTPlan(),true));message(rows.filter(r=>!r.error&&!r.duplicate).length+' new tasks available; '+rows.filter(r=>r.duplicate).length+' duplicates skipped; '+rows.filter(r=>r.error).length+' invalid rows excluded. Review selection before adding.');
  }catch(e){message(e.message);}
 };
 window.commitChatGPTPlan=function(){
  if(importBusy)return;
  try{recordWritable();if(!draft||draft.fingerprint!==fingerprint()||document.getElementById('planImportInput').value!==draft.source)throw Error('Account, semester or input changed. Preview again.');
   const selected=[...document.querySelectorAll('#planImportPreview input:checked')].map(n=>draft.rows[Number(n.dataset.planIndex)]).filter(r=>r&&!r.error&&!r.duplicate);
   if(!selected.length)throw Error('Select at least one valid new task.');
   const fresh=PlanImport.parse(draft.source,context(),T),indexes=new Set(selected.map(r=>r.index)),rows=fresh.filter(r=>indexes.has(r.index)&&r.task&&!r.error&&!r.duplicate);
   if(!rows.length)throw Error('These tasks already exist. Preview again.');if(!Number.isSafeInteger(n+rows.length))throw Error('Task IDs are out of range. Reload your workspace before importing.');if(T.length+rows.length>10000)throw Error('This semester would exceed the task limit.');
   for(const {task} of rows)recordDate(task.date);
   const before=T.slice(),counter=n;importBusy=true;
   try{for(const {task} of rows)applyOrPropose({source:'user',entity:'tasks',operation:'insert',before:null,after:{...task,id:++n,done:false,fix:false}});}catch(e){T=before;n=counter;throw e;}
   draft=null;PlannerUI.Sheet.close(sheet);sheet.remove();sheet=null;go();PlannerUI.UndoToast.show(rows.length+' tasks added. Check the saved status before closing the app.');
  }catch(e){message(e.message);}finally{importBusy=false;}
 };
 const baseGo=go;go=function(){const result=baseGo.apply(this,arguments);if(!WorkspaceProvider.account)return result;if(!['#today','#plan',''].includes(location.hash))return result;
  const heading=document.querySelector('#v h1');if(!heading)return result;const row=heading.closest('.headrow')||heading.parentElement;if(!row.querySelector('.chatgpt-plan-import-action')){const b=button('Import a plan',()=>window.openChatGPTPlanImport());b.classList.add('chatgpt-plan-import-action');row.append(b);}return result;};
 const style=el('style');style.textContent='.plan-import-sheet{width:min(760px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box}.plan-import-sheet>label{display:block;margin:14px 0}.plan-import-sheet textarea{display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--ln);border-radius:8px;background:var(--sf);color:var(--ink);font:13px/1.5 ui-monospace,monospace;resize:vertical}.plan-import-sheet .btn{margin:6px 6px 6px 0}.plan-import-sheet p{max-width:70ch}.plan-import-row{display:flex!important;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--ln);overflow-wrap:anywhere}.plan-import-row input{width:18px!important;height:18px!important;flex:0 0 18px;margin-top:2px}.plan-import-row span{min-width:0}';document.head.append(style);
})();
