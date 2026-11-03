// Presentation-only consolidation; existing handlers and element IDs are retained.
const ntuUnifiedSettings=settings;
settings=function(){
 const template=document.createElement('template');template.innerHTML=ntuUnifiedSettings();
 const cards=[...template.content.querySelectorAll('section.card')];
 const find=title=>cards.find(c=>c.querySelector('h2')?.textContent===title);
 const connection=find('Connect NTULearn'),automatic=find('Automatic planner updates');
 if(!connection)return template.innerHTML;
 connection.classList.add('ntu-connection');
 connection.querySelector('h2').textContent='NTULearn connection';
 connection.querySelector('p').textContent='Connect this account and semester, then choose your courses and update preferences below. Material PDFs can be downloaded from the Hub using connector 0.3.';
 if(automatic){const details=document.createElement('details');details.className='ntu-settings-details';details.open=!!ntuAutoConfig();const summary=document.createElement('summary');summary.textContent='Courses and automatic updates'+(ntuAutoConfig()?' · On':' · Off');details.append(summary);automatic.querySelector('h2')?.remove();details.append(...automatic.childNodes);connection.append(details);automatic.remove();}
 const manual=document.createElement('details');manual.className='ntu-settings-details';const summary=document.createElement('summary');summary.textContent='Manual import options';manual.append(summary);
 for(const title of ['Import from NTULearn calendar','Import NTULearn announcements']){const card=find(title);if(card){card.classList.remove('card');manual.append(card);}}
 connection.append(manual);
 for(const row of template.content.querySelectorAll('.set')){if(row.querySelector('span')?.textContent.startsWith('NTULearn'))row.remove();}
 return template.innerHTML;
};
let ntuFeedQuery='',ntuFeedPage=0,ntuBrowseScope='';
const ntuFeedBase=hubFiltered;
function ntuFeedAll(){const scope=ReferenceCloud.user?.id+':'+active;if(scope!==ntuBrowseScope){ntuBrowseScope=scope;ntuFeedQuery='';ntuFeedPage=0;}return ntuFeedBase().filter(x=>(x.mod+' '+x.title+' '+x.desc).toLowerCase().includes(ntuFeedQuery.toLowerCase())).sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.id-a.id);}
hubFiltered=function(){const rows=ntuFeedAll();ntuFeedPage=Math.max(0,Math.min(ntuFeedPage,Math.max(0,Math.ceil(rows.length/15)-1)));return rows.slice(ntuFeedPage*15,ntuFeedPage*15+15);};
window.ntuFeedSearch=function(value){ntuFeedQuery=value.trim().slice(0,200);ntuFeedPage=0;go();};
window.ntuFeedModule=function(value){hubMod=MODS.includes(value)?value:'all';ntuFeedPage=0;go();};
window.ntuFeedNext=function(delta){ntuFeedPage+=delta;go();};
const ntuOrganizedHub=ntulearn;
ntulearn=function(){
 const template=document.createElement('template');template.innerHTML=ntuOrganizedHub();
 const grid=template.content.querySelector('.hubgrid'),main=grid?.querySelector('section');if(!main)return template.innerHTML;
 const toolbar=document.createElement('div');toolbar.className='card ntu-browse';
 toolbar.innerHTML='<div class="hd"><h2>Browse your courses</h2><span class="tag">'+MODS.length+' modules</span></div><label class="study-field">Search updates<input id="ntuFeedSearchInput" type="search" maxlength="200" placeholder="Title, module or keyword" value="'+esc(ntuFeedQuery)+'" onchange="ntuFeedSearch(this.value)"></label><button class="btn" onclick="ntuFeedSearch(document.getElementById(\'ntuFeedSearchInput\').value)">Search updates</button><div class="ntu-module-grid"><button class="btn '+(hubMod==='all'?'active':'')+'" onclick="ntuFeedModule(\'all\')">All modules · '+HUB.length+'</button>'+MODS.map(m=>'<button class="btn '+(hubMod===m?'active':'')+'" onclick="ntuFeedModule(\''+esc(m)+'\')">'+esc(m)+' · '+HUB.filter(x=>x.mod===m).length+'</button>').join('')+'</div>';
 grid.before(toolbar);
 for(const article of main.querySelectorAll('.hubitem')){const paragraph=article.querySelector('p');if(paragraph&&paragraph.textContent.length>240){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=paragraph.textContent.slice(0,180)+'…';paragraph.replaceWith(details);details.append(summary,paragraph);}}
 const rows=ntuFeedAll(),page=hubFiltered();
 const pager=document.createElement('div');pager.className='toolbar ntu-pager';pager.innerHTML='<span class="sub">'+(rows.length?ntuFeedPage*15+1:0)+'–'+(ntuFeedPage*15+page.length)+' of '+rows.length+'</span><button class="btn" '+(!ntuFeedPage?'disabled':'')+' onclick="ntuFeedNext(-1)">Previous</button><button class="btn" '+((ntuFeedPage+1)*15>=rows.length?'disabled':'')+' onclick="ntuFeedNext(1)">Next</button>';
 const feed=main.querySelector('.hubtabs')?.parentElement;feed?.append(pager);main.querySelector('select[aria-label="Course update module"]')?.remove();
 for(const card of main.querySelectorAll('section.card')){const h=card.querySelector('h2');if(!['Add course update','Edit course update'].includes(h?.textContent))continue;const details=document.createElement('details'),summary=document.createElement('summary');details.className='card';summary.textContent=h.textContent;details.open=hubEditor!=null;card.replaceWith(details);card.classList.remove('card');h.remove();details.append(summary,card);}
 for(const [index,article] of [...main.querySelectorAll('.hubitem')].entries()){const row=page[index];if(row?.type==='file'&&row.ntulearnSyncKey){const button=document.createElement('button');button.className='btn p';button.textContent='Download PDFs';button.setAttribute('onclick','openNTUMaterial('+row.id+')');article.querySelector('.hubmeta:last-child')?.append(button);}}
 const aside=grid.querySelector('aside');if(aside){const details=document.createElement('details'),summary=document.createElement('summary');details.className='card';summary.textContent='Search saved text';aside.querySelector('.card')?.classList.remove('card');details.append(summary,...aside.childNodes);aside.append(details);}
 return template.innerHTML;
};
window.openNTUMaterial=async function(id){const context=ntuContext(),row=HUB.find(x=>x.id===id);if(!row?.ntulearnSyncKey)return;try{await ntuRequest('APP_MATERIAL',context,row.ntulearnSyncKey);if(ntuSame(context,ntuContext())){hubNotice='A download window opened. Choose an available PDF there.';go();}}catch(error){if(ntuSame(context,ntuContext())){hubNotice=error.message;go();}}};
