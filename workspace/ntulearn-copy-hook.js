let ntuMaterialCopy=null;
function ntuCopyMessage(id,text){const el=document.getElementById('ntuCopyStatus-'+id);if(el)el.textContent=text;}
function ntuCopyCurrent(context){if(!ntuSame(context,ntuContext()))throw Error('Account or semester changed. Open the material again.');recordWritable();}
async function ntuStorePDF(context,module,source,data){
 ntuCopyCurrent(context);if(!MODS.includes(module))throw Error('Choose an enrolled module for this material first.');
 const decoded=await NTULearnLibrary.decodePDF(data),name=await NTULearnLibrary.nameFor(source,data,decoded.hash),library=await assetLibrary(),rows=await library.list(context.owner,context.semester);ntuCopyCurrent(context);
 if(rows.some(x=>x.module===module&&(x.name===name||x.name.includes('-'+decoded.hash+'] '))))return false;
 await ReferenceCloud.bridge?.queue;ntuCopyCurrent(context);await ReferenceCloud.bridge.ensurePreferences();ntuCopyCurrent(context);
 await library.upload(context.owner,context.semester,module,new File([decoded.bytes],name,{type:'application/pdf'}));
 ntuCopyCurrent(context);resetAssetState();assetState.fetched=false;return true;
}
window.prepareNTUMaterialCopy=async function(id){const context=ntuContext(),row=HUB.find(x=>x.id===id);if(!row||row.type!=='file')return;ntuMaterialCopy=null;try{
 ntuCopyCurrent(context);if(!row.ntulearnSyncKey)throw Error('This older material is a link or note. Download its PDF from Open source, then use Upload downloaded PDF below.');
 ntuCopyMessage(id,'Checking available PDFs…');const status=await ntuRequest('APP_STATUS',context);ntuCopyCurrent(context);
 if(!status.paired||!status.capabilities?.includes('pdf-library')||!status.libraryApproved)throw Error('Connect this semester with connector 0.5 or newer and approve PDF copies. Or use Upload downloaded PDF below.');
 const result=await ntuRequest('APP_PDF_LIST',context,row.ntulearnSyncKey);ntuCopyCurrent(context);
 if(!Array.isArray(result.files)||result.files.length>100)throw Error('Unexpected attachment listing.');
 if(!result.files.length)throw Error('NTULearn returned no PDF attachments for this material. It may be a page or external resource. Open its source, download the PDF if available, then use Upload downloaded PDF.');
 ntuMaterialCopy={context,id,source:row.ntulearnSyncKey,module:row.mod,files:result.files};const panel=document.getElementById('ntuCopyChoices-'+id);if(!panel)return;
 panel.innerHTML=result.files.map((f,i)=>'<label class="study-field"><span><input type="checkbox" data-ntu-copy="'+i+'"> '+esc(f.name)+'</span></label>').join('')+'<button class="btn p" onclick="copySelectedNTUPDFs('+id+')">Copy selected PDFs to My Files</button>';
 ntuCopyMessage(id,result.files.length+' PDFs available. Choose the files to copy.');
 }catch(error){if(ntuSame(context,ntuContext()))ntuCopyMessage(id,error.message);}};
window.copySelectedNTUPDFs=async function(id){if(assetBusy||ntuPDFBusy){ntuCopyMessage(id,'A file transfer is running. Try again after it finishes.');return;}const pending=ntuMaterialCopy;if(!pending||pending.id!==id)return;
 assetBusy=true;let copied=0,skipped=0;
 try{ntuCopyCurrent(pending.context);const selected=[...document.querySelectorAll('#ntuCopyChoices-'+id+' [data-ntu-copy]:checked')];if(!selected.length||selected.length>10)throw Error('Choose 1–10 PDFs per copy action.');
 const files=selected.map(box=>pending.files[Number(box.dataset.ntuCopy)]);if(files.some(x=>!x))throw Error('Review the attachment choices again.');
 for(const file of files){ntuCopyCurrent(pending.context);ntuCopyMessage(id,'Copying '+file.name+'…');const data=await ntuRequest('APP_PDF_BYTES',pending.context,pending.source,file.url);const added=await ntuStorePDF(pending.context,pending.module,pending.source+file.url,data);added?copied++:skipped++;}
 ntuCopyMessage(id,copied+' PDFs copied to My Files · '+skipped+' already there. The original material is kept.');
 }catch(error){if(ntuSame(pending.context,ntuContext()))ntuCopyMessage(id,copied+' copied before stopping. '+error.message+' You can upload a downloaded PDF below.');}finally{assetBusy=false;}
};
window.uploadNTUMaterialPDF=async function(id,file){if(!file)return;if(assetBusy||ntuPDFBusy){ntuCopyMessage(id,'Wait for the current file transfer to finish.');return;}const row=HUB.find(x=>x.id===id),context=ntuContext();if(!row||row.type!=='file')return;assetBusy=true;
 try{ntuCopyCurrent(context);if(!file.name.toLowerCase().endsWith('.pdf')||!file.size||file.size>10*1024*1024)throw Error('Choose a PDF up to 10 MB.');ntuCopyMessage(id,'Copying your downloaded PDF to My Files…');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const added=await ntuStorePDF(context,row.mod,(row.ntulearnSyncKey||'material-'+id)+file.name,{name:file.name,size:file.size,base64:btoa(binary)});ntuCopyMessage(id,added?'PDF copied to My Files under '+row.mod+'. Original material kept.':'This PDF is already in My Files.');
 }catch(error){if(ntuSame(context,ntuContext()))ntuCopyMessage(id,error.message);}finally{assetBusy=false;}
};
const ntuCopyHub=ntulearn;
ntulearn=function(){const template=document.createElement('template');template.innerHTML=ntuCopyHub();const page=hubFiltered();for(const [i,article] of [...template.content.querySelectorAll('.hubitem')].entries()){const row=page[i];if(row?.type!=='file')continue;const panel=document.createElement('div');panel.className='ntu-copy-panel';panel.innerHTML='<button class="btn p" onclick="prepareNTUMaterialCopy('+row.id+')">Copy to My Files</button><label class="study-field">Upload downloaded PDF<input type="file" accept=".pdf,application/pdf" onchange="uploadNTUMaterialPDF('+row.id+',this.files[0]);this.value=\'\'"></label><div id="ntuCopyChoices-'+row.id+'"></div><p class="sub" role="status" id="ntuCopyStatus-'+row.id+'">Copies a PDF into this semester’s private Library; the material entry stays here.</p>';article.append(panel);}return template.innerHTML;};
