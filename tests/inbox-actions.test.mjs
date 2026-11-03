import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function setup(blocked=false){const c=vm.createContext({IN:[{id:1,s:'p',title:'Proposed task',mod:'Other',date:'2026-11-03',min:30}],T:[],recordWritable(){if(blocked)throw Error('Reload saved records.');},testStatus(){},go(){},mk:(date,mod,title,min)=>({date,mod,title,min})});vm.runInContext('window=globalThis;',c);for(const name of ['approveSemesterProposal','rejectSemesterProposal'])vm.runInContext(html.match(new RegExp('^window\\.'+name+'=.*$','m'))[0],c);return c;}
test('repeated approval creates only one task',()=>{const c=setup();c.approveSemesterProposal(1);c.approveSemesterProposal(1);assert.equal(c.T.length,1);assert.equal(c.IN[0].s,'a');});
test('dismiss cannot overwrite an applied proposal',()=>{const c=setup();c.approveSemesterProposal(1);c.rejectSemesterProposal(1);assert.equal(c.IN[0].s,'a');assert.equal(c.T.length,1);});
test('dismissed proposals cannot subsequently be approved',()=>{const c=setup();c.rejectSemesterProposal(1);c.approveSemesterProposal(1);assert.equal(c.IN[0].s,'r');assert.equal(c.T.length,0);});
test('blocked saves prevent approval and dismissal',()=>{for(const name of ['approveSemesterProposal','rejectSemesterProposal']){const c=setup(true);c[name](1);assert.equal(c.IN[0].s,'p');assert.equal(c.T.length,0);assert.equal(c.cloudFailure,'Reload saved records.');}});
