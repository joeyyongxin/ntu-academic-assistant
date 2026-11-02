import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const c=vm.createContext({});vm.runInContext(await readFile(new URL('../data-service.js',import.meta.url),'utf8'),c);
function setup(){
 const state={actor:'alice',writes:0,tasks:Array.from({length:501},(_,i)=>({id:String(i),user_id:'alice'})),assessments:[]};
 const client={auth:{async getUser(){return {data:{user:{id:state.actor}}};}},from(table){return {select(){return this;},eq(){return this;},order(){return this;},async range(a,b){if(state.switchOnRead)state.actor='bob';return {data:state[table].slice(a,b+1)};},insert(doc){state.writes++;this.doc=doc;return this;},async single(){return {data:this.doc};}};},async rpc(name,args){state.writes++;if(state.conflict)return {error:Error('revision conflict')};return {data:{id:args.p_id,user_id:'alice',...args.p_patch}};}};
 return {state,service:new c.PlannerDataService(client)};
}
test('loads every page and the assessments collection',async()=>{const {service}=setup();const result=await service.load('alice');assert.equal(result.tasks.length,501);assert.equal(result.assessments.length,0);});
test('account change during load rejects its result',async()=>{const {state,service}=setup();state.switchOnRead=true;await assert.rejects(service.load('alice'),/Account changed/);});
test('operation from another account never reaches the database',async()=>{const {state,service}=setup();await assert.rejects(service.apply('alice',{table:'tasks',kind:'insert',id:'1',doc:{id:'1',user_id:'bob'}}),/another account/);assert.equal(state.writes,0);});
test('conflicting update is surfaced once without retry',async()=>{const {state,service}=setup();state.conflict=true;await assert.rejects(service.apply('alice',{table:'tasks',kind:'update',id:'1',expected:'previous',base:{user_id:'alice'},patch:{done:true}}),/revision conflict/);assert.equal(state.writes,1);});
test('confirmed update returns its original task identity',async()=>{const {service}=setup();const result=await service.apply('alice',{table:'tasks',kind:'update',id:'1',expected:'previous',base:{user_id:'alice'},patch:{done:true}});assert.equal(result.id,'1');assert.equal(result.done,true);});
