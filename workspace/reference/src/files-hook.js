// In the semester closure. Uses the reference toolbar, cards and file rows.
let assetState={key:'',rows:[],loading:false,error:'',details:null,deleteId:null},assetBusy=false;
const assetKey=()=>ReferenceCloud.user?.id+':'+active;
const assetError=e=>['PGRST205','42P01'].includes(e?.code)?'Private file storage setup is pending. Your study records are unaffected.':e?.message||'File operation failed. Please try again.';
async function assetLibrary(){return new AcademicFiles.Library(await ReferenceCloud.client());}
function assetSize(n){return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';}
function resetAssetState(){if(assetState.key!==assetKey())assetState={key:assetKey(),rows:[],loading:false,error:'',details:null,deleteId:null};}
function renderAssetList(){
 resetAssetState();const el=document.getElementById('fl');if(!el)return;
 if(assetState.loading){el.innerHTML='<p class="sub" role="status">Loading files…</p>';return;}
 const rows=assetState.rows.filter(f=>(!fm||f.module===fm)&&f.name.toLowerCase().includes(q.toLowerCase()));
 el.innerHTML=(assetState.error?'<p class="notice" role="alert">'+esc(assetState.error)+'</p>':'')+rows.map(f=>'<div class="fileitem"><div>'+chip(f.module)+'<b>'+esc(f.name)+'</b><small>'+esc(assetSize(f.bytes))+' · Private upload</small></div><div class="file-actions"><button class="btn" onclick="assetDetails(\''+f.id+'\')">Details</button><button class="btn" '+(assetBusy?'disabled':'')+' onclick="assetDownload(\''+f.id+'\')">Download</button><button class="btn" '+(assetBusy?'disabled':'')+' onclick="assetDeletePrompt(\''+f.id+'\')">Delete</button></div></div>').join('')+(!rows.length&&!assetState.error?'<p class="sub">'+(assetState.rows.length?'No files match.':'No files uploaded in this semester yet.')+'</p>':'');
}
async function fetchAssets(force=false){
 resetAssetState();if(assetState.loading||assetState.fetched&&!force)return;const state=assetState,owner=ReferenceCloud.user?.id,semester=active;if(!owner)return;
 state.loading=true;state.error='';renderAssetList();
 try{state.rows=await (await assetLibrary()).list(owner,semester);state.fetched=true;}catch(error){state.error=assetError(error);state.fetched=true;}finally{state.loading=false;if(assetState===state&&assetKey()===state.key)renderAssetList();}
}
files=function(){
 resetAssetState();const details=assetState.rows.find(x=>x.id===assetState.details),deleting=assetState.rows.find(x=>x.id===assetState.deleteId);
 return '<p class="eb">Library</p><h1>Your study files</h1><p class="sub">Private files organised by module in this semester.</p><div class="toolbar"><input class="sq" style="max-width:250px" placeholder="Search filename" aria-label="Filter files" value="'+esc(q)+'" oninput="q=this.value;lst()"><select class="btn" aria-label="Filter module" onchange="fm=this.value;lst()"><option value="">All modules</option>'+MODS.map(m=>'<option '+(m===fm?'selected':'')+'>'+esc(m)+'</option>').join('')+'</select><button class="btn p" onclick="document.getElementById(\'assetUploadForm\').hidden=false">Upload file</button><button class="btn" onclick="refreshAssets()" '+(assetBusy?'disabled':'')+'>Refresh files</button></div><div class="card" id="fl" aria-live="polite"></div>'+
 '<section class="card" id="assetUploadForm" hidden><h2>Upload a file</h2>'+(!MODS.length?'<p class="sub">Add a module in Settings before uploading a file.</p>':'<form class="term-form" onsubmit="assetUpload(event)"><label>Module<select id="assetModule" required>'+MODS.map(m=>'<option>'+esc(m)+'</option>').join('')+'</select></label><label>File<input id="assetInput" type="file" accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.docx,.pptx,.xlsx,.zip" required></label><p class="sub wide">Up to 10 MB. PDF, text, CSV, images, Office documents or ZIP.</p><p id="assetUploadStatus" class="wide" role="status"></p><button class="btn p" '+(assetBusy?'disabled':'')+'>Upload</button><button type="button" class="btn" onclick="document.getElementById(\'assetUploadForm\').hidden=true">Cancel</button></form>')+'</section>'+
 (details?'<section class="card"><h2>File details</h2><p><b>'+esc(details.name)+'</b></p><p class="sub">'+esc(details.module)+' · '+esc(assetSize(details.bytes))+'<br>Uploaded '+esc(new Date(details.created_at).toLocaleString())+'</p><button class="btn" onclick="assetDetails(null)">Close</button></section>':'')+
 (deleting?'<section class="card" role="alert"><h2>Delete this file?</h2><p>'+esc(deleting.name)+'</p><p class="sub">This removes the stored file and its library entry.</p><button class="btn" onclick="assetRemove(\''+deleting.id+'\')" '+(assetBusy?'disabled':'')+'>Delete file</button> <button class="btn" onclick="assetDeletePrompt(null)">Cancel</button></section>':'');
};
lst=function(){renderAssetList();void fetchAssets();};
window.refreshAssets=function(){void fetchAssets(true);};
window.assetDetails=function(id){resetAssetState();assetState.details=id;go();};
window.assetDeletePrompt=function(id){resetAssetState();assetState.deleteId=id;go();};
window.assetUpload=async function(event){
 event.preventDefault();if(assetBusy)return;const file=document.getElementById('assetInput').files[0],module=document.getElementById('assetModule').value,status=document.getElementById('assetUploadStatus'),state=assetState,owner=ReferenceCloud.user?.id,semester=active;
 assetBusy=true;status.textContent='Uploading…';const button=event.target.querySelector('button');button.disabled=true;
 try{
  if(!cloudReady||ReferenceCloud.bridge?.blocked)throw Error('Reload the saved workspace before uploading.');
  await ReferenceCloud.bridge?.queue;if(ReferenceCloud.bridge?.blocked)throw Error('Your workspace could not save. Resolve that before uploading.');
  await (await assetLibrary()).upload(owner,semester,module,file);
  if(assetState===state&&assetKey()===state.key){state.fetched=false;state.error='';state.details=null;go();}
 }catch(error){if(assetKey()===state.key)status.textContent=assetError(error);}finally{assetBusy=false;button.disabled=false;if(assetKey()===state.key)renderAssetList();}
};
window.assetDownload=async function(id){
 if(assetBusy)return;const state=assetState,row=state.rows.find(f=>f.id===id),owner=ReferenceCloud.user?.id;if(!row)return;assetBusy=true;
 try{const blob=await (await assetLibrary()).download(owner,row);if(assetKey()!==state.key)return;const url=URL.createObjectURL(new Blob([blob],{type:'application/octet-stream'})),a=document.createElement('a');a.href=url;a.download=row.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 catch(error){if(assetKey()===state.key){state.error=assetError(error);renderAssetList();}}finally{assetBusy=false;}
};
window.assetRemove=async function(id){
 if(assetBusy)return;const state=assetState,row=state.rows.find(f=>f.id===id),owner=ReferenceCloud.user?.id;if(!row)return;assetBusy=true;
 try{await (await assetLibrary()).remove(owner,row);if(assetKey()===state.key){state.rows=state.rows.filter(f=>f.id!==id);state.deleteId=null;state.details=null;state.error='';go();}}
 catch(error){if(assetKey()===state.key){state.error=assetError(error);renderAssetList();}}finally{assetBusy=false;if(assetKey()===state.key)renderAssetList();}
};
const assetSignOut=ReferenceCloud.signOut.bind(ReferenceCloud);ReferenceCloud.signOut=function(){if(assetBusy)return Promise.reject(Error('Wait for the file transfer to finish before signing out.'));return assetSignOut();};
addEventListener('beforeunload',event=>{if(assetBusy){event.preventDefault();event.returnValue='';}});
