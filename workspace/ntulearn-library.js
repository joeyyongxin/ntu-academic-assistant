(function(root){
 async function decodePDF(data){
  if(!data||typeof data.base64!=='string'||data.base64.length>14*1024*1024||typeof data.name!=='string'||!data.name.toLowerCase().endsWith('.pdf'))throw Error('Invalid PDF transfer.');
  const binary=atob(data.base64);if(binary.length!==data.size||!binary.length||binary.length>10*1024*1024)throw Error('Invalid PDF size.');
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(!new TextDecoder().decode(bytes.slice(0,1024)).startsWith('%PDF-'))throw Error('The transferred file is not a PDF.');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');return {bytes,hash};
 }
 async function nameFor(source,data,hash){const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),x=>x.toString(16).padStart(2,'0')).join('').slice(0,16);return '[NTU-'+digest+'-'+hash+'] '+data.name.replace(/[\\/\x00-\x1f]/g,'_').slice(0,135).replace(/\.pdf$/i,'')+'.pdf';}
 root.NTULearnLibrary={decodePDF,nameFor};
})(globalThis);
