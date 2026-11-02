// External edits are announced without replacing an open form or unsaved work.
let revisionWatcher=null,revisionWatcherBridge=null;
async function checkExternalWorkspace(){
 if(document.hidden||!cloudReady)return;
 const b=ReferenceCloud.bridge;
 if(!b)return;
 if(revisionWatcherBridge!==b){revisionWatcherBridge=b;revisionWatcher=new AcademicRevisionWatch(b.client,b,()=>{
  let notice=document.getElementById('externalWorkspaceUpdate');
  if(!notice){notice=document.createElement('section');notice.id='externalWorkspaceUpdate';notice.className='card';notice.setAttribute('role','status');const before=document.querySelector('.preview-note');if(!before)return;before.after(notice);}
  notice.replaceChildren();
  const p=document.createElement('p');p.textContent='Your saved plan changed in another session. Reload to see the latest tasks. Finish or copy any open form before reloading.';
  const button=document.createElement('button');button.className='btn';button.textContent='Reload saved workspace';button.onclick=()=>window.demoRestore();notice.append(p,button);
 });}
 try{await revisionWatcher.check();}catch{/* Keep current work available during temporary network failures. */}
}
const revisionHydrate=testHydrate;
testHydrate=function(data){revisionHydrate(data);document.getElementById('externalWorkspaceUpdate')?.remove();};
addEventListener('focus',()=>void checkExternalWorkspace());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkExternalWorkspace();});
setInterval(()=>void checkExternalWorkspace(),60000);
