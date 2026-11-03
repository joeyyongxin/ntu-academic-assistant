let ntuPDFBusy=false,ntuPDFCursor=0,ntuPDFScope='',ntuPDFSeen=new Set(),ntuPDFOffsets=new Map(),ntuPDFNotice='';
function ntuPDFConfig(){const c=term().ntuPDF;return c?.owner===ReferenceCloud.user?.id&&c.enabled===true?c:null;}
function ntuPDFStatus(message){ntuPDFNotice=message;const el=document.getElementById('ntuPDFStatus');if(el)el.textContent=message;}
window.setNTUPDFImport=async function(enable){const context=ntuContext();try{recordWritable();if(enable){const mapping=ntuAutoConfig()?.mapping;if(!mapping||!Object.keys(mapping).length)throw Error('Set up course-to-module mappings under Courses and automatic updates first.');const status=await ntuRequest('APP_STATUS',context);if(!ntuSame(context,ntuContext()))return;if(!status.paired||!status.capabilities?.includes('pdf-library')||!status.libraryApproved)throw Error('Install connector 0.5, reconnect this semester, and tick approval for PDF copies in the extension.');recordWritable();term().ntuPDF={owner:context.owner,enabled:true,mapping:{...mapping}};}else if(term().ntuPDF)term().ntuPDF.enabled=false;ntuPDFSeen.clear();ntuPDFNotice=enable?'Automatic PDF copies enabled. Checking…':'Automatic PDF copies off. A transfer already started may finish; existing files are kept.';go();if(enable)window.runNTUPDFImport();}catch(error){ntuPDFStatus(error.message);}};
window.runNTUPDFImport=async function(){
 const config=ntuPDFConfig();if(!config||ntuPDFBusy||assetBusy||!ntuAutoIdle())return;const context=ntuContext(),signature=JSON.stringify(config);ntuPDFBusy=true;
 const current=()=>ntuSame(context,ntuContext())&&signature===JSON.stringify(ntuPDFConfig());
 try{
  recordWritable();const parsed=NTULearnSync.parse(JSON.stringify(await ntuRequest('APP_SNAPSHOT',context)));if(!current())return;
  const scope=context.owner+':'+context.semester;if(scope!==ntuPDFScope){ntuPDFScope=scope;ntuPDFCursor=0;ntuPDFSeen.clear();}
  const items=parsed.items.filter(x=>x.kind==='file'&&x.date>=term().start&&x.date<=term().end&&MODS.includes(config.mapping?.[x.courseId]));
  if(!items.length){ntuPDFStatus('No mapped materials in this semester’s snapshot.');return;}
  const library=await assetLibrary(),rows=await library.list(context.owner,context.semester);let copied=0,skipped=0,transfers=0;
  // Keep each pass small; remaining materials continue on the next timer tick.
  for(let checked=0;checked<Math.min(3,items.length);checked++){
   if(!current()||!ntuAutoIdle()||assetBusy)return;const item=items[ntuPDFCursor++%items.length],scan=parsed.exportedAt+item.sourceKey+config.mapping[item.courseId];if(ntuPDFSeen.has(scan))continue;
   const listing=await ntuRequest('APP_PDF_LIST',context,item.sourceKey);if(!current())return;
   if(!Array.isArray(listing.files)||listing.files.length>100)throw Error('Unexpected PDF listing.');
   let complete=true;
   for(let offset=ntuPDFOffsets.get(scan)||0;offset<listing.files.length;offset++){const attachment=listing.files[offset];if(!current()||!ntuAutoIdle())return;if(transfers>=3){complete=false;break;}transfers++;
    ntuPDFStatus('Checking PDF: '+attachment.name);const data=await ntuRequest('APP_PDF_BYTES',context,item.sourceKey,attachment.url);if(!current())return;
    const decoded=await NTULearnLibrary.decodePDF(data),name=await NTULearnLibrary.nameFor(item.sourceKey+attachment.url,data,decoded.hash);if(!current())return;
    const module=config.mapping[item.courseId];if(rows.some(x=>x.name===name&&x.module===module)){skipped++;ntuPDFOffsets.set(scan,offset+1);continue;}
    recordWritable();await ReferenceCloud.bridge?.queue;if(!current())return;recordWritable();await ReferenceCloud.bridge.ensurePreferences();if(!current())return;
    assetBusy=true;try{const saved=await library.upload(context.owner,context.semester,module,new File([decoded.bytes],name,{type:'application/pdf'}));rows.push(saved);copied++;ntuPDFOffsets.set(scan,offset+1);}finally{assetBusy=false;}
   }
   if(complete){ntuPDFSeen.add(scan);ntuPDFOffsets.delete(scan);}
  }
  if(current()){ntuPDFStatus(copied+' PDFs copied to My Files · '+skipped+' existing copies skipped. More materials are checked on the next pass.');resetAssetState();assetState.fetched=false;if(document.getElementById('fl'))void fetchAssets(true);}
 }catch(error){if(current())ntuPDFStatus('PDF copies paused: '+error.message);}
 finally{ntuPDFBusy=false;}
};
const ntuPDFSettings=settings;
settings=function(){const template=document.createElement('template');template.innerHTML=ntuPDFSettings();const connection=template.content.querySelector('.ntu-connection');if(connection){const details=document.createElement('details');details.className='ntu-settings-details';details.innerHTML='<summary>PDF copies to My Files · '+(ntuPDFConfig()?'On':'Off')+'</summary><p class="sub">Automatically copy PDFs from mapped courses into your private Library for this semester (up to 10 MB each). This transfers real file contents to your existing Supabase storage. Existing files are never overwritten; changed PDF contents get a separate version. Requires the planner open, a valid NTULearn session and connector 0.5 approval. Some download redirects may require manual download.</p><button class="btn p" onclick="setNTUPDFImport(true)">Approve and enable PDF copies</button> <button class="btn" onclick="setNTUPDFImport(false)">Turn off PDF copies</button> <button class="btn" onclick="runNTUPDFImport()">Check PDFs now</button><p role="status" id="ntuPDFStatus">'+esc(ntuPDFNotice)+'</p>';connection.append(details);}return template.innerHTML;};
setInterval(()=>window.runNTUPDFImport(),60000);
window.addEventListener('focus',()=>window.runNTUPDFImport());
setTimeout(()=>window.runNTUPDFImport(),4000);
