import test from 'node:test';
import assert from 'node:assert/strict';
import {materialInSnapshot,pdfAttachments} from '../extension/ntulearn-connect/materials.mjs';
const item={id:'file1',courseId:'c1',kind:'file',title:'Lecture material'};
const key=JSON.stringify(['c1','file','file1']);
const state={subject:'student',snapshot:{items:[item]}};
const request={key,expires:Date.now()+60000};
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
test('PDF download destinations are built from verified source identities, never attachment URLs',async()=>{
 const calls=[];const result=await pdfAttachments(state,request,async url=>{calls.push(url);return url.endsWith('/users/me')?json({id:'student'}):json({results:[{id:'pdf/id',fileName:'Lecture.pdf',url:'https://evil.example/stolen'},{id:'exe',fileName:'program.exe'},{id:'doc',fileName:'notes.docx'}]});});
 assert.equal(result.files.length,1);assert.equal(result.files[0].url,'https://ntulearn.ntu.edu.sg/learn/api/public/v1/courses/c1/contents/file1/attachments/pdf%2Fid/download');assert.equal(calls.length,3);
});
test('unknown materials, expired requests and different NTULearn accounts cannot list PDFs',async()=>{
 assert.throws(()=>materialInSnapshot(state,'not a synced identity'));
 let calls=0;await assert.rejects(pdfAttachments(state,{...request,expires:0},async()=>{calls++;}),/expired/);assert.equal(calls,0);
 await assert.rejects(pdfAttachments(state,request,async()=>json({id:'other'})),/account changed/);
});
test('unsupported attachment API errors remain errors and empty PDF lists are honest',async()=>{
 await assert.rejects(pdfAttachments(state,request,async url=>url.endsWith('/users/me')?json({id:'student'}):new Response('',{status:403})),/403/);
 const result=await pdfAttachments(state,request,async url=>url.endsWith('/users/me')?json({id:'student'}):json({results:[]}));assert.equal(result.files.length,0);
});
