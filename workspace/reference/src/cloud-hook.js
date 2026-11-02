// Inside the original semester closure. No page renderer or stylesheet is replaced.
const testCapture=capture;
capture=function(){testCapture();term().messages=clone(hubMessages);};
const testLoad=load;
load=function(id){testLoad(id);if(term().messages)hubMessages=clone(term().messages);};
let cloudReady=false,cloudFailure='';
function testSnapshot(){capture();return clone({years,terms,active,current,studyYear,n,lastByYear,theme:document.documentElement.dataset.theme||null});}
function testHydrate(data){
 years.splice(0,years.length,...data.years);terms.splice(0,terms.length,...data.terms);active=data.active;current=data.current;studyYear=data.studyYear;n=data.n;
 Object.keys(lastByYear).forEach(key=>delete lastByYear[key]);Object.assign(lastByYear,data.lastByYear||{});
 const t=term();TODAY=t.date;MODS=t.mods;T=t.tasks;C=t.classes;TP=t.topics;IN=t.inbox;F=t.files;AS=t.assessments;CL=t.timetable;HUB=t.hub;imported=!!t.imported;hubMessages=clone(t.messages||[]);
 for(const t of terms)for(const task of t.tasks)n=Math.max(n,task.id);
 mod=null;q='';fm='';filePreview='';hubTab='all';hubMod='all';
}
function testStatus(state){
 const note=document.querySelector('.preview-note');if(!note)return;
 const labels={loading:'Loading test workspace',saving:'Saving to test project',saved:'Saved to test project',error:'Changes need review'};
 note.setAttribute('role','status');note.setAttribute('aria-live','polite');note.dataset.saveState=state;
 note.innerHTML='<strong>v2.9 · '+esc(labels[state]||state)+'</strong> · NTULearn access, AI and image extraction are not connected.'+(cloudFailure?'<br><span class="notice">'+esc(cloudFailure)+'</span> <button class="btn" onclick="exportReferenceWorkspace()">Export this tab’s work</button>':'');
}
function viewKey(user){return 'aa-reference-staging-view:'+ReferenceCloud.config.supabaseUrl+':'+user.id;}
function restoreView(data,user){document.documentElement.removeAttribute('data-theme');try{const p=JSON.parse(localStorage.getItem(viewKey(user))||'null');if(!p)return data;if(data.terms.some(t=>t.id===p.active))data.active=p.active;data.lastByYear=Object.fromEntries(Object.entries(p.lastByYear||{}).filter(([year,id])=>data.terms.some(t=>t.id===id&&t.yearId===year)));if(['light','dark'].includes(p.theme))document.documentElement.dataset.theme=p.theme;}catch{}return data;}
function cloudChanged(){if(cloudReady){const data=testSnapshot();if(ReferenceCloud.user)try{localStorage.setItem(viewKey(ReferenceCloud.user),JSON.stringify({active:data.active,lastByYear:data.lastByYear,theme:data.theme}));}catch{}ReferenceCloud.bridge?.changed(data);}}
const cloudGo=go;go=function(){cloudGo();if(!document.getElementById('workspace').hidden){ReferenceCloud.decorateWorkspace();queueMicrotask(cloudChanged);}};
const testSettings=settings;settings=function(){let h=testSettings();const email=ReferenceCloud.user?.email||'';return h.replaceAll('Demo Student','Your test account').replaceAll('student@example.com',esc(email)).replaceAll('Demo account','Test account').replaceAll('Simulated account','Separate test project').replace('No real sign-in or cloud sync. The demo session and study records stay in this browser. Study edits save locally in this browser.','Signed in to the separate test project. Confirmed academic changes are saved to that project.').replaceAll('Sign out of demo','Sign out').replace('Current semester updated for this demo session.','Current semester updated.').replace('Current semester saved in this browser.','Current semester saved to the test project.');};
// These controls retain their positions and explain the integration that is not yet available.
window.demoRestore=function(){if(ReferenceCloud.bridge?.pending||ReferenceCloud.bridge?.blocked){cloudFailure='Finish saving or export unsaved work before reloading the test workspace.';testStatus('error');return;}if(ReferenceCloud.user)void ReferenceCloud.bridge.open(ReferenceCloud.user);};
showImport=function(){cloudFailure='Timetable-image extraction is not connected in this test build. No classes were imported.';testStatus('error');};
demoUpload=function(){cloudFailure='Actual file upload is not connected in this test build. No file was uploaded.';testStatus('error');};
window.exportReferenceWorkspace=function(){const blob=new Blob([JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),reference:'v2.9',data:testSnapshot()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Academic_Assistant_Test_Backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('click',event=>{const b=event.target.closest('button');if(b&&b.textContent.trim()==='Export'&&location.hash==='#settings')exportReferenceWorkspace();});
for(const type of ['click','change','submit'])document.addEventListener(type,()=>queueMicrotask(cloudChanged));
addEventListener('beforeunload',event=>{if(ReferenceCloud.bridge?.pending){event.preventDefault();event.returnValue='';}});
void ReferenceCloud.start({
 loading(){cloudReady=false;cloudFailure='';ReferenceAuth.loading();},
 loaded(data,user){testHydrate(restoreView(data,user));cloudReady=true;cloudFailure='';ReferenceAuth.open();testStatus('saved');},
 error(error){cloudFailure=error.message;ReferenceAuth.error(error);testStatus('error');},
 status: testStatus,
 closed(){cloudReady=false;ReferenceAuth.closed();},
 recovery(){cloudReady=false;ReferenceAuth.recovery();},
 signedOut(){cloudReady=false;ReferenceAuth.signedOut();}
});
