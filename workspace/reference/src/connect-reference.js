// Injected INSIDE the original v2.9 semester closure. Renderers and CSS are retained.
const localAPI=globalThis.ReferenceLocalStore;
let localRevision=0,localSignature='',localBlocked=false,localError='',localPending=0;
let localQueue=Promise.resolve(),localStore;
const previewNote=document.querySelector('.preview-note');
const localCapture=capture;
capture=function(){localCapture();term().messages=clone(hubMessages);};
const referenceLoad=load;
load=function(id){referenceLoad(id);if(term().messages)hubMessages=clone(term().messages);};
function hydrateReference(data){
 years.splice(0,years.length,...data.years);terms.splice(0,terms.length,...data.terms);
 active=data.active;current=data.current;studyYear=data.studyYear;n=data.n;
 Object.keys(lastByYear).forEach(key=>delete lastByYear[key]);Object.assign(lastByYear,data.lastByYear||{});
 const t=term();TODAY=t.date;MODS=t.mods;T=t.tasks;C=t.classes;TP=t.topics;IN=t.inbox;F=t.files;AS=t.assessments;CL=t.timetable;HUB=t.hub;imported=!!t.imported;
 if(t.messages)hubMessages=clone(t.messages);
 for(const item of terms)for(const task of item.tasks)n=Math.max(n,task.id);
 if(data.theme)document.documentElement.dataset.theme=data.theme;
 mod=null;q='';fm='';filePreview='';hubTab='all';hubMod='all';
}
function referenceSnapshot(){capture();return clone({years,terms,active,current,studyYear,n,lastByYear,theme:document.documentElement.dataset.theme||null});}
function localStatus(label,bad=false){
 if(!previewNote)return;previewNote.setAttribute('role','status');previewNote.setAttribute('aria-live','polite');
 previewNote.innerHTML='<strong>v2.9 · '+esc(label)+'</strong> · All records are illustrative and save only in this browser. No Supabase, NTULearn, file storage or real AI connection.'+(bad?'<br><span class="notice">'+esc(localError)+'</span> <button class="btn" type="button" onclick="exportReferenceWorkspace()">Export this tab’s work</button>':'');
 previewNote.dataset.saveState=bad?'error':localPending?'saving':'saved';
}
function queueReferenceSave(){
 if(localBlocked)return;
 const snapshot=referenceSnapshot(),signature=JSON.stringify(snapshot);
 if(signature===localSignature&&localPending===0)return;
 localPending++;localStatus('Saving locally');
 localQueue=localQueue.then(async()=>{
  if(localBlocked)return;
  if(signature===localSignature)return;
  const saveNow=()=>localStore.save(snapshot,localRevision);
  const saved=globalThis.navigator?.locks?await navigator.locks.request('aa-reference-v29-save',saveNow):saveNow();
  localRevision=saved.revision;localSignature=signature;
 }).catch(error=>{localBlocked=true;localError=error.message||String(error);}).finally(()=>{localPending--;localStatus(localBlocked?'Changes not saved':localPending?'Saving locally':'Saved locally',localBlocked);});
}
window.exportReferenceWorkspace=function(){
 const snapshot=referenceSnapshot();const payload={schemaVersion:1,exportedAt:new Date().toISOString(),reference:'Academic_Assistant_v2_9_Settings.html',data:snapshot};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='Academic_Assistant_v2_9_Backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
try{
 localStore=new localAPI.Store(localStorage);
 const saved=localStore.load();
 if(saved){hydrateReference(saved.data);localRevision=saved.revision;localSignature=JSON.stringify(referenceSnapshot());}
}catch(error){localBlocked=true;localError='Saved data was not replaced. '+error.message;}
// Save after the original handler finishes, including handlers that mutate after go().
const referenceGo=go;
go=function(){referenceGo();queueMicrotask(queueReferenceSave);};
for(const type of ['click','change','submit'])document.addEventListener(type,()=>queueMicrotask(queueReferenceSave));
document.addEventListener('click',event=>{const button=event.target.closest('button');if(button&&button.textContent.trim()==='Export'&&location.hash==='#settings')exportReferenceWorkspace();});
addEventListener('storage',event=>{if(event.key===localAPI.KEY&&localStore){try{const other=localStore.load();if(other&&other.revision!==localRevision){localBlocked=true;localError='Another tab changed this workspace. Export any unsaved work here, then reload to view the saved version.';localStatus('Review newer changes',true);}}catch(error){localBlocked=true;localError=error.message;localStatus('Saved data needs review',true);}}});
addEventListener('beforeunload',event=>{if(localPending){event.preventDefault();event.returnValue='';}});
localStatus(localBlocked?'Saved data needs review':localRevision?'Saved locally':'Local saving ready',localBlocked);
