import test from 'node:test';import assert from 'node:assert/strict';import {directPDFLinks} from '../extension/ntulearn-connect/materials.mjs';import {readPDF} from '../extension/ntulearn-connect/pdf-bytes.mjs';
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
