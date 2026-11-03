import {apiUrl,getJson} from './api.mjs';
import {pdfAttachments} from './materials.mjs';
export async function readPDF(state,key,attachment,fetcher=fetch){
 const listing=await pdfAttachments(state,{key,expires:Date.now()+60000},fetcher);
 const file=listing.files.find(f=>f.url===attachment);if(!file)throw Error('Choose an attachment returned by NTULearn.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetcher(apiUrl(file.url),{method:'GET',credentials:'include',redirect:'error',cache:'no-store',headers:{Accept:'application/pdf'},signal:controller.signal});
  if(!response.ok)throw Error('PDF fetch returned HTTP '+response.status+'.');
  const reader=response.body.getReader(),parts=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>10*1024*1024)throw Error('PDF exceeds the Library limit of 10 MB.');parts.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}
  if(!new TextDecoder().decode(bytes.slice(0,1024)).startsWith('%PDF-'))throw Error('NTULearn returned a non-PDF response. No file was imported.');
  const after=await getJson('/learn/api/public/v1/users/me',fetcher);if(after.id!==state.subject)throw Error('NTULearn account changed during download.');
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {name:file.name,base64:btoa(binary),size};
 }catch(error){if(error instanceof TypeError)throw Error('PDF fetch or redirect was blocked. Use Download PDFs to save it manually; automatic import will retry later.');throw error;}finally{clearTimeout(timer);}
}
