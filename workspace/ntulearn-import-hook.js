// Runs inside the academic workspace closure, in cloud mode.
let calendarPreview=null,calendarImportNotice='';
const calendarImportSettings=settings;
settings=function(){return calendarImportSettings()+'<section class="card"><h2>Import from NTULearn calendar</h2><p class="sub">In NTULearn, open Calendar → Calendar Settings → Share Calendar. Open your private calendar link and save its .ics file, then choose it here. Calendar events do not include announcements or course files.</p><p class="sub">Viewing '+esc(term().name)+'. Dates are shown in Singapore time; undated timezone values are interpreted as Singapore time. Review each item before saving.</p><label class="study-field">Calendar file<input type="file" accept=".ics,text/calendar" onchange="previewNTULearnCalendar(this.files[0]);this.value=\'\'"></label><p class="term-toast" role="status">'+esc(calendarImportNotice)+'</p><div id="ntuCalendarPreview"></div></section>';};
window.previewNTULearnCalendar=async function(file){
 calendarPreview=null;const panel=document.getElementById('ntuCalendarPreview');if(!panel)return;
 try{if(!file)return;if(file.size>5*1024*1024)throw Error('Choose an .ics file up to 5 MB.');
  const parsed=NTULearnCalendar.parse(await file.text()),items=parsed.events.filter(e=>e.date>=term().start&&e.date<=term().end);
  const seen=new Set(HUB.map(x=>x.calendarSourceKey).filter(Boolean)),unique=new Set();let duplicates=0;
  const fresh=items.filter(e=>{const key=NTULearnCalendar.key(e);if(seen.has(key)||unique.has(key)){duplicates++;return false;}unique.add(key);return true;});
  calendarPreview={owner:ReferenceCloud.user?.id,semester:active,events:fresh};
  panel.innerHTML='<p class="sub">'+fresh.length+' new events in this semester · '+duplicates+' duplicates skipped · '+(parsed.events.length-items.length)+' outside this semester · '+parsed.warnings.length+' unsupported or cancelled events skipped.</p>'+(parsed.warnings.length?'<details><summary>Skipped event details</summary><p>'+esc([...new Set(parsed.warnings)].join(' '))+'</p></details>':'')+fresh.map((e,i)=>'<div class="review"><label><input type="checkbox" data-ntu-select="'+i+'"> '+esc(e.title)+'</label><p class="sub">'+esc(e.date+(e.time?' · '+e.time:' · All day'))+(e.floating?' · Assumed Singapore timezone':'')+'</p><div class="toolbar"><label>Module <select class="btn" data-ntu-module="'+i+'"><option value="">Choose module</option>'+MODS.map(m=>'<option value="'+esc(m)+'" '+(e.suggestedModules.length===1&&e.suggestedModules[0]===m?'selected':'')+'>'+esc(m)+'</option>').join('')+'</select></label><label>Save as <select class="btn" data-ntu-type="'+i+'"><option value="ann">Calendar event</option><option value="deadline">Deadline</option></select></label></div></div>').join('')+(fresh.length?'<button class="btn p" type="button" onclick="saveNTULearnCalendar()">Save selected items to NTULearn Hub</button>':'')+'<p id="ntuCalendarError" class="notice" role="alert"></p>';
 }catch(e){panel.textContent=e.message;}
};
window.saveNTULearnCalendar=function(){try{
 recordWritable();if(!calendarPreview||calendarPreview.semester!==active||calendarPreview.owner!==ReferenceCloud.user?.id)throw Error('The account or semester changed. Choose the calendar file again.');
 const choices=[...document.querySelectorAll('[data-ntu-select]:checked')];if(!choices.length)throw Error('Select at least one calendar event.');
 const records=choices.map(box=>{const i=Number(box.dataset.ntuSelect),e=calendarPreview.events[i],module=document.querySelector('[data-ntu-module="'+i+'"]').value,type=document.querySelector('[data-ntu-type="'+i+'"]').value;if(!e||!MODS.includes(module))throw Error('Choose an enrolled module for every selected event.');recordDate(e.date);return {e,module,type};});
 const seen=new Set(HUB.map(x=>x.calendarSourceKey).filter(Boolean));let count=0;
 for(const {e,module,type} of records){const sourceKey=NTULearnCalendar.key(e);if(seen.has(sourceKey))continue;seen.add(sourceKey);HUB.unshift({id:nextHubId(HUB),mod:module,type,title:e.title,desc:('NTULearn calendar event: '+e.date+(e.time?' '+e.time:' (all day)')+' · Singapore time\n'+e.description).slice(0,5000),date:e.date,deadlineDate:type==='deadline'?e.date:'',origin:'NTULearn calendar import · reviewed',url:'',unread:true,calendarSourceKey:sourceKey});count++;}
 calendarPreview=null;calendarImportNotice=count+' calendar items saved to this semester’s NTULearn Hub. Open an item there to propose a study task.';go();
 }catch(e){const panel=document.getElementById('ntuCalendarError');if(panel)panel.textContent=e.message;}
};
