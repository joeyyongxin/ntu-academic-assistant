"""Build an isolated browser fixture. All authentication, records and Storage are synthetic."""
from pathlib import Path
import json

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
for asset in ['backup-recovery','ntulearn-calendar','ntulearn-announcements','ntulearn-sync','ntulearn-library','ntulearn-answers','study-tools','pdf-study-search','timetable-import']:
 html=html.replace(f'src="workspace/{asset}.js"',f'src="../workspace/{asset}.js"')
script=r'''
const fixtureUser={id:'study-fixture-owner',email:'study-fixture@example.invalid'},fixtureToday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let fixturePrefs={years:[{id:'y2026',start:2026,label:'AY2026/27'}],terms:[{id:'s1',yearId:'y2026',label:'Semester 1',name:'Synthetic Semester 1',start:'2026-08-01',end:'2026-12-31',date:fixtureToday,weeks:13,mods:['SC2000','SC1004'],tasks:[],assessments:[],classes:[],topics:{},inbox:[],files:[],timetable:[],hub:[],messages:[],imported:false}],current:'s1',active:'s1',studyYear:'Year 1',n:0,lastByYear:{},theme:null},fixtureRevision=0,fixtureCounter=0;
const fixtureTables={tasks:[{id:'fixture-task-uuid',user_id:fixtureUser.id,title:'Synthetic revision task',module:'SC2000',date:fixtureToday,minutes:30,done:false,updated_at:'v0'}],assessments:[{id:'fixture-assessment-uuid',user_id:fixtureUser.id,title:'Synthetic Quiz 3',module:'SC2000',date:'2026-11-09',updated_at:'v0'}],aa_file_assets:[{id:'fixture-pdf-uuid',user_id:fixtureUser.id,semester_id:'s1',module:'SC2000',name:'Synthetic regression notes.pdf',bytes:PDF_SIZE,mime:'application/pdf',path:fixtureUser.id+'/s1/fixture-pdf-uuid.pdf',created_at:new Date().toISOString()}]};
const fixtureBytes=new Map();
ReferenceCloud.client=async()=>({
 auth:{getUser:async()=>({data:{user:fixtureUser}}),getSession:async()=>({data:{session:{user:fixtureUser}}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};}},
 from(table){let filters=[],low=0,high=499,one=false,inserted=null;const q={select(){return q;},eq(key,value){filters.push([key,value]);return q;},order(){return q;},range(a,b){low=a;high=b;return q;},insert(row){inserted={...row,updated_at:'v'+(++fixtureCounter),created_at:new Date().toISOString()};return q;},single(){one=true;return q;},maybeSingle(){one=true;return q;},then(resolve,reject){if(inserted){fixtureTables[table].push(inserted);return Promise.resolve({data:inserted}).then(resolve,reject);}const rows=(fixtureTables[table]||[]).filter(row=>filters.every(([k,v])=>row[k]===v)).slice(low,high+1);return Promise.resolve({data:one?rows[0]||null:structuredClone(rows)}).then(resolve,reject);}};return q;},
 rpc:async(name,args)=>{if(name==='aa_workspace_load')return {data:{revision:fixtureRevision,payload:structuredClone(fixturePrefs)}};if(name==='aa_workspace_revision')return {data:fixtureRevision};if(name==='aa_workspace_save'){if(args.p_expected_revision!==fixtureRevision)return {error:Error('fixture revision conflict')};fixturePrefs=structuredClone(args.p_payload);return {data:++fixtureRevision};}const table=name==='update_planner_task'?'tasks':'assessments',row=fixtureTables[table].find(x=>x.id===args.p_id);if(!row)return {error:Error('missing fixture record')};Object.assign(row,args.p_patch,{updated_at:'v'+(++fixtureCounter)});return {data:structuredClone(row)};},
 storage:{from(){return {download:async path=>({data:fixtureBytes.get(path)||await (await fetch('../verification/study-sample.pdf')).blob()}),upload:async(path,blob)=>{fixtureBytes.set(path,blob);return {data:{path}};},remove:async()=>({data:[]})};}}
});
'''.replace('PDF_SIZE',str(len(pdf)))
marker='globalThis.ProductionWorkspace={project,flatten,fields,preferencesOf,ProductionBridge};\n})();'
assert marker in html
html=html.replace(marker,marker+'\n'+script)
(root/'tests/study-ui-fixture.html').write_text(html,encoding='utf-8')
print('Built synthetic study tools fixture and two-page PDF. No real service calls.')
