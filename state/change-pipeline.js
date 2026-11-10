(function(root){
 const copy=x=>JSON.parse(JSON.stringify(x));
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,canonical(x[k])])):x;
 const stable=x=>JSON.stringify(canonical(x));
 function normalize(entity,row){if(!row)return row;return entity==='tasks'?{...row,min:row.min??0,fix:!!row.fix,done:!!row.done,done_at:row.done_at??null,notes:row.notes||'',priority:row.priority||'normal'}:row;}
 const matches=(entity,a,b)=>stable(normalize(entity,a))===stable(normalize(entity,b));
 function validate(change){if(!['user','ntulearn','chatgpt','mcp'].includes(change.source)||!['tasks','assessments','timetable','hub','pdf'].includes(change.entity)||!['insert','update','delete'].includes(change.operation))throw Error('Unsupported change.');if(change.operation==='insert'?(!!change.before||!change.after):(!change.before||(change.operation==='update'?!change.after:!!change.after)))throw Error('Incomplete change.');}
 function decision(change){if(['chatgpt','mcp'].includes(change.source)){if(change.entity==='tasks'&&change.operation==='insert')return 'apply';if(change.entity==='tasks'&&change.operation==='update'&&change.before&&change.after){const a={...normalize('tasks',change.before)},b={...normalize('tasks',change.after)};for(const key of ['done','done_at']){delete a[key];delete b[key];}if(stable(a)===stable(b)&&typeof change.after.done==='boolean')return 'apply';}return 'propose';}if(change.before&&['tasks','assessments','timetable'].includes(change.entity))return 'propose';return 'apply';}
 function submit(change,{apply,propose}){validate(change);return decision(change)==='apply'?{status:'applied',value:apply(copy(change))}:{status:'proposed',value:propose(copy(change))};}
 function locate(change,list){if(change.unavailable)throw Error('The original record is unavailable. Dismiss this proposal.');const candidates=list.map((row,index)=>({row,index})).filter(x=>change.before.id==null?matches(change.entity,x.row,change.before):x.row.id===change.before.id&&matches(change.entity,x.row,change.before));if(candidates.length!==1)throw Error('This record changed or is ambiguous. Dismiss this proposal and review the current record.');return candidates[0].index;}
 root.ChangePipeline={decision,submit,validate,stable,matches,locate};
})(globalThis);
