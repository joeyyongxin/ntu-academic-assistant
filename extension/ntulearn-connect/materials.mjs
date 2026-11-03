import {collection,getJson} from './api.mjs';
export function directPDFLinks(content){
 const candidates=[...(Array.isArray(content?.links)?content.links.map(x=>x.href):[])];
 for(const match of String(content?.body||'').matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi))candidates.push(match[1].replace(/&amp;/g,'&'));
 return [...new Set(candidates.filter(x=>typeof x==='string').map(x=>{try{const u=new URL(x,'https://ntulearn.ntu.edu.sg');return u.origin==='https://ntulearn.ntu.edu.sg'&&!u.username&&!u.password&&u.pathname.startsWith('/bbcswebdav/')&&/\.pdf$/i.test(u.pathname)&&u.href.length<=2000?u.href:null;}catch{return null;}}).filter(Boolean))];
}
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
 const files=rows.filter(x=>typeof x.id==='string'&&x.id.length<=200&&typeof x.fileName==='string'&&/\.pdf$/i.test(x.fileName)).map(x=>({name:x.fileName.slice(0,500),url:'https://ntulearn.ntu.edu.sg'+base+'/'+encodeURIComponent(x.id)+'/download'}));
 let links=[];try{links=directPDFLinks(await getJson(base.slice(0,-'/attachments'.length),fetcher));}catch{}
 for(const file of files){const matches=links.filter(x=>{try{return decodeURIComponent(new URL(x).pathname.split('/').pop()).toLowerCase()===file.name.toLowerCase();}catch{return false;}});if(matches.length===1)file.directUrl=matches[0];else if(files.length===1&&links.length===1)file.directUrl=links[0];}
 return {title:item.title,files};
}
