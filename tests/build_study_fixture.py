"""Build an isolated browser fixture. All authentication, records and Storage are synthetic."""
from pathlib import Path
import json, sys

root=Path(__file__).resolve().parent.parent
verify=root/'verification'
verify.mkdir(exist_ok=True)
# Small, real two-page PDF with selectable Helvetica text; no external assets.
objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
 b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
for content in [b'BT /F1 18 Tf 72 720 Td (Synthetic SC2000 lecture notes) Tj ET',b'BT /F1 16 Tf 72 720 Td (Quiz 3 covers regression and probability.) Tj 0 -30 Td (This page is a synthetic search fixture.) Tj ET']:
 objects.append(b'<< /Length '+str(len(content)).encode()+b' >>\nstream\n'+content+b'\nendstream')
pdf=bytearray(b'%PDF-1.4\n');offsets=[0]
for i,obj in enumerate(objects,1):offsets.append(len(pdf));pdf+=str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
start=len(pdf);pdf+=b'xref\n0 8\n0000000000 65535 f \n'+b''.join(f'{n:010d} 00000 n \n'.encode() for n in offsets[1:])+b'trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n'+str(start).encode()+b'\n%%EOF\n'
(verify/'study-sample.pdf').write_bytes(pdf)
html=(root/'index.html').read_text(encoding='utf-8').replace('<script src="config.js"></script>','<script>window.PLANNER_CONFIG={supabaseUrl:"https://fixture.invalid",supabaseAnonKey:"sb_publishable_fixture"};</script>').replace('src="data-service.js"','src="../data-service.js"')
html=html.replace('src="ui/date-nav.js"','src="../ui/date-nav.js"')
for asset in ['ui/primitives.js','state/workspace-provider.js','state/record-trash.js','state/change-pipeline.js','library/library-model.js','library/ntulearn-setup-model.js']:html=html.replace('src="'+asset+'"','src="../'+asset+'"')
for asset in ['backup-recovery','ntulearn-calendar','ntulearn-announcements','ntulearn-sync','ntulearn-library','ntulearn-answers','study-tools','pdf-study-search','timetable-import','planner-refinements','workspace-trash']:
 html=html.replace(f'src="workspace/{asset}.js"',f'src="../workspace/{asset}.js"')
script=r'''
const fixtureUser={id:'study-fixture-owner',email:'study-fixture@example.invalid'},fixtureToday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let fixturePrefs={years:[{id:'y2026',start:2026,label:'AY2026/27'}],terms:[{id:'s1',yearId:'y2026',label:'Semester 1',name:'Synthetic Semester 1',start:'2026-08-01',end:'2026-12-31',date:fixtureToday,weeks:13,mods:['SC2000','SC1004'],tasks:[],assessments:[],classes:[],topics:{},inbox:[],files:[],timetable:[],hub:[],messages:[],imported:false}],current:'s1',active:'s1',studyYear:'Year 1',n:0,lastByYear:{},theme:null},fixtureRevision=0,fixtureCounter=0;
const fixtureTables={tasks:[{id:'fixture-task-uuid',user_id:fixtureUser.id,title:'Synthetic revision task',module:'SC2000',date:fixtureToday,minutes:30,done:false,updated_at:'v0'}],assessments:[{id:'fixture-assessment-uuid',user_id:fixtureUser.id,title:'Synthetic Quiz 3',module:'SC2000',date:'2026-11-09',updated_at:'v0'}],aa_file_assets:[{id:'fixture-pdf-uuid',user_id:fixtureUser.id,semester_id:'s1',module:'SC2000',name:'Synthetic regression notes.pdf',bytes:PDF_SIZE,mime:'application/pdf',path:fixtureUser.id+'/s1/fixture-pdf-uuid.pdf',created_at:new Date().toISOString()}]};
const fixtureBytes=new Map();
ReferenceCloud.client=async()=>({
 auth:{getUser:async()=>({data:{user:fixtureUser}}),getSession:async()=>({data:{session:{user:fixtureUser}}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};}},
 from(table){let filters=[],low=0,high=499,one=false,inserted=null,deleting=false;const q={delete(){deleting=true;return q;},select(){return q;},eq(key,value){filters.push([key,value]);return q;},order(){return q;},range(a,b){low=a;high=b;return q;},insert(row){inserted={...row,updated_at:'v'+(++fixtureCounter),created_at:new Date().toISOString()};return q;},single(){one=true;return q;},maybeSingle(){one=true;return q;},then(resolve,reject){if(deleting){fixtureTables[table]=(fixtureTables[table]||[]).filter(row=>!filters.every(([k,v])=>row[k]===v));return Promise.resolve({data:[]}).then(resolve,reject);}if(inserted){fixtureTables[table].push(inserted);return Promise.resolve({data:inserted}).then(resolve,reject);}const rows=(fixtureTables[table]||[]).filter(row=>filters.every(([k,v])=>row[k]===v)).slice(low,high+1);return Promise.resolve({data:one?rows[0]||null:structuredClone(rows)}).then(resolve,reject);}};return q;},
 rpc:async(name,args)=>{if(name==='aa_workspace_load')return {data:{revision:fixtureRevision,payload:structuredClone(fixturePrefs)}};if(name==='aa_workspace_revision')return {data:fixtureRevision};if(name==='aa_workspace_save'){if(args.p_expected_revision!==fixtureRevision)return {error:Error('fixture revision conflict')};fixturePrefs=structuredClone(args.p_payload);return {data:++fixtureRevision};}const table=name==='update_planner_task'?'tasks':'assessments',row=fixtureTables[table].find(x=>x.id===args.p_id);if(!row)return {error:Error('missing fixture record')};Object.assign(row,args.p_patch,{updated_at:'v'+(++fixtureCounter)});return {data:structuredClone(row)};},
 storage:{from(){return {download:async path=>({data:fixtureBytes.get(path)||await (await fetch('../verification/study-sample.pdf')).blob()}),upload:async(path,blob)=>{fixtureBytes.set(path,blob);return {data:{path}};},remove:async()=>({data:[]})};}}
});
'''.replace('PDF_SIZE',str(len(pdf)))
if '--audit' in sys.argv:
 script=script.replace('const fixtureBytes=new Map();',"\nfixturePrefs.years.push({id:'y2027',start:2027,label:'AY2027/28'});\nfixturePrefs.terms.push({...structuredClone(fixturePrefs.terms[0]),id:'s2',yearId:'y2027',label:'Semester 1',name:'AY2027/28 Semester 1',start:'2027-08-01',end:'2027-12-31',date:'2027-08-01',mods:[]});\nfixturePrefs.terms[0].topics.SC2000=[['Regression',0,0]];\nfixturePrefs.terms[0].timetable=[{id:'fixture-class',mod:'SC2000',d:'Mon',at:9,range:'09:00–10:00',kind:'Lecture',venue:'LT1'}];\nfixturePrefs.terms[0].inbox=[{id:999,t:'semester',s:'p',mod:'SC2000',title:'Review Quiz 3 announcement',date:'2026-11-07',min:20}];\nfixturePrefs.terms[0].hub=[{id:777,type:'ann',mod:'SC2000',title:'Quiz 3 announcement',date:'2026-11-06',desc:'Quiz 3 is on 9 November at 10:00.',origin:'Fixture source',url:'',unread:true}];\nfixtureTables.tasks.push({id:'fixture-monday',user_id:fixtureUser.id,title:'Quick warm-up + individual viva',module:'SC2000',date:'2026-11-02',minutes:10,done:true,updated_at:'v0'});\n\nconst fixtureBytes=new Map();")
