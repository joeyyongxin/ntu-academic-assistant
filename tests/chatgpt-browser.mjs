import {createRequire} from 'node:module';import http from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(new URL('../../test-runtime/package.json',import.meta.url));const {chromium}=require('playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
const server=http.createServer(async(req,res)=>{try{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!target.startsWith(root+path.sep))throw Error();const data=await readFile(target);res.setHeader('Content-Type',target.endsWith('.mjs')||target.endsWith('.js')?'text/javascript':target.endsWith('.html')?'text/html':'text/plain');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 await mkdir(path.join(root,'verification/chatgpt'),{recursive:true});
 for(const width of [1440,390])for(const dark of [false,true]){
  const context=await browser.newContext({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write']});await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/tests/chatgpt-ui.html');await page.getByRole('button',{name:'Set up',exact:true}).waitFor();if(dark)await page.evaluate(()=>document.documentElement.classList.add('dark'));
  assert.equal(await page.getByText('Not connected',{exact:true}).count(),1);
  await page.getByRole('button',{name:'Set up',exact:true}).click();await page.getByText('Requires an eligible ChatGPT account and permission to add custom MCP servers.').waitFor();
  assert.equal(await page.getByRole('link',{name:'Open ChatGPT'}).getAttribute('href'),'https://chatgpt.com/plugins');
  await page.getByRole('button',{name:'Copy URL'}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://synthetic.invalid/mcp');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(root,`verification/chatgpt/setup-${width}-${dark?'dark':'light'}.png`),fullPage:true});
  await page.keyboard.press('Escape');await page.evaluate(()=>Object.assign(synthetic,{status:'Connected',authorized:true,lastSuccess:'2026-11-10T04:00:00Z'}));await page.getByRole('button',{name:'Check connection'}).click();await page.getByText('Connected',{exact:true}).waitFor();await page.getByRole('button',{name:'Disconnect',exact:true}).click();await page.getByText('Not connected',{exact:true}).waitFor();
  const calls=await page.evaluate(()=>synthetic.calls);assert.ok(calls.indexOf('disconnect')<calls.indexOf('provider-revoke'));assert.ok(calls.indexOf('provider-revoke')<calls.indexOf('revocationComplete'));
  await page.evaluate(()=>{synthetic.proposals=[{id:'synthetic-proposal',action:'edit',semester:'s1',before_rows:[{title:'Synthetic revision task'}]}];});await page.getByRole('button',{name:'Open Inbox'}).click();await page.getByText(/Current: Synthetic revision task/).waitFor();await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByText('Synthetic change applied.').waitFor();await page.getByRole('button',{name:'Undo',exact:true}).click();assert.ok((await page.evaluate(()=>synthetic.calls)).includes('undo'));
  assert.deepEqual(errors,[]);console.log(`PASS synthetic Settings/setup/Inbox/Undo ${width}px ${dark?'dark':'light'}; no page errors or horizontal overflow`);await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
