// Runs inside the workspace closure, after task editor and modal overrides.
(() => {
 let editingId=null;const edit=window.editStudyTask;window.editStudyTask=function(id){editingId=id;return edit.apply(this,arguments);};
 window.clearStudyTaskTime=function(){for(const id of ['studyStartTime','studyEndTime']){const n=document.getElementById(id);if(n)n.value='';}};
 window.updateStudyTimeDuration=function(){try{const duration=TaskTimes.duration(document.getElementById('studyStartTime').value,document.getElementById('studyEndTime').value);if(duration!==null)document.getElementById('studyMinutes').value=duration;document.getElementById('studyError').textContent='';}catch(e){document.getElementById('studyError').textContent=e.message;}};
 const save=window.saveStudyTask;
 window.saveStudyTask=function(event){
  let time;
  try{time=TaskTimes.read(document.getElementById('studyStartTime')?.value||'',document.getElementById('studyEndTime')?.value||'');}
  catch(e){event.preventDefault();document.getElementById('studyError').textContent=e.message;return;}
  const apply=window.applyOrPropose;
  window.applyOrPropose=function(change){if(change.entity==='tasks'&&change.after){const after={...change.after};delete after.startTime;delete after.endTime;Object.assign(after,time);if(time.endTime)after.min=TaskTimes.duration(time.startTime,time.endTime);change={...change,after};}return apply(change);};
  try{return save.apply(this,arguments);}finally{window.applyOrPropose=apply;}
 };
 function decorate(html){
  const t=document.createElement('template');t.innerHTML=html;const groups=new Map();
  const form=t.content.querySelector('#studyTitle')?.closest('form');if(form){const editing=form.closest('section')?.querySelector('h2')?.textContent==='Edit study task',task=editing?T.find(x=>x.id===editingId):null,v=TaskTimes.stored(task),fields=document.createElement('fieldset');fields.className='wide task-time-fields';fields.innerHTML='<legend>Time (optional, Singapore)</legend><p class="sub">Leave blank for a flexible task. End time is optional; when set, it determines planned minutes.</p><div class="task-time-inputs"><label>Start time<input type="time" id="studyStartTime" value="'+(v.startTime||'')+'" onchange="updateStudyTimeDuration()"></label><label>End time<input type="time" id="studyEndTime" value="'+(v.endTime||'')+'" onchange="updateStudyTimeDuration()"></label><button class="btn" type="button" onclick="clearStudyTaskTime()">Clear time</button></div>';form.querySelector('#studyNotes')?.closest('label')?.before(fields);}

  for(const check of t.content.querySelectorAll('input[onchange^="tog("]')){
   const id=Number(check.getAttribute('onchange').match(/tog\((\d+)\)/)?.[1]),task=T.find(x=>x.id===id);if(!task)continue;
   const label=check.closest('label'),time=TaskTimes.label(task);if(time){const badge=document.createElement('small');badge.className='task-scheduled-time';badge.textContent=time+' SGT';label?.querySelector('span')?.append(badge);}
   const row=check.closest('.home-study-row,.task-study-row');if(!row)continue;
   const rows=groups.get(row.parentElement)||[];if(!rows.some(x=>x.row===row))rows.push({row,task});groups.set(row.parentElement,rows);
  }
  for(const [parent,rows] of groups){if(!rows.some(x=>TaskTimes.label(x.task)))continue;const marker=document.createComment('task time groups');rows[0].row.before(marker);let lastType='';for(const {row,task} of rows.sort((a,b)=>TaskTimes.compare(a.task,b.task))){const type=TaskTimes.label(task)?'Scheduled':'Flexible tasks';if(type!==lastType){const heading=document.createElement('p');heading.className='sub task-time-heading';heading.textContent=type;marker.before(heading);lastType=type;}marker.before(row);}marker.remove();}
  return t.innerHTML;
 }
 for(const name of ['today','plan','detail']){const base=name==='today'?today:name==='plan'?plan:detail;const wrapped=function(){return decorate(base.apply(this,arguments));};if(name==='today')today=wrapped;else if(name==='plan')plan=wrapped;else detail=wrapped;}
 const style=document.createElement('style');style.textContent='.task-time-fields{border:0;border-top:1px solid var(--ln);padding:12px 0}.task-time-inputs{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.task-time-inputs label{flex:1 1 140px}.task-scheduled-time{display:block!important;color:var(--acc);font-weight:600;margin-top:4px}.task-time-heading{grid-column:1/-1;margin:12px 0 4px;font-weight:600}.task-time-fields p{max-width:65ch}';document.head.append(style);
})();
