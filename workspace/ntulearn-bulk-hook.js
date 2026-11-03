let ntuSelectedMaterials=new Set(),ntuSelectionScope='',ntuBulkBusy=false,ntuBulkCancelled=false,ntuBulkFailures=[],ntuBulkNotice='';
function ntuBulkScope(){const key=ReferenceCloud.user?.id+':'+active;if(ntuSelectionScope!==key){ntuSelectionScope=key;ntuSelectedMaterials.clear();ntuBulkFailures=[];ntuBulkNotice='';}}
function noteNTUPDFProblem(item,message){ntuBulkScope();const row=HUB.find(x=>x.type==='file'&&x.ntulearnSyncKey===item?.sourceKey);if(!row)return;const previous=ntuBulkFailures.find(x=>x.id===row.id);if(previous)previous.message=message;else ntuBulkFailures.push({id:row.id,title:row.title,message});}
window.selectNTUMaterial=function(id,checked){ntuBulkScope();checked?ntuSelectedMaterials.add(id):ntuSelectedMaterials.delete(id);const el=document.getElementById('ntuSelectedCount');if(el)el.textContent=ntuSelectedMaterials.size+' selected';};
window.selectAllNTUMaterials=function(){ntuBulkScope();for(const row of ntuFeedAll().filter(x=>x.type==='file'))ntuSelectedMaterials.add(row.id);go();};
window.clearNTUMaterials=function(){ntuSelectedMaterials.clear();go();};
window.toggleNTUPDFCopies=async function(box){await setNTUPDFImport(box.checked);box.checked=!!ntuPDFConfig();};
function ntuBulkStatus(text){ntuBulkNotice=text;const el=document.getElementById('ntuBulkStatus');if(el)el.textContent=text;}
window.stopNTUMaterialCopy=function(){ntuBulkCancelled=true;ntuBulkStatus('Stopping after the current PDF transfer…');};
window.copyNTUMaterials=async function(retry=false){
 ntuBulkScope();if(ntuBulkBusy||assetBusy||ntuPDFBusy){ntuBulkStatus('Wait for the current file transfer to finish.');return;}
 const context=ntuContext(),ids=retry?ntuBulkFailures.map(x=>x.id):[...ntuSelectedMaterials],rows=ids.map(id=>HUB.find(x=>x.id===id&&x.type==='file')).filter(Boolean);if(!rows.length){ntuBulkStatus('Select materials first.');return;}
 ntuBulkBusy=true;ntuBulkCancelled=false;assetBusy=true;const stop=document.getElementById('ntuBulkStop');if(stop)stop.hidden=false;ntuBulkFailures=[];let copied=0,existing=0;
 try{ntuCopyCurrent(context);let connectorError='';try{const status=await ntuRequest('APP_STATUS',context);if(!status.paired||!status.libraryApproved||!status.capabilities?.includes('pdf-library'))connectorError='Connect this semester and approve PDF copies in the connector first.';}catch(error){connectorError=error.message;}ntuCopyCurrent(context);
  for(const row of rows){if(ntuBulkCancelled)break;ntuCopyCurrent(context);try{
   if(!row.ntulearnSyncKey)throw Error('No connector attachment identity. Open source or upload its downloaded PDF here.');if(connectorError)throw Error(connectorError);
   ntuBulkStatus('Checking '+row.title+'…');const result=await ntuRequest('APP_PDF_LIST',context,row.ntulearnSyncKey);ntuCopyCurrent(context);
   if(!Array.isArray(result.files)||result.files.length>100)throw Error('Unexpected PDF listing.');if(!result.files.length)throw Error('NTULearn returned no PDF attachments.');
   for(const file of result.files){if(ntuBulkCancelled)throw Error('Copy stopped. Retry to continue; existing copies will be skipped.');ntuCopyCurrent(context);ntuBulkStatus('Copying '+file.name+'…');const data=await ntuRequest('APP_PDF_BYTES',context,row.ntulearnSyncKey,file.url);const added=await ntuStorePDF(context,row.mod,row.ntulearnSyncKey+file.url,data);added?copied++:existing++;}
   ntuSelectedMaterials.delete(row.id);
  }catch(error){if(!ntuSame(context,ntuContext()))throw error;ntuBulkFailures.push({id:row.id,title:row.title,message:error.message});}}
  ntuBulkNotice=copied+' PDFs saved · '+existing+' already in My Files · '+ntuBulkFailures.length+' materials need attention · '+ntuSelectedMaterials.size+' remain selected.';
 }catch(error){if(ntuSame(context,ntuContext()))ntuBulkNotice=error.message;}
 finally{assetBusy=false;ntuBulkBusy=false;if(ntuSame(context,ntuContext()))go();}
};
const ntuSimpleCopyHub=ntulearn;
ntulearn=function(){ntuBulkScope();const template=document.createElement('template');template.innerHTML=ntuSimpleCopyHub();const page=hubFiltered(),articles=template.content.querySelectorAll('.hubitem');
 for(const [i,article] of [...articles].entries()){const row=page[i];if(row?.type!=='file')continue;article.querySelector('.ntu-copy-panel')?.remove();
  const label=document.createElement('label');label.className='ntu-material-selection';label.innerHTML='<input type="checkbox" aria-label="Select '+esc(row.title)+'" '+(ntuSelectedMaterials.has(row.id)?'checked':'')+' onchange="selectNTUMaterial('+row.id+',this.checked)"> Select';article.prepend(label);
  const button=article.querySelector('button[onclick="openNTUMaterial('+row.id+')"]');if(button){button.textContent='↓';button.title='Download PDFs';button.setAttribute('aria-label','Download PDFs for '+row.title);button.className='btn ntu-download-icon';}
 }
 const toolbar=template.content.querySelector('.ntu-browse');if(toolbar){const selection=document.createElement('div');selection.className='ntu-bulk-bar';selection.innerHTML='<span id="ntuSelectedCount">'+ntuSelectedMaterials.size+' selected</span><button class="btn" onclick="selectAllNTUMaterials()">Select all results</button><button class="btn" onclick="clearNTUMaterials()">Clear selection</button><button class="btn p" '+(ntuBulkBusy?'disabled':'')+' onclick="copyNTUMaterials()">Save selected to My Files</button><button id="ntuBulkStop" class="btn" hidden onclick="stopNTUMaterialCopy()">Stop copying</button><p id="ntuBulkStatus" role="status">'+esc(ntuBulkNotice)+'</p>';toolbar.append(selection);
  if(ntuBulkFailures.length){const details=document.createElement('details');details.open=true;details.className='ntu-settings-details';details.innerHTML='<summary>Needs attention ('+ntuBulkFailures.length+')</summary><button class="btn" onclick="copyNTUMaterials(true)">Retry failed</button>'+ntuBulkFailures.map(x=>{const row=HUB.find(r=>r.id===x.id);return '<div class="review"><b>'+esc(x.title)+'</b><p class="sub">'+esc(x.message)+'</p>'+(safeCourseLink(row?.url)?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(safeCourseLink(row.url))+'">Open source</a>':'')+'<label class="study-field">Upload downloaded PDF<input type="file" accept=".pdf,application/pdf" onchange="uploadNTUMaterialPDF('+x.id+',this.files[0]);this.value=\'\'"></label><p id="ntuCopyStatus-'+x.id+'" role="status"></p></div>';}).join('');toolbar.append(details);}
 }return template.innerHTML;};
const ntuSimplePDFSettings=settings;
settings=function(){const template=document.createElement('template');template.innerHTML=ntuSimplePDFSettings();const status=template.content.querySelector('#ntuPDFStatus'),details=status?.closest('details');if(details){details.innerHTML='<summary>Save PDFs to My Files</summary><label class="study-field"><span><input type="checkbox" '+(ntuPDFConfig()?'checked':'')+' onchange="toggleNTUPDFCopies(this)"> Save available PDFs from my mapped courses to My Files automatically</span></label><p class="sub">Uses this semester’s course mappings and private Library. Enable PDF permission when connecting. Existing copies are skipped; originals stay in NTULearn. Keep the planner open. For older materials, select them in Materials and use Save selected to My Files.</p><p id="ntuPDFStatus" role="status">'+esc(ntuPDFNotice)+'</p>';}
 return template.innerHTML;};
