(function(root){
 const date=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 function yearEdit(year,patch,years,terms){
  const start=Number(patch.start),label=patch.label.trim();
  if(!Number.isInteger(start)||start<2000||start>2098||!label||label.length>60)throw Error('Enter a year from 2000 to 2098 and a label up to 60 characters.');
  if(years.some(y=>y.id!==year.id&&(y.start===start||y.label.toLowerCase()===label.toLowerCase())))throw Error('An academic year with that start or label already exists.');
  if(terms.some(t=>t.yearId===year.id&&(t.start<start+'-08-01'||t.end>(start+1)+'-07-31')))throw Error('Existing semester dates fall outside this year. Keep the year or adjust its semester dates first.');
  return {start,label};
 }
 function termEdit(term,patch,years,terms){
  const year=years.find(y=>y.id===patch.yearId),label=patch.label.trim(),weeks=Number(patch.weeks);
  if(!year||!label||label.length>40||!date(patch.start)||!date(patch.end)||patch.end<patch.start||!Number.isInteger(weeks)||weeks<1||weeks>52)throw Error('Check the semester name, dates and 1–52 teaching weeks.');
  if(patch.start<year.start+'-08-01'||patch.end>(year.start+1)+'-07-31')throw Error('Semester dates must fall within the selected academic year (August–July).');
  if(terms.some(t=>t.id!==term.id&&t.yearId===year.id&&t.label.toLowerCase()===label.toLowerCase()))throw Error('This year already has a semester with that name.');
  const dates=[...(term.tasks||[]),...(term.assessments||[]),...(term.classes||[]).map(c=>({date:c[0]})),...(term.inbox||[]).filter(x=>x.s==='p'),...(term.hub||[]).map(x=>({date:x.deadlineDate||x.date})),...(term.studyTools?.rules||[]).flatMap(r=>[{date:r.start},{date:r.end}])];
  if(dates.some(x=>date(x.date)&&(x.date<patch.start||x.date>patch.end)))throw Error('These dates would exclude saved tasks, assessments or schedules. Extend the range to keep all existing records inside it.');
  return {yearId:year.id,label,name:year.label+' · '+label,start:patch.start,end:patch.end,weeks,date:term.date<patch.start?patch.start:term.date>patch.end?patch.end:term.date};
 }
 function legacyMove(task){
  const matches=[...(task.notes||'').matchAll(/Moved from (\d{4}-\d\d-\d\d) to (\d{4}-\d\d-\d\d)\./g)],last=matches.at(-1);
  return task.done&&last&&task.date===last[1]&&date(last[2])?{id:'legacy-'+task.id,title:task.title,module:task.mod,from:last[1],to:last[2]}:null;
 }
 root.PlannerRefinements={yearEdit,termEdit,legacyMove,priority:x=>['low','normal','high'].includes(x)?x:'normal'};
})(globalThis);