if '--library' in sys.argv:
 script += r"""
fixturePrefs.terms[0].hub.push({id:778,type:'file',mod:'SC2000',title:'Lecture notes — regression',date:fixtureToday,desc:'Synthetic course material with a saved PDF attachment.',origin:'Fixture connector',url:'https://ntulearn.ntu.edu.sg/fixture-notes',ntulearnSyncKey:'fixture-material-key',unread:true});
fixturePrefs.terms[0].libraryLinks={'fixture-pdf-uuid':{materialId:778,sourceKey:'fixture-material-key'}};
fixtureTables.aa_file_assets.push({...fixtureTables.aa_file_assets[0],id:'fixture-upload-2',name:'SC1004 Revision.pdf',module:'SC1004',path:fixtureUser.id+'/s1/fixture-upload-2.pdf'});
"""
if '--setup' in sys.argv:
 script += r"""
let fixtureConnectorPaired=false,fixtureSetupAt=new Date().toISOString();
const fixtureSetupSnapshot=()=>({format:'academic-assistant-ntulearn-sync',schemaVersion:1,exportedAt:fixtureSetupAt,warnings:[],items:[['exact','SC2000 Introduction'],['ambiguous','SC2000 / SC1004 Combined'],['unmatched','Other course']].map(([id,name])=>({id,courseId:id,courseName:name,kind:id==='exact'?'file':'ann',title:'Synthetic '+name,text:'Synthetic setup listing.',date:fixtureToday,deadlineDate:'',url:'https://ntulearn.ntu.edu.sg/fixture-'+id}))});
window.addEventListener('message',event=>{const m=event.data;if(event.source!==window||m?.channel!=='aa-ntu-request')return;let data;if(m.type==='APP_CONNECT'){fixtureConnectorPaired=true;data={approvalRequired:true};}else if(m.type==='APP_DISCONNECT'){fixtureConnectorPaired=false;data={disconnected:true};}else if(m.type==='APP_STATUS')data={paired:fixtureConnectorPaired,libraryApproved:true,capabilities:['pdf-library','sync-now'],auto:true,lastSync:new Date().toISOString(),count:3};else if(m.type==='APP_SYNC'){fixtureSetupAt=new Date().toISOString();data={synced:true};}else if(m.type==='APP_SNAPSHOT')data=fixtureSetupSnapshot();else if(m.type==='APP_PDF_LIST')data={files:[]};else return;window.postMessage({channel:'aa-ntu-response',id:m.id,ok:true,data},location.origin);});
"""
if '--inbox' in sys.argv:
 script += r"""
window.addEventListener('message',event=>{const m=event.data;if(event.source!==window||m?.channel!=='aa-ntu-request'||m.type!=='APP_SNAPSHOT')return;window.postMessage({channel:'aa-ntu-response',id:m.id,ok:true,data:{format:'academic-assistant-ntulearn-sync',schemaVersion:1,exportedAt:new Date().toISOString(),warnings:[],items:[{id:'fixture-material',courseId:'fixture-course',courseName:'SC2000',kind:'file',title:'Synthetic lecture notes',text:'Fixture material listing.',date:fixtureToday,deadlineDate:'',url:'https://ntulearn.ntu.edu.sg/fixture-notes'}]}},location.origin);});
"""
marker='globalThis.ProductionWorkspace={project,flatten,fields,preferencesOf,ProductionBridge};\n})();'
assert marker in html
html=html.replace(marker,marker+'\n'+script)
(root/'tests/study-ui-fixture.html').write_text(html,encoding='utf-8')
print('Built synthetic study tools fixture and two-page PDF. No real service calls.')
