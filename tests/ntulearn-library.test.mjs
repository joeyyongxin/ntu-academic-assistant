import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';import {webcrypto} from 'node:crypto';import {File} from 'node:buffer';
import {readPDF} from '../extension/ntulearn-connect/pdf-bytes.mjs';
const context=vm.createContext({atob,TextEncoder,TextDecoder,crypto:webcrypto});
vm.runInContext(await readFile(new URL('../workspace/ntulearn-library.js',import.meta.url),'utf8'),context);
const data={name:'Notes.pdf',base64:btoa('%PDF-1.7\nSynthetic bytes'),size:24};data.size=atob(data.base64).length;
const json=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
test('PDF bytes are validated and deterministic Library names deduplicate content but retain changed versions',async()=>{
 const decoded=await context.NTULearnLibrary.decodePDF(data),same=await context.NTULearnLibrary.decodePDF(data);
 const name=await context.NTULearnLibrary.nameFor('source1',data,decoded.hash);assert.equal(name,await context.NTULearnLibrary.nameFor('source1',data,same.hash));assert.ok(name.length<=240);assert.ok(name.endsWith('.pdf'));
 const different=await context.NTULearnLibrary.decodePDF({...data,base64:btoa('%PDF-1.7\nDifferent bytes'),size:24});assert.notEqual(decoded.hash,different.hash);
 await assert.rejects(context.NTULearnLibrary.decodePDF({...data,base64:btoa('<html>%PDF-</html>'),size:18}));
 await assert.rejects(context.NTULearnLibrary.decodePDF({...data,size:99}));
});
test('byte reader only fetches a listed PDF, rejects HTML and checks source account after download',async()=>{
 const state={subject:'student',snapshot:{items:[{kind:'file',id:'f',courseId:'c',title:'Notes'}]}},key=JSON.stringify(['c','file','f']),url='https://ntulearn.ntu.edu.sg/learn/api/public/v1/courses/c/contents/f/attachments/a/download';let me=0;
 const fake=async(u,options)=>{if(u.endsWith('/users/me')){me++;return json({id:'student'});}if(u.includes('/attachments?'))return json({results:[{id:'a',fileName:'Notes.pdf'}]});assert.equal(options.redirect,'error');return new Response('%PDF-1.7\nSynthetic bytes');};
 const output=await readPDF(state,key,url,fake);assert.equal(output.base64,data.base64);assert.equal(me,2);
 await assert.rejects(readPDF(state,key,'https://evil.example/file',fake),/returned by NTULearn/);
 await assert.rejects(readPDF(state,key,url,async u=>u.endsWith('/users/me')?json({id:'student'}):u.includes('/attachments?')?json({results:[{id:'a',fileName:'Notes.pdf'}]}):new Response('<html>sign in</html>')),/non-PDF/);
});
test('automatic copies use the existing Library adapter and skip duplicates across reload-style retries',async()=>{
 const rows=[],semester={start:'2026-08-01',end:'2026-12-31',ntuPDF:{owner:'owner',enabled:true,mapping:{c:'SC1004'}}};let uploads=0;
 const c=vm.createContext({File,NTULearnLibrary:context.NTULearnLibrary,NTULearnSync:{parse:x=>JSON.parse(x)},ReferenceCloud:{user:{id:'owner'},bridge:{queue:Promise.resolve(),ensurePreferences:async()=>{}}},term:()=>semester,assetBusy:false,assetState:{},assetLibrary:async()=>({list:async()=>rows,upload:async(owner,term,module,file)=>{uploads++;return {name:file.name,module};}}),recordWritable(){},ntuAutoIdle:()=>true,ntuContext:()=>({owner:'owner',semester:'s1'}),ntuSame:(a,b)=>a.owner===b.owner&&a.semester===b.semester,MODS:['SC1004'],settings:()=>'',resetAssetState(){},go(){},setTimeout(){},setInterval(){},esc:x=>x,document:{getElementById:()=>null},ntuRequest:async type=>type==='APP_SNAPSHOT'?{exportedAt:'2026-11-03T01:00:00Z',items:[{kind:'file',date:'2026-11-03',courseId:'c',sourceKey:'key'}]}:type==='APP_PDF_LIST'?{files:[{name:'Notes.pdf',url:'source-url'}]}:data});c.window=c;c.addEventListener=()=>{};
 vm.runInContext(await readFile(new URL('../workspace/ntulearn-library-hook.js',import.meta.url),'utf8'),c);
 await c.runNTUPDFImport();assert.equal(uploads,1);assert.equal(rows.length,1);
 vm.runInContext('ntuPDFSeen.clear();ntuPDFOffsets.clear()',c);await c.runNTUPDFImport();assert.equal(uploads,1);
 semester.ntuPDF.enabled=false;await c.runNTUPDFImport();assert.equal(uploads,1);
});
