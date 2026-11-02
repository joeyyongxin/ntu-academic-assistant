from pathlib import Path
root=Path(__file__).resolve().parent.parent
html=(root/'workspace.html').read_text(encoding='utf-8')
html=html.replace('<script src="config.js"></script>','<script>window.PLANNER_CONFIG={supabaseUrl:"https://fixture.invalid",supabaseAnonKey:"sb_publishable_fixture"};</script>').replace('src="data-service.js"','src="../data-service.js"')
script="""
let fixtureVersion='one';
const fixtureRemote=document.createElement('button');fixtureRemote.textContent='Simulate remote update (fixture)';fixtureRemote.style.cssText='position:fixed;right:8px;top:8px;z-index:100';fixtureRemote.onclick=()=>{fixtureVersion='two';window.dispatchEvent(new Event('focus'));};document.body.append(fixtureRemote);
ReferenceCloud.client=async()=>{
 const user={id:'fixture-user',email:'fixture@example.invalid'},date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user}}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};}},
 from(table){let low=0,high=499;const q={select(){return q;},eq(){return q;},order(){return q;},range(a,b){low=a;high=b;return q;},then(resolve){return Promise.resolve({data:(table==='tasks'?[{id:'fixture-task',user_id:user.id,title:fixtureVersion==='one'?'Fixture study task':'Remote changed task',module:'SC1004',date,minutes:30,done:false,updated_at:fixtureVersion}]:[]).slice(low,high+1)}).then(resolve);}};return q;},
 rpc:async name=>({data:name==='aa_workspace_load'?{revision:0,payload:null}:0})};
};
"""
marker='globalThis.ProductionWorkspace={project,flatten,fields,preferencesOf,ProductionBridge};\n})();'
assert marker in html
html=html.replace(marker,marker+'\n'+script)
(root/'tests/ui-workspace.html').write_text(html,encoding='utf-8')
print('Built isolated UI fixture. No real credentials or external requests.')
