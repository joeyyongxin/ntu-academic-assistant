// Consent and mappings belong to the existing semester preferences snapshot.
let ntuAutoBusy=false,ntuAutoSetup=null,ntuAutoLast='';
function ntuAutoConfig(){const c=term().ntuAuto;return c?.owner===ReferenceCloud.user?.id&&c.enabled===true?c:null;}
function ntuAutoStatus(message){ntuSyncNotice=message;const el=document.getElementById('ntuSyncStatus');if(el)el.textContent=message;}
const ntuAutoSettings=settings;
settings=function(){const enabled=!!ntuAutoConfig();return ntuAutoSettings()+'<section class="card"><h2>Automatic planner updates</h2><p class="sub">'+(enabled?'Enabled for this account and semester.':'Off for this semester.')+' Match courses to modules once to automatically add announcements, published deadlines and material links to the Hub. Untouched imports receive source changes; personal edits and existing tasks are kept. No source deletion removes your records.</p><p class="sub">Requires the planner open, browser connector paired, and a valid NTULearn session. Enable scheduled refresh in the extension too. Unmapped courses and personal-edit conflicts remain available under Review latest updates.</p><button class="btn p" onclick="setupNTULearnAuto()">'+(enabled?'Change course mappings':'Set up automatic updates')+'</button> <button class="btn" onclick="disableNTULearnAuto()">Turn off planner updates</button> <button class="btn" onclick="runNTULearnAuto()">Check for planner updates</button><div id="ntuAutoSetup"></div></section>';};
window.setupNTULearnAuto=async function(){const context=ntuContext();try{
 const parsed=NTULearnSync.parse(JSON.stringify(await ntuRequest('APP_SNAPSHOT',context)));if(!ntuSame(context,ntuContext()))throw Error('Account or semester changed. Start setup again.');
 const courses=[...new Map(parsed.items.map(x=>[x.courseId,x.courseName])).entries()];if(!courses.length)throw Error('No course items in the snapshot yet. Sync your selected courses in the extension first.');
 ntuAutoSetup={context,courses};const current=ntuAutoConfig()?.mapping||{};const panel=document.getElementById('ntuAutoSetup');if(!panel)return;
 panel.innerHTML='<p>Choose a module for each course you want updated automatically. Leave a course on Skip to keep it manual.</p>'+courses.map(([id,name],i)=>'<label class="study-field">'+esc(name)+'<select class="btn" data-ntu-auto="'+i+'"><option value="">Skip this course</option>'+MODS.map(m=>'<option value="'+esc(m)+'" '+(current[id]===m?'selected':'')+'>'+esc(m)+'</option>').join('')+'</select></label>').join('')+'<p><label><input type="checkbox" id="ntuAutoConsent"> I approve automatic saving of mapped course updates to this account and semester, including existing source items.</label></p><button class="btn p" onclick="enableNTULearnAuto()">Save mappings and enable</button>';
 }catch(error){if(ntuSame(context,ntuContext()))ntuAutoStatus(error.message);}};
window.enableNTULearnAuto=function(){try{recordWritable();if(!ntuAutoSetup||!ntuSame(ntuAutoSetup.context,ntuContext()))throw Error('Account or semester changed. Start setup again.');if(!document.getElementById('ntuAutoConsent')?.checked)throw Error('Approve automatic saving before enabling.');
 const mapping=Object.fromEntries(ntuAutoSetup.courses.map(([id],i)=>[id,document.querySelector('[data-ntu-auto="'+i+'"]').value]).filter(([,module])=>module));if(!Object.values(mapping).length||Object.values(mapping).some(m=>!MODS.includes(m)))throw Error('Map at least one course to an enrolled module.');
 term().ntuAuto={owner:ReferenceCloud.user.id,enabled:true,mapping};ntuAutoSetup=null;ntuSyncNotice='Automatic updates enabled. Checking the latest snapshot…';go();window.runNTULearnAuto();
 }catch(error){ntuAutoStatus(error.message);}};
window.disableNTULearnAuto=function(){try{recordWritable();if(term().ntuAuto)term().ntuAuto={...term().ntuAuto,enabled:false};ntuAutoSetup=null;ntuSyncNotice='Automatic planner updates turned off. Existing records are kept.';go();}catch(error){ntuAutoStatus(error.message);}};
function ntuAutoIdle(){return document.visibilityState==='visible'&&!document.querySelector('.mback.open')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!(typeof taskEdit!=='undefined'&&taskEdit!=null)&&!(typeof classEdit!=='undefined'&&classEdit!=null)&&!(typeof topicEdit!=='undefined'&&topicEdit!=null)&&!(typeof hubEditor!=='undefined'&&hubEditor!=null)&&!(typeof hubProposalId!=='undefined'&&hubProposalId!=null);}
window.runNTULearnAuto=async function(){
 const config=ntuAutoConfig();if(!config||ntuAutoBusy||!ntuAutoIdle())return;const context=ntuContext(),signature=JSON.stringify(config);ntuAutoBusy=true;
 try{recordWritable();const parsed=NTULearnSync.parse(JSON.stringify(await ntuRequest('APP_SNAPSHOT',context)));
  if(!ntuSame(context,ntuContext())||signature!==JSON.stringify(ntuAutoConfig())||!ntuAutoIdle())return;recordWritable();
  const result=NTULearnSync.automatic(HUB,parsed,MODS,term().start,term().end,config.mapping||{});
  for(const {item} of result.changes)recordDate(item.date);
  for(const {item,module,old} of result.changes){const fields=NTULearnSync.row(item,module,old),record={...(old||{}),...fields,id:old?.id||nextHubId(HUB),unread:true,origin:'NTULearn browser sync · automatic',ntulearnSyncKey:item.sourceKey,ntulearnSyncBaseline:NTULearnSync.fingerprint(fields)};if(item.kind==='ann')record.announcementSourceKey=JSON.stringify([item.courseId,item.id]);if(old)HUB[HUB.indexOf(old)]=record;else HUB.unshift(record);}
  const message='Planner checked '+new Date().toLocaleTimeString()+' · source snapshot '+new Date(parsed.exportedAt).toLocaleString()+' · '+result.changes.length+' updates · '+result.protectedCount+' personal edits kept · '+result.unmapped+' unmapped items need review'+(parsed.warnings.length?' · some source categories failed; existing records kept.':'.');
  // Existing go() capture/cloud sync handles persistence; no direct database writes.
  ntuAutoLast=message;if(result.changes.length){ntuSyncNotice=message;go();}else ntuAutoStatus(message);
 }catch(error){if(ntuSame(context,ntuContext()))ntuAutoStatus('Automatic updates paused: '+error.message);}
 finally{ntuAutoBusy=false;}
};
setInterval(()=>window.runNTULearnAuto(),60000);
window.addEventListener('focus',()=>window.runNTULearnAuto());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')window.runNTULearnAuto();});
setTimeout(()=>window.runNTULearnAuto(),2000);
