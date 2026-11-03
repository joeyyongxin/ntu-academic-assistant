import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=html.split('/* v2.10: Home date picker, study-week navigation, compact task actions */')[1].split('/* v2.12:')[0];
function setup(start='2026-11-04',end='2026-11-18'){
 const c=vm.createContext({Intl:{DateTimeFormat:class{format(){return '2026-11-03';}}},Date,active:'test',TODAY:start,term:()=>({start,end}),sh:(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10),go(){},today:()=>'',plan:()=>'<h1>Next 7 days</h1><div class="wk">',detail:()=>'',add(){},location:{hash:'#today'}});
 vm.runInContext('window=globalThis;',c);vm.runInContext(source,c);c.homeViewedDate();return c;
}
const selected=c=>c.plan().match(/type="date" value="([^"]+)"/)[1];
test('first partial week selects the semester start while displaying Monday to Sunday',()=>{const c=setup();assert.equal(selected(c),'2026-11-04');assert.match(c.plan(),/2 Nov – 8 Nov 2026/);assert.match(c.plan(),/weekShift\(-1\)" disabled/);});
test('week navigation reaches the last partial week and stops at both semester edges',()=>{const c=setup();c.weekShift(1);assert.equal(selected(c),'2026-11-09');c.weekShift(1);assert.equal(selected(c),'2026-11-16');assert.match(c.plan(),/weekShift\(1\)" disabled/);c.weekShift(1);assert.equal(selected(c),'2026-11-16');c.weekShift(-1);c.weekShift(-1);c.weekShift(-1);assert.equal(selected(c),'2026-11-04');});
test('jumping weeks does not change the Home date or global date',()=>{const c=setup();c.homePick('2026-11-06');c.weekPick('2026-11-18');assert.equal(selected(c),'2026-11-16');assert.equal(c.homeViewedDate(),'2026-11-06');assert.equal(c.TODAY,'2026-11-04');c.weekReset();assert.equal(selected(c),'2026-11-04');});
test('a Monday semester start is preserved',()=>{assert.equal(selected(setup('2026-11-02','2026-11-22')),'2026-11-02');});
