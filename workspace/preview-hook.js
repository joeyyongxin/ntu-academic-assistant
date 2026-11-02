// Fetch through authenticated Storage; never publish a URL or render text as HTML.
let privatePreview=null,privatePreviewUrl=null,previewEpoch=0;
function clearPrivatePreview(){previewEpoch++;if(privatePreviewUrl)URL.revokeObjectURL(privatePreviewUrl);privatePreviewUrl=null;privatePreview=null;const panel=document.getElementById('privateFilePreview');if(panel){panel.hidden=true;panel.replaceChildren();}}
const previewFiles=files;
files=function(){clearPrivatePreview();return previewFiles()+'<section class="card" id="privateFilePreview" hidden></section>';};
const previewList=renderAssetList;
renderAssetList=function(){previewList();const list=document.getElementById('fl');if(!list)return;for(const row of assetState.rows){const details=list.querySelector('button[onclick="assetDetails(\''+row.id+'\')"]');if(!details)continue;const button=document.createElement('button');button.className='btn';button.textContent='Preview';button.disabled=assetBusy;button.onclick=()=>void previewPrivateFile(row.id);details.before(button);}};
window.closePrivatePreview=function(){clearPrivatePreview();};
window.previewPrivateFile=async function(id){
 if(assetBusy)return;resetAssetState();clearPrivatePreview();
 const state=assetState,key=assetKey(),owner=ReferenceCloud.user?.id,row=state.rows.find(r=>r.id===id),epoch=previewEpoch;if(!row)return;
 const panel=document.getElementById('privateFilePreview');if(!panel)return;panel.hidden=false;panel.textContent='Loading private preview…';assetBusy=true;
 try{
  const blob=await (await assetLibrary()).download(owner,row),preview=await AcademicFilePreview.inspect(blob,row.name);
  if(epoch!==previewEpoch||assetKey()!==key||assetState!==state||!panel.isConnected)return;
  const heading=document.createElement('h2');heading.textContent=row.name;const close=document.createElement('button');close.className='btn';close.textContent='Close preview';close.onclick=closePrivatePreview;panel.replaceChildren(heading,close);
  if(preview.kind==='text'){const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:65vh;overflow:auto';pre.textContent=preview.text;panel.append(pre);}
  else{
   privatePreviewUrl=URL.createObjectURL(preview.blob);
   const el=document.createElement(preview.kind==='image'?'img':'iframe');el.src=privatePreviewUrl;
   if(preview.kind==='image'){el.alt=row.name;el.style.cssText='display:block;max-width:100%;max-height:65vh;object-fit:contain';}
   else{el.title='PDF preview: '+row.name;el.setAttribute('sandbox','');el.style.cssText='width:100%;height:65vh;border:0';const fallback=document.createElement('p');fallback.className='sub';fallback.textContent='If your browser cannot show the PDF, use Download to open it.';panel.append(fallback);}
   panel.append(el);
  }
  privatePreview={key,id};
 }catch(error){if(epoch===previewEpoch&&assetKey()===key&&panel.isConnected){panel.textContent=assetError(error);const close=document.createElement('button');close.className='btn';close.textContent='Close preview';close.onclick=closePrivatePreview;panel.append(close);}}
 finally{assetBusy=false;renderAssetList();}
};
const previewHydrate=testHydrate;
testHydrate=function(data){clearPrivatePreview();previewHydrate(data);};
const previewLoad=load;
load=function(id){clearPrivatePreview();previewLoad(id);};
addEventListener('hashchange',clearPrivatePreview);
const previewSignOut=ReferenceCloud.signOut.bind(ReferenceCloud);
ReferenceCloud.signOut=function(){clearPrivatePreview();return previewSignOut();};

globalThis.AcademicClearFilePreview=clearPrivatePreview;
