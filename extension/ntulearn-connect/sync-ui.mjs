const $=id=>document.getElementById(id),origins=['https://ntulearn.ntu.edu.sg/*'];
const pending=new URLSearchParams(location.search).get('approve');
let busy=false;
async function request(type,extra={}){const reply=await chrome.runtime.sendMessage({type,...extra});if(!reply?.ok)throw Error(reply?.error||'Connector unavailable.');return reply.data;}
function status(text){$('status').textContent=text;}
function lock(value){busy=value;for(const id of ['connect','save','approve','sync'])$(id).disabled=value;}
async function refresh(){const data=await request('LOCAL_STATUS',{pending});$('summary').textContent=(data.lastSync?'Last synced: '+new Date(data.lastSync).toLocaleString()+' · '+data.count+' items':'Not synced yet.')+(data.auto?' · Automatic refresh on.':' · Automatic refresh off.')+(data.lastError?' '+data.lastError:'');$('pair').textContent=data.pair?'Approved planner: '+data.pair.label+' · '+data.pair.termName:'No planner approved yet.';$('approvalPanel').hidden=!data.pending;if(data.pending)$('approval').textContent='Account: '+data.pending.context.label+' · Semester: '+data.pending.context.termName;return data;}
async function run(fn){if(busy)return;lock(true);try{await fn();await refresh();}catch(error){status(error.message);}finally{lock(false);}}
$('connect').onclick=()=>run(async()=>{
 if(!await chrome.permissions.request({origins})){status('Access was not approved.');return;}
 status('Checking your session and courses…');const data=await request('LIST');const saved=await refresh();$('courses').replaceChildren();
 for(const course of data.courses){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.value=course.id;box.checked=saved.selected.some(x=>x.id===course.id);label.append(box,document.createTextNode(' '+course.name));$('courses').append(label);}
 $('auto').checked=saved.auto;$('coursesPanel').hidden=false;status(`${data.courses.length} courses available. ${data.skipped} unavailable courses skipped.${data.truncated?' First 50 enrollments only.':''} Choose up to five courses.`);
});
$('save').onclick=()=>run(async()=>{status('Syncing selected courses…');const data=await request('CONFIG',{ids:[...$('courses').querySelectorAll('input:checked')].map(x=>x.value),auto:$('auto').checked});status('Local sync finished. '+data.count+' items. '+(data.warnings.length?data.warnings.join(' '):'No reported category errors.'));});
$('sync').onclick=()=>run(async()=>{status('Syncing…');const data=await request('SYNC');status('Local sync finished. '+data.count+' items. '+(data.warnings.length?data.warnings.join(' '):'No reported category errors.'));});
$('approve').onclick=()=>run(async()=>{await request('APPROVE',{pending,libraryApproved:$('libraryApproval').checked});status('Approved. Return to planner Settings, check connection, then review latest updates.');});
$('disconnect').onclick=async()=>{try{await request('RESET');$('courses').replaceChildren();$('coursesPanel').hidden=true;status('Disconnected and cleared local course data. Existing planner records are kept.');await refresh();}catch(error){status(error.message);}};
refresh().catch(error=>status(error.message));
