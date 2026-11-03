import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/^function load\(id\)\{.*\}$/m)[0];
function setup(){
 const make=(id,yearId)=>({id,yearId,name:id,date:'2026-11-03',mods:[id],tasks:[{title:id}],classes:[],topics:{},inbox:[],files:[],assessments:[],timetable:[],hub:[],imported:false});
 const terms=[make('one','year1'),make('two','year2')],captured=[];
 const c=vm.createContext({terms,active:'one',lastByYear:{},mod:'old',q:'old search',fm:'old module',filePreview:'old preview',hubTab:'files',hubMod:'old module',capture(){captured.push(c.active);},term(){return terms.find(t=>t.id===c.active);}});
 vm.runInContext(source,c);return {c,terms,captured};
}
test('switching selects only the destination semester records and module enrolments',()=>{const {c,terms,captured}=setup();c.load('two');assert.equal(c.active,'two');assert.equal(c.T,terms[1].tasks);assert.equal(c.MODS,terms[1].mods);assert.equal(c.AS,terms[1].assessments);assert.equal(c.IN,terms[1].inbox);assert.equal(c.CL,terms[1].timetable);assert.equal(c.HUB,terms[1].hub);assert.deepEqual(captured,['one']);});
test('switching clears module selection, file filters and course filters',()=>{const {c}=setup();c.load('two');assert.equal(c.mod,null);for(const key of ['q','fm','filePreview'])assert.equal(c[key],'');assert.equal(c.hubTab,'all');assert.equal(c.hubMod,'all');});
test('switching back retains the previous semester records and remembers each year selection',()=>{const {c,terms}=setup();c.load('two');c.T.push({title:'new task'});c.load('one');assert.equal(c.T,terms[0].tasks);assert.equal(c.T.length,1);assert.equal(terms[1].tasks.length,2);assert.equal(c.lastByYear.year1,'one');assert.equal(c.lastByYear.year2,'two');});
