import test from 'node:test';import assert from 'node:assert/strict';import {directPDFLinks,pdfAttachments} from '../extension/ntulearn-connect/materials.mjs';import {readPDF} from '../extension/ntulearn-connect/pdf-bytes.mjs';
const json=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
test('direct PDF discovery only accepts NTULearn WebDAV PDF links',()=>{
 const links=directPDFLinks({body:'<a href="/bbcswebdav/Notes.pdf?x=1&amp;y=2">Notes</a><a href="https://evil.example/bbcswebdav/file.pdf">Bad</a><a href="/webapps/login.pdf">Other</a><a href="http://ntulearn.ntu.edu.sg/bbcswebdav/file.pdf">HTTP</a>'});assert.deepEqual(links,['https://ntulearn.ntu.edu.sg/bbcswebdav/Notes.pdf?x=1&y=2']);
});
test('blocked API route falls back to the current material’s verified direct PDF without allowing redirects',async()=>{
 const calls=[],state={subject:'student',snapshot:{items:[{kind:'file',courseId:'c',id:'f',title:'Notes'}]}},key=JSON.stringify(['c','file','f']),url='https://ntulearn.ntu.edu.sg/learn/api/public/v1/courses/c/contents/f/attachments/a/download';
 const result=await readPDF(state,key,url,async(u,options)=>{calls.push(u);if(u.endsWith('/users/me'))return json({id:'student'});if(u.includes('/attachments?'))return json({results:[{id:'a',fileName:'Notes.pdf'}]});if(u.endsWith('/contents/f'))return json({body:'<a href="/bbcswebdav/Notes.pdf">Notes</a>'});if(u===url)throw new TypeError('redirect');assert.equal(u,'https://ntulearn.ntu.edu.sg/bbcswebdav/Notes.pdf');assert.equal(options.redirect,'error');return new Response('%PDF-1.7\nTest');});
 assert.ok(result.size>0);assert.equal(calls.filter(x=>x.includes('/bbcswebdav/')).length,1);
});
test('foreign content links cannot trigger a fallback network request',async()=>{
 const seen=[],state={subject:'student',snapshot:{items:[{kind:'file',courseId:'c',id:'f',title:'Notes'}]}};
 await assert.rejects(readPDF(state,JSON.stringify(['c','file','f']),'https://ntulearn.ntu.edu.sg/learn/api/public/v1/courses/c/contents/f/attachments/a/download',async u=>{seen.push(u);if(u.endsWith('/users/me'))return json({id:'student'});if(u.includes('/attachments?'))return json({results:[{id:'a',fileName:'Notes.pdf'}]});if(u.endsWith('/contents/f'))return json({body:'<a href="https://evil.example/bbcswebdav/Notes.pdf">Notes</a>'});throw new TypeError('redirect');}),/Needs attention/);assert.ok(seen.every(x=>x.startsWith('https://ntulearn.ntu.edu.sg/')));
});
test('Ultra PDF metadata supports extensionless signed WebDAV paths and avoids the Original attachment endpoint',async()=>{
 const state={subject:'student',snapshot:{items:[{kind:'file',courseId:'c',id:'f',title:'Ultra notes'}]}},key=JSON.stringify(['c','file','f']),seen=[];
 const body='<a href="/bbcswebdav/pid-123/xid-456?token=synthetic&amp;expires=1" data-bbfile="{&quot;linkName&quot;:&quot;Notes.pdf&quot;,&quot;mimeType&quot;:&quot;application/pdf&quot;}">Notes.pdf</a>';
 const fake=async(url,options)=>{seen.push(url);if(url.endsWith('/users/me'))return json({id:'student'});if(url.endsWith('/contents/f'))return json({body,contentHandler:{id:'resource/x-bb-document'}});if(url.includes('/bbcswebdav/')){assert.equal(options.redirect,'error');return new Response('%PDF-1.7\nUltra synthetic bytes');}throw Error('Original attachment list must not be requested');};
 const result=await pdfAttachments(state,{key,expires:Date.now()+1000},fake);assert.equal(result.files[0].name,'Notes.pdf');assert.match(result.files[0].url,/xid-456\?token=synthetic&expires=1$/);
 const bytes=await readPDF(state,key,result.files[0].url,fake);assert.ok(bytes.size>0);assert.ok(seen.every(url=>url.startsWith('https://ntulearn.ntu.edu.sg/')));
});
test('an unsupported attachment list can use authenticated direct metadata, while 403 remains denied',async()=>{
 const state={subject:'student',snapshot:{items:[{kind:'file',courseId:'c',id:'f',title:'Notes'}]}},request={key:JSON.stringify(['c','file','f']),expires:Date.now()+1000};
 for(const status of [400,403]){const fake=async url=>url.endsWith('/users/me')?json({id:'student'}):url.endsWith('/contents/f')?json({body:'<a href="/bbcswebdav/Notes.pdf">Notes.pdf</a>'}):new Response('',{status});if(status===400)assert.equal((await pdfAttachments(state,request,fake)).files.length,1);else await assert.rejects(pdfAttachments(state,request,fake),/403/);}
});

