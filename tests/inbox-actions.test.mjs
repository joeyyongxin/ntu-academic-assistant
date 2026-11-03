import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function setup(blocked=false){const c=vm.createContext({ReferenceCloud:{user:{id:'owner'}},active:'semester',confirm:()=>true,IN:[{id:1,s:'p',title:'Proposed task',mod:'Other',date:'2026-11-03',min:30}],T:[],recordWritable(){if(blocked)throw Error('Reload saved records.');},testStatus(){},go(){},mk:(date,mod,title,min)=>({id:42,date,mod,title,min})});vm.runInContext('window=globalThis;',c);const start=html.indexOf('function proposalTaskSnapshot(task)'),end=html.indexOf('\n};',start)+4;vm.runInContext(html.slice(start,end),c);for(const name of ['approveSemesterProposal','rejectSemesterProposal'])vm.runInContext(html.match(new RegExp('^window\\.'+name+'=.*$','m'))[0],c);return c;}
test('repeated approval creates only one task',()=>{const c=setup();c.approveSemesterProposal(1);c.approveSemesterProposal(1);assert.equal(c.T.length,1);assert.equal(c.IN[0].s,'a');});
test('dismiss cannot overwrite an applied proposal',()=>{const c=setup();c.approveSemesterProposal(1);c.rejectSemesterProposal(1);assert.equal(c.IN[0].s,'a');assert.equal(c.T.length,1);});
test('dismissed proposals cannot subsequently be approved',()=>{const c=setup();c.rejectSemesterProposal(1);c.approveSemesterProposal(1);assert.equal(c.IN[0].s,'r');assert.equal(c.T.length,0);});
test('blocked saves prevent approval and dismissal',()=>{for(const name of ['approveSemesterProposal','rejectSemesterProposal']){const c=setup(true);c[name](1);assert.equal(c.IN[0].s,'p');assert.equal(c.T.length,0);assert.equal(c.cloudFailure,'Reload saved records.');}});

test('undo removes only its own task and restores the proposal to pending',()=>{const c=setup();c.T.push({id:'unrelated'});c.approveSemesterProposal(1);c.undoSemesterProposal(1);assert.equal(c.T.length,1);assert.equal(c.T[0].id,'unrelated');assert.equal(c.IN[0].s,'p');c.approveSemesterProposal(1);assert.equal(c.T.length,2);});
test('undo refuses edited and completed tasks',()=>{for(const field of ['title','done']){const c=setup();c.approveSemesterProposal(1);c.T[0][field]=field==='done'?true:'Changed';c.undoSemesterProposal(1);assert.equal(c.T.length,1);assert.equal(c.IN[0].s,'a');assert.match(c.cloudFailure,/changed or is no longer available/);}});
test('cancelled undo preserves the approved task',()=>{const c=setup();c.approveSemesterProposal(1);c.confirm=()=>false;c.undoSemesterProposal(1);assert.equal(c.T.length,1);assert.equal(c.IN[0].s,'a');});
test('undo refuses a missing linked task',()=>{const c=setup();c.approveSemesterProposal(1);c.T[0]={...c.T[0],id:99};c.undoSemesterProposal(1);assert.equal(c.T.length,1);assert.equal(c.IN[0].s,'a');});
