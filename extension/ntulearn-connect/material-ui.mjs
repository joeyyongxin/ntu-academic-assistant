const status=document.getElementById('status');
try{
 const request=new URLSearchParams(location.search).get('request'),reply=await chrome.runtime.sendMessage({type:'PDF_FILES',request});
 if(!reply?.ok)throw Error(reply?.error||'Could not read available attachments.');
 document.getElementById('title').textContent=reply.data.title;
 status.textContent=reply.data.files.length?reply.data.files.length+' PDF attachments available.':'No PDF attachments were returned for this material. Open its original NTULearn source; it may be a page, external link or another file type.';
 for(const file of reply.data.files){const p=document.createElement('p'),a=document.createElement('a');a.className='btn';a.href=file.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Download '+file.name;p.append(a);document.getElementById('files').append(p);}
}catch(error){status.textContent=error.message;}
