(function(root){
 async function inspect(blob,name){
  if(blob.size>AcademicFiles.MAX)throw Error('This file is too large to preview. Download it instead.');
  const ext=name.split('.').pop().toLowerCase(),head=new Uint8Array(await blob.slice(0,16).arrayBuffer());
  const ascii=(start,length)=>String.fromCharCode(...head.slice(start,start+length));
  if(['txt','md','csv'].includes(ext))return {kind:'text',text:(await blob.slice(0,200000).text())+(blob.size>200000?'\n\n[Preview truncated. Download for the full file.]':'')};
  let mime;
  if(ext==='pdf'&&ascii(0,5)==='%PDF-')mime='application/pdf';
  if(ext==='png'&&[137,80,78,71,13,10,26,10].every((n,i)=>head[i]===n))mime='image/png';
  if(['jpg','jpeg'].includes(ext)&&head[0]===255&&head[1]===216&&head[2]===255)mime='image/jpeg';
  if(ext==='webp'&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP')mime='image/webp';
  if(!mime)throw Error('Preview is unavailable for this file. Download it to open it in its app.');
  return {kind:mime==='application/pdf'?'pdf':'image',blob:new Blob([blob],{type:mime})};
 }
 root.AcademicFilePreview={inspect};
})(globalThis);
