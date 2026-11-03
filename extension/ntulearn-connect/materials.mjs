import {collection,getJson} from './api.mjs';
const HOST='https://ntulearn.ntu.edu.sg';
function decode(value){return String(value||'').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}
export function safeDirectPDF(value){try{const u=new URL(value,HOST);return u.origin===HOST&&!u.username&&!u.password&&u.pathname.startsWith('/bbcswebdav/')&&u.href.length<=2000?u.href:null;}catch{return null;}}
export function directPDFEntries(content){
 const entries=[];
 function add(href,name,mime){const url=safeDirectPDF(decode(href));if(!url)return;const pathname=new URL(url).pathname;if(!/\.pdf$/i.test(pathname)&&mime!=='application/pdf'&&!/\.pdf$/i.test(name||''))return;let filename=decode(name||'');if(!filename){try{filename=decodeURIComponent(pathname.split('/').pop());}catch{filename='Course material';}}if(!/\.pdf$/i.test(filename))filename+='.pdf';if(!entries.some(x=>x.url===url))entries.push({name:filename.slice(0,500),url,directUrl:url});}
 for(const match of String(content?.body||'').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)){const attrs=match[1],href=attrs.match(/\bhref\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];if(!href)continue;let meta={};const raw=attrs.match(/\bdata-bbfile\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];try{meta=JSON.parse(decode(raw));}catch{}const name=meta.linkName||meta.alternativeText||decode(match[2].replace(/<[^>]*>/g,'')).trim();add(href,name,meta.mimeType);}
 for(const link of Array.isArray(content?.links)?content.links:[])add(link.href,link.title,link.type);
 const file=content?.contentHandler?.file;if(file)for(const href of [file.url,file.downloadUrl])if(href)add(href,file.fileName,file.mimeType);
 return entries;
}
export function directPDFLinks(content){return directPDFEntries(content).map(x=>x.url);}
export function materialInSnapshot(state,key){if(typeof key!=='string'||key.length>1000)throw Error('Invalid material selection.');const item=state.snapshot?.items.find(x=>x.kind==='file'&&JSON.stringify([x.courseId,x.kind,x.id])===key);if(!item)throw Error('This material is not in the latest synced snapshot. Sync this course again first.');return item;}
export async function pdfAttachments(state,request,fetcher=fetch){
 if(!request||request.expires<Date.now())throw Error('Download request expired. Open it again from the planner.');
 const me=await getJson('/learn/api/public/v1/users/me',fetcher);if(me?.id!==state.subject)throw Error('NTULearn account changed or signed out. Reconnect before downloading.');
 const item=materialInSnapshot(state,request.key);
 // Ultra documents may keep their BBML attachment links in child content blocks.
 // Stay within this selected material's authenticated subtree, never the whole course.
 const queue=[{id:item.id,depth:0}],seen=new Set(),files=[];
 while(queue.length){
  const {id,depth}=queue.shift();if(seen.has(id))continue;
  if(seen.size>=25)throw Error('Material contains too many content blocks to check completely. Open its NTULearn source.');seen.add(id);
  const path='/learn/api/public/v1/courses/'+encodeURIComponent(item.courseId)+'/contents/'+encodeURIComponent(id),attachments=path+'/attachments';
  let content=null;try{content=await getJson(path,fetcher);}catch(error){if([401,403].includes(error.status)||depth)throw error;}
  const children=content?.hasChildren===true||content?.contentHandler?.id==='resource/x-bb-folder',direct=directPDFEntries(content);
  let found=direct;
  if(!(direct.length&&['resource/x-bb-document','resource/x-bb-file'].includes(content?.contentHandler?.id))){
   let rows=[];try{rows=await collection(attachments+'?limit=100',fetcher);}catch(error){if(!([400,404,405].includes(error.status)&&(direct.length||children)))throw Error('PDF attachment discovery: '+error.message);}
   const attached=rows.filter(x=>typeof x.id==='string'&&x.id.length<=200&&typeof x.fileName==='string'&&/\.pdf$/i.test(x.fileName)).map(x=>({name:x.fileName.slice(0,500),url:HOST+attachments+'/'+encodeURIComponent(x.id)+'/download'}));
   for(const file of attached){const matches=direct.filter(x=>x.name.toLowerCase()===file.name.toLowerCase());if(matches.length===1)file.directUrl=matches[0].url;else if(attached.length===1&&direct.length===1)file.directUrl=direct[0].url;}
   found=attached.length?attached:direct;
  }
  for(const file of found)if(!files.some(x=>x.url===file.url||x.directUrl&&x.directUrl===file.directUrl))files.push(file);
  if(children){
   if(depth>=4)throw Error('Material nesting is too deep to check completely. Open its NTULearn source.');
   const rows=await collection(path+'/children?limit=100',fetcher);
   for(const row of rows){if(row.availability?.available==='No')continue;if(typeof row.id!=='string'||!row.id||row.id.length>200)throw Error('Unexpected child content identity.');if(!seen.has(row.id))queue.push({id:row.id,depth:depth+1});}
   if(queue.length+seen.size>100)throw Error('Material contains too many content blocks to check completely. Open its NTULearn source.');
  }
 }
 return {title:item.title,files};
}
