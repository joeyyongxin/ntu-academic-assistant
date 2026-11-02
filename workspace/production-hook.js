// The approved layout now uses production records for its core study pages.
const managedProductionSettings=settings,managedProductionDetail=detail;
settings=function(){if(ReferenceCloud.bridge?.preferencesAvailable)return managedProductionSettings();return '<p class="eb">Settings</p><h1>Your academic workspace</h1><section class="card"><h2>'+esc(ReferenceCloud.user?.email||'Your account')+'</h2><p>Existing Academic Assistant account</p><button class="btn" onclick="demoRestore()">Reload saved records</button> <button class="btn" onclick="demoSignout()">Sign out</button></section><section class="card"><h2>Academic year and semester</h2><p class="sub">Existing records are grouped by calendar date. These date ranges are organisational boundaries, not official teaching dates.</p><label>View semester<select class="btn" onchange="load(this.value);go()">'+terms.map(t=>'<option value="'+esc(t.id)+'" '+(t.id===active?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select></label><p class="sub">Module codes are saved with your tasks. Add a code here to use in a new task.</p><input class="btn" id="productionModule" placeholder="Module code" maxlength="16"><button class="btn" onclick="productionAddModule()">Use module code</button></section><section class="card"><h2>Appearance and data</h2><button class="btn" onclick="theme()">Light / dark</button> <button class="btn" onclick="exportReferenceWorkspace()">Export workspace</button></section>';};
detail=function(){if(ReferenceCloud.bridge?.preferencesAvailable)return managedProductionDetail();return '<button class="btn" onclick="mod=null;go()">← Modules</button><h1>'+esc(mod)+'</h1><section class="card"><h2>Study tasks</h2>'+T.filter(t=>t.mod===mod).map(t=>row(t)+'<button class="btn" onclick="editStudyTask('+t.id+')">Edit task</button>').join('')+'</section>'+taskEditor();};
const coreAssessment=assessments;
assessments=function(){if(ReferenceCloud.bridge?.preferencesAvailable)return coreAssessment();return coreAssessment().replace(/<label>[^<]*<input[^>]*id="assessmentTime"[^>]*><\/label>/g,'').replace(/<label>[^<]*<input[^>]*id="assessmentType"[^>]*><\/label>/g,'');};
// Keep assessment fields expected by the handler, without implying unsupported
// production columns. Defaults are added as hidden inputs after rendering.
const productionGo=go;go=function(){productionGo();
 const v=document.getElementById('v');if(!v||document.getElementById('workspace').hidden)return;
 const route=location.hash.slice(1);
 const pending={timetable:['Timetable','Saved classes and timetable editing are being connected to the production database.'],files:['Library','Private file storage is being connected to the production database.'],ntulearn:['NTULearn','The NTULearn hub is being connected to your production workspace.'],inbox:['Approval Inbox','Saved proposals are being connected to your production workspace.'],semesters:['Academic years and semesters','Choose the semester to view in Settings.']};
 const connected=ReferenceCloud.bridge?.preferencesAvailable;
 if(pending[route]&&!connected)v.innerHTML='<p class="eb">Academic Assistant</p><h1>'+pending[route][0]+'</h1><section class="card"><p>'+pending[route][1]+'</p><a class="btn" href="#settings">Settings</a></section>';
 if(!connected&&route==='assessments')for(const [id,value] of [['assessmentTime',''],['assessmentType','Assessment']])if(!document.getElementById(id)){const field=document.createElement('input');field.id=id;field.type='hidden';field.value=value;v.append(field);}
 const fixed=document.getElementById('studyFixed');if(fixed&&!connected){fixed.disabled=true;fixed.closest('label').hidden=true;}
};

window.productionAddModule=function(){const code=document.getElementById('productionModule').value.trim().toUpperCase();if(!/^[A-Z0-9_-]{2,16}$/.test(code)){cloudFailure='Enter a module code of 2–16 letters or numbers.';testStatus('error');return;}if(!MODS.includes(code))MODS.push(code);location.hash='plan';go();};

window.demoRestore=function(){
 const bridge=ReferenceCloud.bridge;
 if(bridge?.pending){cloudFailure='Wait for the current save to finish before reloading.';testStatus('error');return;}
 if(bridge?.blocked&&!confirm('Reload saved records and discard unsaved changes in this tab? Export a backup first if you need to keep them.'))return;
 if(ReferenceCloud.user)void bridge.open(ReferenceCloud.user);
};
const productionToday=today;today=function(){const overdue=T.filter(t=>!t.done&&t.date<TODAY);return productionToday().replace('No overdue tasks.',overdue.length+' overdue task'+(overdue.length===1?'':'s')+' in this semester.');};

const workspaceStatus=testStatus;testStatus=function(state){workspaceStatus(state);if(!ReferenceCloud.bridge?.preferencesAvailable){const note=document.querySelector('.preview-note');if(note)note.append(document.createTextNode(' · Semester settings, topics and classes require the production workspace storage setup. Task and assessment records remain available.'));}};
