const calendarSettings=settings;
settings=function(){return calendarSettings().replace('Calendar feed','Calendar export').replace('Classes, deadlines and tasks in Apple or Google Calendar','Download this semester’s classes, assessments and study tasks as an .ics file').replace('<button class="btn" onclick="this.textContent=\'Link copied (sample)\'">Copy private link</button>','<button class="btn" onclick="exportAcademicCalendar()">Download calendar</button>').replace('<span class="pill">Connected</span>','<span class="pill off">Not connected</span>');};
window.exportAcademicCalendar=function(){capture();downloadArtifact(AcademicCalendar.calendar(term(),ReferenceCloud.user.id),'text/calendar;charset=utf-8','Academic_Assistant_'+active+'.ics');};
const productWorkspace=ReferenceCloud.decorateWorkspace.bind(ReferenceCloud);
ReferenceCloud.decorateWorkspace=function(){
 productWorkspace();document.title='Academic Assistant';
 const view=document.getElementById('v');if(!view)return;
 const textChanges=[['Sample week','Study week'],['sample week','study week'],['Example study schedule','Your study schedule'],['Illustrative NTULearn alerts','Manually added course updates'],['sample proposals','proposals'],['example course updates','course updates']];
 const walker=document.createTreeWalker(view,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())for(const [before,after] of textChanges)node.textContent=node.textContent.replaceAll(before,after);
 const copy=document.getElementById('copyFiles');if(copy){copy.checked=false;copy.disabled=true;const label=copy.closest('label');for(const node of label.childNodes)if(node.nodeType===3)node.textContent=' Files stay in their original semester';}
};
