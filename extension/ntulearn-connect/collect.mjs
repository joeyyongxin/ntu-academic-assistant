import {getJson, collection, coursePaths} from './api.mjs';
const ROOT='/learn/api/public/v1/';
export function plainText(value){
 return String(value||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<\s*(?:br|\/p|\/div|\/li)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'')
 .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(all,e)=>{const common={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};if(e[0]!=='#')return common[e.toLowerCase()]||all;const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1));return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';}).trim().slice(0,20000);
}
export function sgDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Missing or invalid source date.');
 const source=value.slice(0,10);if(new Date(source+'T00:00:00Z').toISOString().slice(0,10)!==source)throw Error('Invalid source calendar date.');
 return new Date(Date.parse(value)+8*3600000).toISOString().slice(0,10);
}
function sourceItem(kind,row,course,now){
 if(typeof row.id!=='string'||!row.id||row.id.length>200||!row.title)throw Error('Item missing source identity or title.');
 const stamp=kind==='deadline'?row.start:row.created||row.modified;
 const date=stamp?sgDate(stamp):kind==='file'?sgDate(now.toISOString()):sgDate(stamp);
 const query=new URLSearchParams({course_id:course.id});if(kind==='file')query.set('content_id',row.id);else{query.set('method','search');query.set('context','course_entry');}
 let url=kind==='deadline'?'https://ntulearn.ntu.edu.sg/webapps/calendar/viewCalendar':'https://ntulearn.ntu.edu.sg/webapps/blackboard/'+(kind==='file'?'content/listContent.jsp':'execute/announcement')+'?'+query;
 for(const link of Array.isArray(row.links)?row.links:[]){if(link.rel!=='alternate'||typeof link.href!=='string')continue;try{const alternate=new URL(link.href,'https://ntulearn.ntu.edu.sg');if(alternate.origin==='https://ntulearn.ntu.edu.sg'&&!alternate.username&&!alternate.password&&alternate.href.length<=2000){url=alternate.href;break;}}catch{}}
 const deadlineText=kind==='deadline'?'Published deadline: '+new Date(stamp).toLocaleString('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'})+' (Singapore time)\n':'';
 return {kind,id:row.id,courseId:course.id,courseName:course.name,title:plainText(row.title).slice(0,500),text:(deadlineText+(plainText(row.body||row.description)||(kind==='file'?'Course material listing. Open NTULearn to view the original.':'See the original NTULearn item.'))).slice(0,20000),date,deadlineDate:kind==='deadline'?date:'',dateEstimated:!stamp,url};
}
export async function collectCourse(course,fetcher=fetch,now=new Date()){
 const paths=coursePaths(course.id,now),items=[],warnings=[];
 for(const [category,path] of Object.entries(paths)){
  const kind={announcements:'ann',deadlines:'deadline',materials:'file'}[category],staged=[];
  try{const queue=[path],seenPaths=new Set(),seenIds=new Set();
   while(queue.length){const next=queue.shift();if(seenPaths.has(next))continue;if(seenPaths.size>=100)throw Error('Material folder limit reached.');seenPaths.add(next);
    const rows=await collection(next,fetcher);
    for(const row of rows){if(row.availability?.available==='No')continue;if(typeof row.id!=='string'||seenIds.has(row.id))continue;seenIds.add(row.id);if(seenIds.size>2000)throw Error('Course item limit reached.');
     if(kind==='file'&&(row.hasChildren||row.contentHandler?.id==='resource/x-bb-folder'))queue.push(ROOT+'courses/'+encodeURIComponent(course.id)+'/contents/'+encodeURIComponent(row.id)+'/children?limit=100');
     if(kind==='file'&&row.contentHandler?.id==='resource/x-bb-folder')continue;if(kind==='deadline'&&row.type!=='GradebookColumn')continue;
     staged.push(sourceItem(kind,row,course,now));
    }
   }items.push(...staged);
  }catch(error){warnings.push(category+': '+safeError(error));}
 }return {items,warnings};
}
export function safeError(error){if(error?.name==='AbortError')return 'Request timed out.';if(error instanceof TypeError)return 'Network or redirect blocked; sign in again and retry.';return String(error?.message||'Access failed.').slice(0,250);}
export async function listCourses(fetcher=fetch){
 const me=await getJson(ROOT+'users/me',fetcher);if(typeof me?.id!=='string'||!me.id)throw Error('Could not verify the signed-in NTULearn account.');
 const enrolled=await collection(ROOT+'users/me/courses?limit=100',fetcher),courses=[];let skipped=0;
 for(const entry of enrolled.slice(0,50)){if(typeof entry.courseId!=='string'||entry.courseId.length>200)continue;try{const detail=await getJson(ROOT+'courses/'+encodeURIComponent(entry.courseId),fetcher);courses.push({id:entry.courseId,name:String(detail.name||detail.courseId||entry.courseId).slice(0,500)});}catch{skipped++;}}
 return {subject:me.id,courses,skipped,truncated:enrolled.length>50};
}
