let updatesWatcher=null,updatesBridge=null;
const dirtyStudyForms=new WeakSet();
for(const event of ['input','change'])document.addEventListener(event,e=>{const form=e.target.closest?.('form');if(form)dirtyStudyForms.add(form);});
function updateNotice(result){
 if(document.getElementById('workspace').hidden)return;
 let notice=document.getElementById('productionUpdates');
 if(!result.changed&&!result.error){notice?.remove();return;}
 if(!notice){notice=document.createElement('section');notice.className='card';notice.id='productionUpdates';notice.setAttribute('role','status');document.querySelector('.preview-note')?.after(notice);}
 notice.replaceChildren();const text=document.createElement('p');text.textContent=result.changed?'Your saved workspace changed in another session. Reload to see it. Unfinished form entries stay as they are until you reload.':result.error;notice.append(text);
 const action=document.createElement('button');action.className='btn';action.textContent=result.changed?'Reload saved workspace':'Check again';
 action.onclick=()=>result.changed?window.demoRestore():void checkProductionUpdates();notice.append(action);
}
async function checkProductionUpdates(){
 if(document.hidden||!cloudReady||!ReferenceCloud.bridge?.owner)return;
 const bridge=ReferenceCloud.bridge;
 if(updatesBridge!==bridge){updatesBridge=bridge;updatesWatcher=new AcademicUpdates.Watcher(bridge,updateNotice);}
 await updatesWatcher.check();
}
const updateReload=window.demoRestore;
window.demoRestore=function(){
 if(typeof assetBusy!=='undefined'&&assetBusy){updateNotice({error:'Wait for the file transfer or preview to finish before reloading.'});return;}
 const dirty=[...document.querySelectorAll('#workspace form')].some(form=>dirtyStudyForms.has(form));
 const bridge=ReferenceCloud.bridge;
 if(dirty||bridge?.blocked){
  let guard=document.getElementById('reloadDraftGuard');if(guard)return;
  guard=document.createElement('section');guard.id='reloadDraftGuard';guard.className='card';guard.setAttribute('role','alert');
  const text=document.createElement('p');text.textContent='Reload saved data and discard unfinished entries in this tab? Export a backup or copy any text you want to keep first.';
  const cancel=document.createElement('button');cancel.className='btn';cancel.textContent='Keep editing';cancel.onclick=()=>guard.remove();
  const reload=document.createElement('button');reload.className='btn';reload.textContent='Discard entries and reload';
  const owner=bridge?.owner,epoch=bridge?.epoch;
  reload.onclick=()=>{
   if(ReferenceCloud.bridge!==bridge||bridge.owner!==owner||bridge.epoch!==epoch){guard.remove();return;}
   if(bridge.pending||typeof assetBusy!=='undefined'&&assetBusy){text.textContent='Wait for the current save or file operation before reloading.';return;}
   guard.remove();if(ReferenceCloud.user)void bridge.open(ReferenceCloud.user);
  };
  guard.append(text,cancel,reload);document.querySelector('.preview-note')?.after(guard);cancel.focus();return;
 }
 updateReload();
};
const updatesHydrate=testHydrate;testHydrate=function(data){document.getElementById('productionUpdates')?.remove();document.getElementById('reloadDraftGuard')?.remove();updatesHydrate(data);};
globalThis.AcademicStopUpdates=function(){document.getElementById('productionUpdates')?.remove();document.getElementById('reloadDraftGuard')?.remove();};
addEventListener('focus',()=>void checkProductionUpdates());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkProductionUpdates();});
setInterval(()=>void checkProductionUpdates(),60000);
