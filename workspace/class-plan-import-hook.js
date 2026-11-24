// One review surface for images, class lists and formatted JSON. No backend calls.
(() => {
 let imageDraft=null,imageUrl=null,readToken=0;
 const fingerprint=()=>JSON.stringify([studyToolsScope(),MODS,term().start,term().end]);
 const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 const notice=text=>{const node=document.getElementById('classImportError');if(node)node.textContent=text;};
 function guard(){const form=document.getElementById('classImportForm');if(!form||form.dataset.scope!==studyToolsScope()||form.dataset.importFingerprint!==fingerprint())throw Error('Account or semester changed. Reopen Import classes.');return form;}
 function invalidate(){document.getElementById('classImportRows')?.replaceChildren();const save=document.getElementById('classImportSave');if(save)save.hidden=true;}
 const values=item=>Object.fromEntries(['module','day','start','end','kind','venue'].map(name=>[name,item.querySelector('[name='+name+']').value]));
 window.addImportClassRow=function(row={}){
  const host=document.getElementById('classImportRows');if(!host||host.children.length>=200)return;
  const item=el('div',undefined,'term-form class-import-row'),check=el('input');check.type='checkbox';check.name='include';check.checked=!row.issues?.length&&!row.correction;
  if(!Object.keys(row).length)check.checked=true;
  const include=el('label',undefined,'term-check wide');include.append(check,el('strong',row.mod||'Unrecognised class'),el('span',row.issues?.length||row.correction?'· Check before including':''));item.append(include);
  const fields=el('details',undefined,'class-import-fields wide'),summary=el('summary'),fieldGrid=el('div',undefined,'class-import-fields-grid');fields.open=!!row.issues?.length||!!row.correction||!MODS.includes(row.mod);fields.append(summary,fieldGrid);item.append(fields);
  const field=(name,label,type,value,options)=>{const wrap=el('label',label),input=el(options?'select':'input');input.name=name;if(options){input.append(new Option('Choose '+label.toLowerCase(),''));for(const opt of options)input.append(new Option(opt,opt));}else input.type=type;input.value=value||'';input.required=name!=='venue';if(name==='kind')input.maxLength=120;if(name==='venue')input.maxLength=500;wrap.append(input);fieldGrid.append(wrap);return input;};
  field('module','Module','',row.mod,MODS);field('day','Day','',row.d,['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);field('start','Start','time',row.start);field('end','End','time',row.end);field('kind','Class type','text',row.kind);field('venue','Venue','text',row.venue);
  const updateSummary=()=>{const v=values(item);summary.textContent=[v.day||'Day?',(v.start||'?')+'–'+(v.end||'?'),v.kind||'Class type?',v.venue].filter(Boolean).join(' · ');};updateSummary();fields.addEventListener('input',updateSummary);fields.addEventListener('change',updateSummary);
  if(row.issues?.length||row.correction){item.append(el('p',[...(row.issues||[]),row.correction].filter(Boolean).join(' · ')+'. Verify against the image/text, correct fields if needed, then tick to include.','sub wide class-import-issue'));}
  if(row.raw){const source=el('details',undefined,'wide class-import-source');source.append(el('summary','Extracted text'),el('p',row.raw,'sub'));item.append(source);}
  check.onchange=()=>{for(const input of item.querySelectorAll('input:not([name=include]),select'))input.required=check.checked&&input.name!=='venue';};check.onchange();
  // Excluded/uncertain rows remain editable, so checking a row never hides missing values.
  host.append(item);document.getElementById('classImportSave').hidden=false;
 };
 function render(result){
  invalidate();result.rows.forEach(window.addImportClassRow);(result.flagged||[]).forEach(window.addImportClassRow);
  notice(result.rows.length+' classes organised'+(result.layout?' from '+result.layout:'')+'; '+(result.flagged?.length||0)+' rows need checking. Review the selected rows, then Import. Existing classes are kept; duplicates and overlaps are checked again.');
 }
 window.previewClassImport=function(){
  try{guard();const input=document.getElementById('classImportText');if(/^(?:\{|```)/.test(input.value.trim())){const rows=ClassPlanImport.parse(input.value,active);render({rows,flagged:[]});}
   else render(imageDraft&&imageDraft.source===input.value&&imageDraft.fingerprint===fingerprint()?imageDraft.result:TimetableImport.parse(input.value,MODS));
  }catch(e){invalidate();notice(e.message);}
 };
 async function readImage(file,input){
  if(!file)return;const token=++readToken,initial=fingerprint(),status=document.getElementById('classImportStatus'),text=document.getElementById('classImportText');
  input.disabled=true;imageDraft=null;invalidate();const previous=document.getElementById('classImagePreview');if(previous){previous.replaceChildren();previous.hidden=true;}if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=null;}
  try{
   recordWritable();guard();status.textContent='Reading timetable image…';
   const result=await TimetableImport.recognizeDetailed(file,(name,value)=>{if(token===readToken&&status.isConnected)status.textContent=name+(Number.isFinite(value)?' '+Math.round(value*100)+'%':'');},[...MODS]);
   if(token!==readToken||initial!==fingerprint()||!text.isConnected)return;
   text.value=result.text;imageDraft={source:text.value,fingerprint:initial,result};
   if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(file);
   const preview=document.getElementById('classImagePreview');preview.replaceChildren();const img=el('img');img.src=imageUrl;img.alt='Uploaded timetable for verification';preview.append(el('summary','View original timetable'),img);preview.hidden=false;
   const manual=document.querySelector('.class-import-manual');if(manual)manual.open=false;
   render(result);status.textContent='Image read and organised. Verify the preview below; nothing has been saved.';
  }catch(e){if(token===readToken&&status.isConnected){status.textContent=e.message;notice('Nothing imported. You can retry the image or paste text / a ChatGPT-formatted timetable.');}}
  finally{input.disabled=false;input.value='';}
 }
 window.readTimetableImage=input=>readImage(input.files[0],input);
 window.saveClassImport=function(event){
  event.preventDefault();try{
   recordWritable();const form=guard(),rows=[...form.querySelectorAll('#classImportRows>.term-form')].filter(item=>item.querySelector('[name=include]').checked).map(item=>{const v=values(item);return {mod:v.module,d:v.day,start:v.start,end:v.end,kind:v.kind,venue:v.venue};});
   const result=TimetableImport.validate(rows,MODS,CL);CL.push(...result.accepted.map(row=>({...row,id:crypto.randomUUID()})));recordNotice=result.accepted.length+' classes imported; '+result.duplicates.length+' duplicates skipped.';go();
  }catch(e){notice(e.message);}
 };
 function decorate(){
  const input=document.getElementById('classImportText');if(!input||input.dataset.promptReady)return;
  input.dataset.promptReady='true';imageDraft=null;readToken++;if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=null;}
  const form=document.getElementById('classImportForm');form.dataset.importFingerprint=fingerprint();
  const label=input.closest('label')||input,box=el('div',undefined,'class-chatgpt-format'),help=el('p','Upload or drop a clear timetable image to fill the preview. If the layout is difficult to read, copy the prompt to ChatGPT with your image and paste its JSON reply here.','sub');
  const copy=el('button','Copy class prompt','btn');copy.type='button';copy.onclick=async()=>{const text=ClassPlanImport.prompt({id:active,mods:MODS});try{await navigator.clipboard.writeText(text);notice('Prompt copied. Send it with your timetable in ChatGPT.');}catch{let field=box.querySelector('textarea');if(!field){field=el('textarea');field.readOnly=true;field.setAttribute('aria-label','Class formatting prompt');box.append(field);}field.value=text;field.focus();field.select();notice('Copy the selected prompt manually.');}};box.append(help,copy);
  const hint=label.nextElementSibling,actions=hint?.nextElementSibling,manual=el('details',undefined,'class-import-manual');manual.open=true;manual.append(el('summary','Paste text or a ChatGPT reply'),box);label.before(manual);manual.append(label);if(hint?.matches('p'))manual.append(hint);if(actions?.matches('.import-actions'))manual.append(actions);manual.before(form);
  const image=document.querySelector('input[type=file][onchange="readTimetableImage(this)"]'),imageLabel=image?.closest('label');
  if(imageLabel){imageLabel.classList.add('class-image-drop');imageLabel.ondragover=event=>{event.preventDefault();};imageLabel.ondrop=event=>{event.preventDefault();if(!image.disabled)readImage(event.dataTransfer.files[0],image);};const preview=el('details');preview.id='classImagePreview';preview.hidden=true;imageLabel.after(preview);}
  input.addEventListener('input',()=>{readToken++;imageDraft=null;invalidate();notice('Input changed. Preview again before importing.');});
 }
 const base=go;go=function(){const result=base.apply(this,arguments);decorate();return result;};
 const style=el('style');style.textContent='.class-import-review{min-width:0}.class-import-row.term-form{display:block;padding:14px 0;border:0;border-bottom:1px solid var(--ln);border-radius:0;background:transparent}.class-import-fields-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding-top:10px}.class-import-fields>summary{grid-column:1/-1;font-size:13px;line-height:1.7;overflow-wrap:anywhere}.class-import-fields:not([open])>:not(summary){display:none}.class-import-fields-grid>label{min-width:0}.class-import-row input,.class-import-row select{max-width:100%;box-sizing:border-box}.class-import-row .term-check input{width:18px!important;height:18px!important;flex:0 0 18px}.class-import-row .term-check{display:flex;align-items:center;gap:8px;margin:0 0 7px}.class-import-row p{margin:7px 0;max-width:70ch;overflow-wrap:anywhere}.class-import-source{font-size:12px;color:var(--mut)}.class-image-drop{display:block;padding:12px;border:1px dashed var(--ln);border-radius:8px}.class-image-drop input{display:block;max-width:100%;margin-top:8px}#classImagePreview{margin:10px 0;color:var(--mut)}#classImagePreview img{display:block;width:100%;max-height:220px;object-fit:contain;margin:12px 0;background:var(--sf)}.class-chatgpt-format p{max-width:70ch}.class-chatgpt-format textarea{width:100%;box-sizing:border-box}.class-import-manual{margin-top:18px;padding-top:14px;border-top:1px solid var(--ln)}.class-import-manual>summary{cursor:pointer}.class-import-fields>summary{cursor:pointer} @media(max-width:800px){.class-import-fields-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.class-image-drop{padding:10px}}';document.head.append(style);
})();
