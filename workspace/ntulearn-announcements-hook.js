let announcementPreview=null,announcementImportNotice='';
const announcementImportSettings=settings;
settings=function(){return announcementImportSettings()+'<section class="card"><h2>Import NTULearn announcements</h2><p class="sub">Use the local announcement exporter on your computer, then choose its JSON file here. Your NTULearn login stays on your computer. Review selected announcements and their modules before saving to '+esc(term().name)+'.</p><p><a class="btn" href="NTULEARN_IMPORT.md" target="_blank" rel="noopener">Exporter setup instructions</a></p><label class="study-field">Announcement export<input type="file" accept=".json,application/json" onchange="previewNTULearnAnnouncements(this.files[0]);this.value=\'\'"></label><p class="term-toast" role="status">'+esc(announcementImportNotice)+'</p><div id="ntuAnnouncementPreview"></div></section>';};
window.previewNTULearnAnnouncements=async function(file){
 announcementPreview=null;const panel=document.getElementById('ntuAnnouncementPreview');if(!panel||!file)return;
 const owner=ReferenceCloud.user?.id,semester=active;
 try{if(file.size>5*1024*1024)throw Error('Choose an export up to 5 MB.');const parsed=NTULearnAnnouncements.parse(await file.text());if(owner!==ReferenceCloud.user?.id||semester!==active)throw Error('Account or semester changed. Choose the file again.');
  const seen=new Set(HUB.map(x=>x.announcementSourceKey).filter(Boolean)),within=parsed.items.filter(x=>x.date>=term().start&&x.date<=term().end),fresh=within.filter(x=>!seen.has(x.sourceKey));
  announcementPreview={owner,semester,items:fresh};
  panel.innerHTML='<p class="sub">'+fresh.length+' new announcements · '+(parsed.duplicates+within.length-fresh.length)+' duplicates skipped · '+(parsed.items.length-within.length)+' outside this semester. Existing imports are kept when a source announcement changes.</p>'+fresh.map((x,i)=>'<div class="review"><label><input type="checkbox" data-ntu-ann="'+i+'"> '+esc(x.title)+'</label><p class="sub">'+esc(x.courseName)+' · '+esc(x.date)+'</p><details><summary>Preview announcement</summary><p style="white-space:pre-wrap">'+esc(x.text)+'</p></details><label>Module <select class="btn" data-ntu-ann-module="'+i+'"><option value="">Choose module</option>'+MODS.map(m=>'<option value="'+esc(m)+'" '+(x.suggestedModules.length===1&&x.suggestedModules[0]===m?'selected':'')+'>'+esc(m)+'</option>').join('')+'</select></label></div>').join('')+(fresh.length?'<button type="button" class="btn p" onclick="saveNTULearnAnnouncements()">Save selected announcements to Hub</button>':'')+'<p class="notice" role="alert" id="ntuAnnouncementError"></p>';
 }catch(e){panel.textContent=e.message;}
};
window.saveNTULearnAnnouncements=function(){try{
 recordWritable();if(!announcementPreview||announcementPreview.owner!==ReferenceCloud.user?.id||announcementPreview.semester!==active)throw Error('Account or semester changed. Choose the file again.');
 const selected=[...document.querySelectorAll('[data-ntu-ann]:checked')];if(!selected.length)throw Error('Select at least one announcement.');
 const records=selected.map(box=>{const i=Number(box.dataset.ntuAnn),x=announcementPreview.items[i],module=document.querySelector('[data-ntu-ann-module="'+i+'"]').value;if(!x||!MODS.includes(module))throw Error('Choose an enrolled module for each selected announcement.');recordDate(x.date);return {x,module};});
 const seen=new Set(HUB.map(x=>x.announcementSourceKey).filter(Boolean));let count=0;
 for(const {x,module} of records){if(seen.has(x.sourceKey))continue;seen.add(x.sourceKey);HUB.unshift({id:nextHubId(HUB),mod:module,type:'ann',title:x.title,desc:x.text.length>5000?x.text.slice(0,4950)+'\n[Shortened: see original NTULearn announcement.]':x.text,date:x.date,deadlineDate:'',url:'',origin:'NTULearn announcement import · reviewed',unread:true,announcementSourceKey:x.sourceKey});count++;}
 announcementPreview=null;announcementImportNotice=count+' announcements saved. Open NTULearn Hub to review them and propose study tasks.';go();
 }catch(e){const panel=document.getElementById('ntuAnnouncementError');if(panel)panel.textContent=e.message;}
};
