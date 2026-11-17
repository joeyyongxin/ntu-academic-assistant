import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../test-runtime/package.json',import.meta.url));
const {chromium}=require('playwright');
const root=new URL('../',import.meta.url);
const [hook,primitives,provider]=await Promise.all(['workspace/chatgpt-connect-hook.js','ui/primitives.js','state/workspace-provider.js'].map(p=>readFile(new URL(p,root),'utf8')));
const fixture=`<!doctype html><html><head><style>:root{--ln:#ccd1dc}body{font:16px system-ui;background:#f2f4f8;color:#15213b;margin:16px}.dark body{background:#172033;color:#edf0fa}.card{padding:18px;border:1px solid var(--ln);border-radius:10px}.set{display:flex}.btn{padding:10px;border:1px solid var(--ln);border-radius:8px;color:inherit;background:transparent;cursor:pointer}.sub{font-size:14px}.mback{display:none;position:fixed;inset:0;padding:16px;background:#0006;align-items:center;justify-content:center}.mback.open{display:flex}.sheet{position:relative;background:#fff;color:#15213b}.dark .sheet{background:#172033;color:#edf0fa}.mx{float:right}input{font:inherit}main{max-width:1000px;margin:auto}</style></head><body><main id="content"></main><script>${primitives}</script><script>${provider}</script><script>
WorkspaceProvider.state.account={id:'synthetic-A'};
window.AA_PERSONAL_CONNECTION_CHECK_ENABLED=true;
window.synthetic={verified:false,fail:false,paired:true,lastSync:null,error:null,calls:[]};
window.fetch=async(url,options)=>{const body=JSON.parse(options.body);synthetic.calls.push(body);if(synthetic.fail)throw Error('Server unavailable');return {ok:true,json:async()=>body.action==='start'?{id:'a'.repeat(48),status:'pending',expiresAt:new Date(Date.now()+300000).toISOString()}:{status:synthetic.verified?'verified':'pending'}};};
window.ntuRequest=async()=>({paired:synthetic.paired,lastSync:synthetic.lastSync,count:12,error:synthetic.error});window.ntuContext=()=>({});
window.settings=()=>'<section class="card"><h2>General</h2><div class="set"><span>ChatGPT assistant</span><button>Old setup</button></div></section><section class="card ntu-connection"><h2>NTULearn connection</h2><p>Old description</p><label><input type="checkbox" id="existingPDFToggle">Keep PDFs in Library</label></section>';
window.go=()=>document.getElementById('content').innerHTML=settings();
</script><script>${hook}</script><script>go()</script></body></html>`;
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fixture);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;try{
 browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 await mkdir(new URL('verification/connections/',root),{recursive:true});
 for(const width of [1440,390])for(const dark of [false,true]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+server.address().port;await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base);if(dark)await page.evaluate(()=>document.documentElement.classList.add('dark'));
  assert.equal(await page.getByRole('heading',{name:'Connections',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Old setup'}).count(),0);
  await page.getByRole('button',{name:'Set up ChatGPT',exact:true}).click();await page.getByText('Not checked here.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Open NTU Academic Assistant'}).getAttribute('href'),'https://chatgpt.com/plugins/plugin_asdk_app_6af339ded2248191a049c3ef85c2d1e4');
  await page.getByRole('button',{name:'Start live connection check'}).click();await page.getByRole('button',{name:'Check result',exact:true}).waitFor();
  await page.getByRole('button',{name:'Check result',exact:true}).click();await page.getByText('Waiting for the verification tool call in ChatGPT.').waitFor();
  await page.evaluate(()=>synthetic.verified=true);await page.getByRole('button',{name:'Check result',exact:true}).click();await page.getByText('Personal connector verified by an authenticated tool call.',{exact:false}).waitFor();
  await page.screenshot({path:new URL('verification/connections/chatgpt-'+width+'-'+(dark?'dark':'light')+'.png',root).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
  await page.evaluate(()=>WorkspaceProvider.state.account={id:'synthetic-B'});await page.getByRole('button',{name:'Check result',exact:true}).click();await page.getByText('Start a new check:',{exact:false}).waitFor();
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Manage NTULearn'}).click();await page.getByRole('button',{name:'Check NTULearn status'}).click();await page.getByText('Connected; no saved snapshot yet.').waitFor();
  await page.evaluate(()=>synthetic.lastSync='2026-11-17T01:00:00Z');await page.getByRole('button',{name:'Check NTULearn status'}).click();await page.getByText('This does not confirm PDFs are saved.',{exact:false}).waitFor();
  await page.evaluate(()=>synthetic.error='Login expired');await page.getByRole('button',{name:'Check NTULearn status'}).click();await page.getByText('Needs attention: Login expired').waitFor();
  await page.evaluate(()=>synthetic.paired=false);await page.getByRole('button',{name:'Check NTULearn status'}).click();await page.getByText('Not connected for this account and semester.').waitFor();
  await page.locator('#existingPDFToggle').check();assert.equal(await page.locator('#existingPDFToggle').isChecked(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:new URL('verification/connections/ntulearn-'+width+'-'+(dark?'dark':'light')+'.png',root).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Set up ChatGPT',exact:true}).click();await page.evaluate(()=>synthetic.fail=true);await page.getByRole('button',{name:'Start live connection check'}).click();await page.getByText('Verification unavailable.',{exact:false}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS synthetic connection sheets, scoped live proof, NTULearn statuses, existing control, failure, overflow '+width+' '+(dark?'dark':'light'));await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
