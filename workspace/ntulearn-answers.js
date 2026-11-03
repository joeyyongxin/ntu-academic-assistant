(function(root){
 function answer(question,rows){
  const module=(question.toUpperCase().match(/\b[A-Z]{2}\d{4}\b/)||[])[0];
  const words=question.toLowerCase().replace(/\b[A-Za-z]{2}\d{4}\b/g,'').match(/[a-z0-9]+/g)||[];
  const stop=new Set(['when','is','the','a','an','what','my','for','of','on','at','do','i','have','please','tell','me','about','it','date','time']);
  const terms=words.filter(w=>!stop.has(w));if(!module&&!terms.length)return {text:'Please include a module code or a topic, for example “When is the SC2000 quiz?”',sources:[]};
  const hits=rows.filter(x=>(!module||x.mod===module)&&terms.every(w=>(x.title+' '+x.desc).toLowerCase().includes(w))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  if(!hits.length)return {text:'I couldn’t find that in your saved updates. Sync the course or check the original NTULearn source.',sources:[]};
  const deadlines=hits.filter(x=>x.type==='deadline'&&/^\d{4}-\d\d-\d\d$/.test(x.deadlineDate||''));
  const dates=[...new Set(deadlines.map(x=>x.deadlineDate))];
  if(/\bwhen\b|\bdate\b|\btime\b/i.test(question)&&dates.length){return {text:dates.length>1?'I found multiple published dates: '+dates.join(', ')+'. Check the linked items to identify the quiz you mean.':(module?module+' — ':'')+deadlines[0].title+': '+dates[0]+'.\n'+(deadlines[0].desc.match(/Published deadline:[^\n]+/)||['See the source for the exact time.'])[0],sources:deadlines.slice(0,4)};}
  const snippets=hits.slice(0,3).map(x=>{const sentences=String(x.desc).split(/\n+|(?<=[.!?])\s+/).filter(Boolean);const relevant=sentences.find(s=>terms.some(w=>s.toLowerCase().includes(w)))||sentences[0]||x.title;return x.mod+' · '+x.title+'\n'+relevant.slice(0,320);});
  return {text:(/\bwhen\b|\bdate\b|\btime\b/i.test(question)?'I found relevant text, but no verified published deadline for this question:\n':'Relevant saved information:\n')+snippets.join('\n\n'),sources:hits.slice(0,3)};
 }
 root.NTULearnAnswers={answer};
})(globalThis);
