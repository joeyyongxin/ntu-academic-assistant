import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const c=vm.createContext({TextEncoder,Date,Set,JSON,Error});
vm.runInContext(await readFile(new URL('../workspace/ntulearn-calendar.js',import.meta.url),'utf8'),c);
const api=c.NTULearnCalendar,ics=body=>'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'+body+'\r\nEND:VCALENDAR',event=props=>'BEGIN:VEVENT\r\nUID:example-1\r\nSUMMARY:SC1001 Quiz\r\n'+props+'\r\nEND:VEVENT';
test('ignores timezone history and converts UTC dates to Singapore across midnight',()=>{
 const p=api.parse(ics('BEGIN:VTIMEZONE\r\nDTSTART:19010101T010435\r\nEND:VTIMEZONE\r\n'+event('DTSTART:20261103T180000Z')));assert.equal(p.events.length,1);assert.equal(p.events[0].date,'2026-11-04');assert.equal(p.events[0].time,'02:00');
});
test('reads Singapore, all-day and floating dates and unfolds escaped text',()=>{
 const e=api.parse(ics(event('DTSTART;TZID=Asia/Singapore:20261103T090000\r\nDESCRIPTION:First\\nSecond\\,\r\n continued'))).events[0];assert.equal(e.time,'09:00');assert.equal(e.description,'First\nSecond,continued');assert.equal(e.suggestedModules[0],'SC1001');
 assert.equal(api.parse(ics(event('DTSTART;VALUE=DATE:20261103'))).events[0].allDay,true);
 assert.equal(api.parse(ics(event('DTSTART:20261103T090000'))).events[0].floating,true);
});
test('skips recurrence, cancellation, invalid dates and unsupported timezone without inventing events',()=>{
 for(const props of ['DTSTART:20261103T090000\r\nRRULE:FREQ=WEEKLY','DTSTART:20261103T090000\r\nSTATUS:CANCELLED','DTSTART:20260230T090000','DTSTART;TZID=Unknown/Zone:20261103T090000']){const p=api.parse(ics(event(props)));assert.equal(p.events.length,0);assert.equal(p.warnings.length,1);}
});
test('nested alarms cannot replace event title or start date; import key is stable',()=>{
 const p=api.parse(ics(event('DTSTART:20261103T090000\r\nBEGIN:VALARM\r\nSUMMARY:Alarm\r\nEND:VALARM')));assert.equal(p.events[0].title,'SC1001 Quiz');assert.equal(api.key(p.events[0]),api.key({...p.events[0],title:'Updated quiz'}));
});
test('rejects non-calendar and unfinished input',()=>{assert.throws(()=>api.parse('<html>Login</html>'));assert.throws(()=>api.parse(ics('BEGIN:VEVENT\r\nUID:a')));});
test('both HTML entry points parse and include the import hook',async()=>{
 for(const file of ['index.html','workspace.html']){const html=await readFile(new URL('../'+file,import.meta.url),'utf8');assert.ok(html.includes('previewNTULearnCalendar'));for(const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);}
});
const hook=await readFile(new URL('../workspace/ntulearn-import-hook.js',import.meta.url),'utf8');
function setupImport(){const error={textContent:''},ctx=vm.createContext({NTULearnCalendar:api,settings:()=>'',ReferenceCloud:{user:{id:'owner'}},active:'s1',HUB:[],MODS:['SC1001'],recordWritable(){},recordDate(d){if(d<'2026-08-01'||d>'2026-12-31')throw Error('Date outside semester');return d},nextHubId:a=>a.length+1,go(){},esc:s=>s,document:{querySelectorAll:()=>[{dataset:{ntuSelect:'0'}}],querySelector:s=>({value:s.includes('module')?'SC1001':'ann'}),getElementById:()=>error}});ctx.window=ctx;vm.runInContext(hook,ctx);vm.runInContext("calendarPreview={owner:'owner',semester:'s1',events:[{uid:'event-1',date:'2026-11-03',time:'09:00',title:'Review me',description:'Source notes'}]}",ctx);return {ctx,error};}
test('review save adds a Hub item only, preserving a source key for duplicate detection',()=>{const {ctx}=setupImport();ctx.saveNTULearnCalendar();assert.equal(ctx.HUB.length,1);assert.equal(ctx.HUB[0].type,'ann');assert.equal(ctx.HUB[0].calendarSourceKey,api.key({uid:'event-1',date:'2026-11-03',time:'09:00'}));vm.runInContext("calendarPreview={owner:'owner',semester:'s1',events:[{uid:'event-1',date:'2026-11-03',time:'09:00',title:'Review me',description:''}]}",ctx);ctx.saveNTULearnCalendar();assert.equal(ctx.HUB.length,1);});
test('account changes, blocked saves and invalid module choices cannot import records',()=>{for(const change of ["active='s2'","ReferenceCloud.user.id='another'","recordWritable=()=>{throw Error('blocked')}","MODS=[]"]){const {ctx,error}=setupImport();vm.runInContext(change,ctx);ctx.saveNTULearnCalendar();assert.equal(ctx.HUB.length,0);assert.ok(error.textContent);}});
