/* Private file bytes live in Storage; metadata is separate from workspace snapshots. */
(function(root){
 const BUCKET='academic-private-files',MAX=10*1024*1024;
 const extensions=new Set(['pdf','txt','md','csv','png','jpg','jpeg','webp','docx','pptx','xlsx','zip']);
 function validateFile(file){
  if(!file||typeof file.name!=='string'||!file.name.trim()||file.name.length>240)throw Error('Choose a file with a name of 1–240 characters.');
  if(!Number.isSafeInteger(file.size)||file.size<=0||file.size>MAX)throw Error('Choose a non-empty file up to 10 MB.');
  const ext=file.name.split('.').pop().toLowerCase();if(!extensions.has(ext))throw Error('Supported files: PDF, text, CSV, images, Office documents and ZIP.');return ext;
 }
 class Library{
  constructor(client){this.client=client;}
  async verify(owner){const {data,error}=await this.client.auth.getUser();if(error||data?.user?.id!==owner)throw Error('Your account changed. Sign in again before using files.');}
  async list(owner,semester){
   await this.verify(owner);const rows=[];
   for(let offset=0;;offset+=500){
    const {data,error}=await this.client.from('aa_file_assets').select('*').eq('user_id',owner).eq('semester_id',semester).order('created_at',{ascending:false}).order('id').range(offset,offset+499);
    if(error)throw error;
    if(!Array.isArray(data)||data.some(x=>x.user_id!==owner||x.semester_id!==semester))throw Error('Unexpected account or semester in file records.');
    rows.push(...data);if(data.length<500)break;
   }
   await this.verify(owner);return rows;
  }
  async upload(owner,semester,module,file){
   const ext=validateFile(file);if(!/^s\d+$/.test(semester)||!/^[A-Z0-9_-]{2,16}$/.test(module))throw Error('Choose an enrolled module.');
   await this.verify(owner);const id=crypto.randomUUID(),path=owner+'/'+semester+'/'+id+'.'+ext;
   // Storage uses the Blob's MIME type for multipart uploads, rather than contentType.
   // Retain the original MIME in metadata, while sending bytes in the bucket's allowed format.
   const uploadBody=new Blob([file],{type:'application/octet-stream'});
   const {error:uploadError}=await this.client.storage.from(BUCKET).upload(path,uploadBody,{contentType:'application/octet-stream',upsert:false,cacheControl:'0'});if(uploadError)throw uploadError;
   const row={id,user_id:owner,semester_id:semester,module,name:file.name,bytes:file.size,mime:file.type||'application/octet-stream',path};
   let registered=false;
   try{
    await this.verify(owner);const {data,error}=await this.client.from('aa_file_assets').insert(row).select().single();if(error)throw error;registered=true;await this.verify(owner);return data;
   }catch(error){
    if(registered)throw error; // The complete saved asset must survive a later account switch.
    // Never clean up through a different account. A failed cleanup is reported explicitly.
    try{await this.verify(owner);const {data:found,error:lookup}=await this.client.from('aa_file_assets').select('*').eq('id',id).eq('user_id',owner).maybeSingle();if(lookup)throw lookup;if(found){await this.verify(owner);return found;}const {error:cleanup}=await this.client.storage.from(BUCKET).remove([path]);if(cleanup)throw cleanup;}
    catch{throw Error('The file may have uploaded without a library entry. Sign back into the original account and review Storage path '+path+'.');}
    throw error;
   }
  }
  async download(owner,row){await this.verify(owner);if(row.user_id!==owner)throw Error('This file belongs to another account.');const {data,error}=await this.client.storage.from(BUCKET).download(row.path);if(error)throw error;await this.verify(owner);return data;}
  async remove(owner,row){
   await this.verify(owner);if(row.user_id!==owner)throw Error('This file belongs to another account.');
   const {error:storageError}=await this.client.storage.from(BUCKET).remove([row.path]);if(storageError)throw storageError;
   await this.verify(owner);const {error}=await this.client.from('aa_file_assets').delete().eq('id',row.id).eq('user_id',owner);if(error)throw Error('File bytes were removed, but the library entry still needs deletion. Retry Delete.');
  }
 }
 root.AcademicFiles={Library,validateFile,MAX,BUCKET};
})(globalThis);
