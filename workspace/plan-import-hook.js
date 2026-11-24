// Explicit user-reviewed import, using the existing task change/save pipeline.
(() => {
 let sheet=null,draft=null,importBusy=false,openedContext=null;
 const context=()=>({id:active,start:term().start,end:term().end,mods:[...MODS],scope:WorkspaceProvider.scope()});
 const fingerprint=()=>JSON.stringify(context());
 const copy=x=>JSON.parse(JSON.stringify(x));
 const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 const message=text=>{const node=document.getElementById('planImportStatus');if(node)node.textContent=text;};
 const button=(text,fn,primary=false)=>{const node=el('button',text,'btn'+(primary?' p':''));node.type='button';node.onclick=fn;return node;};
 const describe=t=>t.date+' · '+t.mod+' · '+(TaskTimes.label(t)||'Flexible')+' · '+t.min+' min';
 window.openChatGPTPlanImport=function(){
  if(sheet?.isConnected){PlannerUI.Sheet.close(sheet);sheet.remove();}draft=null;openedContext=fingerprint();
  const card=el('section',undefined,'card plan-import-sheet');card.append(el('h2','Import a study plan'),el('p','Copy the prompt into ChatGPT with a new or revised plan. Paste its JSON reply, then review additions and changes. No plugin connection is needed.','sub'));
  const include=el('input');include.type='checkbox';include.id='planImportIncludeExisting';include.checked=true;
  const includeLabel=el('label',undefined,'plan-import-option');includeLabel.append(include,el('span','Include up to 100 unfinished tasks in the copied prompt, so ChatGPT can refer to tasks you want to change.'));
  const prompt=el('textarea');prompt.id='planImportPrompt';prompt.readOnly=true;prompt.setAttribute('aria-label','ChatGPT formatting prompt');prompt.rows=4;
  const refresh=()=>{if(openedContext!==fingerprint()){message('Account or semester changed. Reopen Import a plan.');return false;}prompt.value=PlanImport.prompt(context(),new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),include.checked?T:[]);return true;};refresh();include.onchange=refresh;
  card.append(includeLabel,prompt,button('Copy prompt',async()=>{if(!refresh())return;try{await navigator.clipboard.writeText(prompt.value);message('Prompt copied. Add your new or revised plan in ChatGPT.');}catch{prompt.focus();prompt.select();message('Copy the selected prompt manually.');}}));
  const label=el('label','Paste ChatGPT JSON reply'),input=el('textarea');input.id='planImportInput';input.rows=6;input.maxLength=200000;input.placeholder='{"format":"ntu-study-plan-v1","semesterId":"'+active+'","tasks":[...]}';input.oninput=()=>{draft=null;document.getElementById('planImportPreview').replaceChildren();message('Reply changed. Preview again before importing.');};label.append(input);card.append(label,button('Preview tasks',()=>window.previewChatGPTPlan(),true));
  const status=el('p','Nothing is saved until you apply. Unlisted and completed tasks are kept. Updates start unselected.','sub');status.id='planImportStatus';status.setAttribute('role','status');const preview=el('div');preview.id='planImportPreview';card.append(status,preview);
  sheet=PlannerUI.Sheet.create({key:'chatgpt-plan-import',content:card,title:'Import a study plan',open:true,trigger:document.activeElement,onClose:()=>{draft=null;}});
 };
 function renderRow(original){
  const line=el('div',undefined,'plan-import-row'),check=el('input');check.type='checkbox';check.dataset.planIndex=original.index;
  const body=el('div',undefined,'plan-import-body'),title=el('strong'),meta=el('p',undefined,'sub'),diff=el('p',undefined,'sub plan-import-diff');
  const checkId='plan-import-check-'+original.index;check.id=checkId;const label=el('label');label.htmlFor=checkId;label.append(title);body.append(label,meta,diff);line.append(check,body);
  const refresh=(row,selected=false)=>{
   draft.rows[row.index]=row;check.disabled=!!row.error||row.duplicate||row.kind==='ambiguous';check.checked=!check.disabled&&(selected||row.kind==='new');
   title.textContent=row.error?'Row '+(row.index+1):row.task.title;
   meta.textContent=row.error||describe(row.task)+(row.defaultMinutes?' (30 min default)':'');
   const names={date:'Date',mod:'Module',title:'Title',min:'Minutes',notes:'Notes',priority:'Priority',startTime:'Start',endTime:'End'};
   const value=(t,k)=>t[k]??(k==='priority'?'normal':'—');
   diff.textContent=row.kind==='update'?'Update existing task · '+row.changes.map(k=>names[k]+': '+value(row.before,k)+' → '+value(row.task,k)).join(' · '):row.kind==='new'?'New task':row.kind==='ambiguous'?'Several existing tasks match this title. Choose a task or add a separate session.':row.duplicate?(row.reason||'Already listed; skipped'):'Fix this row in the reply and preview again.';
   line.dataset.kind=row.kind;
  };
  refresh(original);
  if(original.candidates?.length){
   const choiceLabel=el('label','Action for this row'),choice=el('select');choice.setAttribute('aria-label','Action for '+original.task.title);choice.append(new Option('Choose an action',''),new Option('Add as a separate new task','new'));
   for(const t of original.candidates)choice.append(new Option('Update '+t.date+' · '+(TaskTimes.label(t)||'Flexible')+' · '+t.min+' min',String(t.id)));
   choice.value=original.before?String(original.before.id):'';
   choice.onchange=()=>{try{refresh(choice.value?PlanImport.resolve(original,choice.value,draft.existing):{...original,kind:'ambiguous',before:null},!!choice.value);}catch(e){message(e.message);}};
   choiceLabel.append(choice);body.append(choiceLabel);
  }
  return line;
 }
 window.previewChatGPTPlan=function(){
  const preview=document.getElementById('planImportPreview');preview.replaceChildren();draft=null;
  try{recordWritable();if(openedContext!==fingerprint())throw Error('Account or semester changed. Reopen Import a plan.');const source=document.getElementById('planImportInput').value,rows=PlanImport.parse(source,context(),T);draft={fingerprint:fingerprint(),source,rows,existing:copy(T)};
   rows.forEach(row=>preview.append(renderRow(row)));
   const updates=rows.filter(r=>['update','ambiguous'].includes(r.kind)).length;
   preview.append(button(updates?'Apply selected changes':'Add selected tasks',()=>window.commitChatGPTPlan(),true));
   message(rows.filter(r=>r.kind==='new').length+' new tasks available; '+rows.filter(r=>r.duplicate).length+' duplicates skipped; '+rows.filter(r=>r.error).length+' invalid rows excluded. '+updates+' possible updates to review. Unlisted tasks stay.');
  }catch(e){message(e.message);}
 };
 window.commitChatGPTPlan=function(){
  if(importBusy)return;
  try{
   recordWritable();if(!draft||draft.fingerprint!==fingerprint()||document.getElementById('planImportInput').value!==draft.source)throw Error('Account, semester or input changed. Preview again.');
   const selected=[...document.querySelectorAll('#planImportPreview input:checked')].map(node=>draft.rows[Number(node.dataset.planIndex)]).filter(r=>r&&!r.error&&!r.duplicate&&r.kind!=='ambiguous');
   if(!selected.length)throw Error('Select at least one new task or update.');
   const targetIds=new Set(),newSignatures=new Set();let additions=0;
   for(const row of selected){
    recordDate(row.task.date);
    if(row.before){const found=T.filter(t=>t.id===row.before.id);if(found.length!==1||!ChangePipeline.matches('tasks',found[0],row.before))throw Error('An existing task changed since preview. Preview again.');if(targetIds.has(row.before.id))throw Error('Two selected rows update the same task. Select one.');targetIds.add(row.before.id);}
    else{
     const key=PlanImport.signature(row.task);if(newSignatures.has(key)||T.some(t=>PlanImport.signature(t)===key))throw Error('A selected new task already exists. Preview again.');newSignatures.add(key);additions++;
    }
   }
   if(!Number.isSafeInteger(n+additions)||T.length+additions>10000)throw Error('This import would exceed the task limit.');
   const before=copy(T),counter=n,prefs=studyToolsPrefs(true),oldMoves=copy(prefs.moves||[]),applied=[];importBusy=true;
   try{
    for(const row of selected){const after=row.before?copy(row.task):{...row.task,id:++n,done:false,fix:false};applyOrPropose({source:'user',entity:'tasks',operation:row.before?'update':'insert',before:row.before||null,after});applied.push({before:row.before&&copy(row.before),after:copy(after)});}
   }catch(e){T=before;n=counter;prefs.moves=oldMoves;throw e;}
   const originalScope=fingerprint();draft=null;PlannerUI.Sheet.close(sheet);sheet.remove();sheet=null;go();
   PlannerUI.UndoToast.show(additions+' added, '+(selected.length-additions)+' updated. Check the saved status.',()=>{
    recordWritable();if(originalScope!==fingerprint())throw Error('Return to the original account and semester.');
    for(const change of applied){const found=T.filter(t=>t.id===change.after.id);if(found.length!==1||!ChangePipeline.matches('tasks',found[0],change.after))throw Error('An imported task changed afterward. Undo it individually.');}
    for(const change of applied)applyOrPropose({source:'user',entity:'tasks',operation:change.before?'update':'delete',before:change.after,after:change.before});go();
   });
  }catch(e){message(e.message);}finally{importBusy=false;}
 };
 const baseGo=go;go=function(){const result=baseGo.apply(this,arguments);if(!WorkspaceProvider.account||!['#today','#plan',''].includes(location.hash))return result;
  const heading=document.querySelector('#v h1');if(!heading)return result;const row=heading.closest('.headrow')||heading.parentElement;if(!row.querySelector('.chatgpt-plan-import-action')){const b=button('Import a plan',()=>window.openChatGPTPlanImport());b.classList.add('chatgpt-plan-import-action');row.append(b);}return result;};
 const style=el('style');style.textContent='.plan-import-sheet{width:min(780px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box}.plan-import-sheet>label{display:block;margin:14px 0}.plan-import-sheet textarea{display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--ln);border-radius:8px;background:var(--sf);color:var(--ink);font:13px/1.5 ui-monospace,monospace;resize:vertical}.plan-import-sheet .btn{margin:6px 6px 6px 0}.plan-import-sheet p{max-width:70ch}.plan-import-row,.plan-import-option{display:flex!important;gap:10px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--ln);overflow-wrap:anywhere}.plan-import-row>input,.plan-import-option>input{width:18px!important;height:18px!important;flex:0 0 18px;margin-top:2px}.plan-import-body{min-width:0;flex:1}.plan-import-body>label{display:block}.plan-import-body p{margin:5px 0;font-size:13px}.plan-import-body select{display:block;width:100%;max-width:100%;margin-top:5px}.plan-import-row[data-kind="duplicate"]{color:var(--mut)}.plan-import-diff{white-space:pre-wrap}';document.head.append(style);
})();
