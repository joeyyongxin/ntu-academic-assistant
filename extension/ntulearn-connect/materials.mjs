import {collection,getJson} from './api.mjs';
export function materialInSnapshot(state,key){
 if(typeof key!=='string'||key.length>1000)throw Error('Invalid material selection.');
 const item=state.snapshot?.items.find(x=>x.kind==='file'&&JSON.stringify([x.courseId,x.kind,x.id])===key);
 if(!item)throw Error('This material is not in the latest synced snapshot. Sync this course again first.');return item;
}
export async function pdfAttachments(state,request,fetcher=fetch){
 if(!request||request.expires<Date.now())throw Error('Download request expired. Open it again from the planner.');
 const me=await getJson('/learn/api/public/v1/users/me',fetcher);if(me?.id!==state.subject)throw Error('NTULearn account changed or signed out. Reconnect before downloading.');
 const item=materialInSnapshot(state,request.key),base='/learn/api/public/v1/courses/'+encodeURIComponent(item.courseId)+'/contents/'+encodeURIComponent(item.id)+'/attachments';
 const rows=await collection(base+'?limit=100',fetcher);
 return {title:item.title,files:rows.filter(x=>typeof x.id==='string'&&x.id.length<=200&&typeof x.fileName==='string'&&/\.pdf$/i.test(x.fileName)).map(x=>({name:x.fileName.slice(0,500),url:'https://ntulearn.ntu.edu.sg'+base+'/'+encodeURIComponent(x.id)+'/download'}))};
}