// Ultra parent documents expose attachment-bearing body blocks through /children.
test('selected Ultra parent discovers child PDF bytes without reading unrelated course content',async()=>{
 const state={subject:'student',snapshot:{items:[{kind:'file',courseId:'c',id:'parent',title:'Quiz answer key'}]}},key=JSON.stringify(['c','file','parent']),seen=[];
 const fake=async(url,options)=>{seen.push(url);if(url.endsWith('/users/me'))return json({id:'student'});
  if(url.endsWith('/contents/parent'))return json({hasChildren:true,contentHandler:{id:'resource/x-bb-document'}});
  if(url.includes('/contents/parent/attachments?'))return json({results:[]});
  if(url.includes('/contents/parent/children?'))return json({results:[{id:'body'},{id:'hidden',availability:{available:'No'}}]});
  if(url.endsWith('/contents/body'))return json({contentHandler:{id:'resource/x-bb-document'},body:'<a href="/bbcswebdav/pid-1/xid-2" data-bbfile=\'{"mimeType":"application/pdf","linkName":"Answers.pdf"}\'>Answers</a>'});
  if(url.endsWith('/bbcswebdav/pid-1/xid-2')){assert.equal(options.redirect,'error');return new Response('%PDF-1.7\nSynthetic child PDF');}
  throw Error('Unexpected request');
 };
 const result=await pdfAttachments(state,{key,expires:Date.now()+1000},fake);assert.equal(result.files.length,1);assert.equal(result.files[0].name,'Answers.pdf');
 assert.ok((await readPDF(state,key,result.files[0].url,fake)).size>0);assert.ok(!seen.some(x=>x.includes('hidden')));
});
test('child access denial is reported rather than a false empty PDF list',async()=>{
 const state={subject:'student',snapshot:{items:[{kind:'file',courseId:'c',id:'f',title:'Parent'}]}};
 await assert.rejects(pdfAttachments(state,{key:JSON.stringify(['c','file','f']),expires:Date.now()+1000},async url=>url.endsWith('/users/me')?json({id:'student'}):url.endsWith('/contents/f')?json({hasChildren:true}):url.includes('/attachments?')?json({results:[]}):new Response('',{status:403})),/403/);
});
test('nested children are bounded and duplicate child identities do not loop',async()=>{
 const state={subject:'student',snapshot:{items:[{kind:'file',courseId:'c',id:'f',title:'Parent'}]}},request={key:JSON.stringify(['c','file','f']),expires:Date.now()+1000};
 const cycle=await pdfAttachments(state,request,async url=>url.endsWith('/users/me')?json({id:'student'}):url.endsWith('/contents/f')?json({hasChildren:true}):url.includes('/children?')?json({results:[{id:'f'}]}):json({results:[]}));assert.deepEqual(cycle.files,[]);
 await assert.rejects(pdfAttachments(state,request,async url=>url.endsWith('/users/me')?json({id:'student'}):url.includes('/children?')?json({results:[{id:'child'+url.split('/contents/')[1].split('/')[0]}]}):url.includes('/attachments?')?json({results:[]}):json({hasChildren:true})),/too deep/);
});
