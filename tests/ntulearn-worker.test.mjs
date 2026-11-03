import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const listener={},storage={},alarms=new Set(),opened=[];
const event=name=>({addListener(fn){listener[name]=fn;}});
const own='chrome-extension://test-extension/';
globalThis.chrome={runtime:{id:'test-extension',getManifest:()=>({version:'0.4.0'}),getURL:path=>own+path,onMessage:event('message'),onStartup:event('startup')},action:{onClicked:event('click')},tabs:{async create(data){opened.push(data);}},
 storage:{local:{async get(key){return structuredClone({[key]:storage[key]});},async set(data){Object.assign(storage,structuredClone(data));},async remove(key){delete storage[key];}}},
 permissions:{async contains(){return true;},async remove(){return true;},onRemoved:event('remove')},
 alarms:{async create(name){alarms.add(name);},async clear(name){alarms.delete(name);},onAlarm:event('alarm')}};
let subject='student1';
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
globalThis.fetch=async url=>{
 const p=new URL(url).pathname;
 if(p.endsWith('/users/me'))return json({id:subject});
 if(p.endsWith('/users/me/courses'))return json({results:[{courseId:'course1'}]});
 if(p.endsWith('/courses/course1'))return json({name:'SC1004'});
 if(p.endsWith('/announcements'))return json({results:[{id:'ann1',title:'Synthetic announcement',body:'Read this',created:'2026-11-03T01:00:00Z'}]});
 return json({results:[]});
};
let source=await readFile(new URL('../extension/ntulearn-connect/background.js',import.meta.url),'utf8');
source=source.replace(/from '(\.\/[^']+)'/g,(_,path)=>"from '"+new URL('../extension/ntulearn-connect/'+path,import.meta.url).href+"'");
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const local={id:'test-extension',url:own+'connect.html'},web={id:'test-extension',url:'https://joeyyongxin.github.io/ntu-academic-assistant/index.html#settings',frameId:0};
const context={owner:'owner-1',semester:'semester1',label:'Fixture account',termName:'Semester 1'};
const send=(type,extra={},sender=local)=>new Promise(resolve=>listener.message({type,...extra},sender,resolve));
test('worker requires explicit pairing and confines snapshot access to approved account, semester and page',async()=>{
 assert.equal((await send('LIST')).ok,true);
 const configured=await send('CONFIG',{ids:['course1'],auto:true});assert.equal(configured.ok,true);assert.equal(configured.data.count,1);assert.ok(alarms.has('ntu-refresh'));
 assert.equal((await send('APP_SNAPSHOT',{context},web)).ok,false);
 assert.equal((await send('APP_CONNECT',{context},web)).ok,true);assert.match(opened[0].url,/\?approve=/);
 const pending=storage.ntuConnector.pending.id;
 assert.equal((await send('APPROVE',{pending:'wrong'})).ok,false);
 assert.equal((await send('APPROVE',{pending})).ok,true);
 const status=await send('APP_STATUS',{context},web);assert.equal(status.data.version,'0.4.0');assert.ok(status.data.capabilities.includes('pdf'));
 const snapshot=await send('APP_SNAPSHOT',{context},web);assert.equal(snapshot.ok,true);assert.equal(snapshot.data.items.length,1);
 assert.equal((await send('APP_SNAPSHOT',{context:{...context,owner:'other'}},web)).ok,false);
 assert.equal((await send('APP_SNAPSHOT',{context:{...context,semester:'other'}},web)).ok,false);
 assert.equal((await send('APP_SNAPSHOT',{context},{...web,url:'https://joeyyongxin.github.io/other/'})).ok,false);
 assert.equal((await send('APP_SNAPSHOT',{context},{...web,frameId:1})).ok,false);
 assert.equal((await send('SYNC',{},web)).ok,false);
 assert.equal((await send('APP_DISCONNECT',{context},web)).ok,true);
 assert.equal((await send('APP_SNAPSHOT',{context},web)).ok,false);
});
test('canceling a pending app connection prevents later approval',async()=>{
 await send('APP_CONNECT',{context},web);const pending=storage.ntuConnector.pending.id;
 await send('APP_DISCONNECT',{context},web);
 assert.equal((await send('APPROVE',{pending})).ok,false);
});
test('NTULearn account change clears source snapshot and stops scheduled refresh',async()=>{
 subject='different-student';const reply=await send('SYNC');assert.equal(reply.ok,false);assert.match(reply.error,/account changed/);assert.equal(storage.ntuConnector.snapshot,null);assert.equal(storage.ntuConnector.auto,false);assert.equal(alarms.size,0);
 await send('RESET');assert.equal(storage.ntuConnector,undefined);
});
test('material downloads require paired context, synced membership and a current request token',async()=>{
 await send('LIST');await send('CONFIG',{ids:['course1'],auto:false});
 storage.ntuConnector.snapshot.items.push({kind:'file',id:'f1',courseId:'course1',title:'Synthetic material'});
 const sourceKey=JSON.stringify(['course1','file','f1']);
 assert.equal((await send('APP_MATERIAL',{context,sourceKey},web)).ok,false);
 await send('APP_CONNECT',{context},web);await send('APPROVE',{pending:storage.ntuConnector.pending.id});
 assert.equal((await send('APP_MATERIAL',{context,sourceKey:'untrusted'},web)).ok,false);
 assert.equal((await send('APP_PDF_LIST',{context,sourceKey},web)).ok,false);
 assert.equal((await send('APP_MATERIAL',{context,sourceKey},web)).ok,true);
 assert.match(opened.at(-1).url,/material.html\?request=/);
 const request=storage.ntuConnector.materialRequest.id;
 assert.equal((await send('PDF_FILES',{request:'wrong'})).ok,false);
 assert.equal((await send('PDF_FILES',{request})).ok,true);
 await send('APP_DISCONNECT',{context},web);
 assert.equal((await send('PDF_FILES',{request})).ok,false);
});
