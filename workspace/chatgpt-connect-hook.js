// Personal connection setup. No credentials or inferred authentication state.
(() => {
 const url='https://academic-assistant-mcp.onrender.com/mcp';
 const plugin='https://chatgpt.com/plugins/plugin_asdk_app_6af339ded2248191a049c3ef85c2d1e4';
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const scope=()=>WorkspaceProvider.scope();
 let overlay,overlayScope,proof,notice='',busy=false;
 const valid=()=>proof&&proof.scope===scope()&&Date.parse(proof.expiresAt)>Date.now()?proof:null;
 const say=text=>{notice=text;const n=document.getElementById('chatgptConnectionNotice');if(n)n.textContent=text;};
 const button=(text,fn,primary=false)=>{const n=el('button',text,'btn'+(primary?' p':''));n.type='button';n.onclick=fn;return n;};
 async function copy(text){try{await navigator.clipboard.writeText(text);PlannerUI.UndoToast.show('Copied');}catch{say('Select and copy the displayed text manually.');}}
 async function request(body){
  const r=await fetch(url.replace(/\/mcp$/,'/connection-check'),{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Live verification is not enabled on this server yet. Existing ChatGPT task tools can still work.');
  return r.json();
 }
 window.startPersonalChatGPTCheck=async function(){
  if(busy)return;const initial=scope();busy=true;say('Starting a live check...');
  try{const r=await request({action:'start'});if(scope()!==initial)return;
   if(!/^[a-f0-9]{48}$/.test(r.id||'')||!Number.isFinite(Date.parse(r.expiresAt)))throw Error('Invalid verification response.');
   proof={...r,scope:initial};window.openPersonalChatGPTSetup(true);
  }catch(e){if(scope()===initial)say('Verification unavailable. '+e.message+' This does not mean you are disconnected.');}finally{busy=false;}
 };
 window.checkPersonalChatGPTResult=async function(){
  const p=valid();if(!p){say('Start a new check: the previous code expired or belongs to another account/semester.');return;}if(busy)return;busy=true;
  try{const r=await request({action:'check',id:p.id});if(valid()!==p)return;
   say(r.status==='verified'?'Personal connector verified by an authenticated tool call. This proof expires after five minutes and does not verify multi-user linking.':'Waiting for the verification tool call in ChatGPT.');
  }catch(e){if(valid()===p)say(e.message);}finally{busy=false;}
 };
 window.openPersonalChatGPTSetup=function(rebuild=false){
  if(overlay?.isConnected&&overlayScope===scope()&&!rebuild){PlannerUI.Sheet.open(overlay,document.activeElement);return;}
  if(overlay?.isConnected){PlannerUI.Sheet.close(overlay);overlay.remove();}
  if(overlayScope!==scope()){proof=null;notice='';}overlayScope=scope();const card=el('section',undefined,'card connection-sheet');
  card.append(el('h2','Connect ChatGPT'),el('p','Use NTU Academic Assistant, your working personal planner connection.','sub'));
  const link=el('a','Open NTU Academic Assistant','btn p');link.href=plugin;link.target='_blank';link.rel='noopener noreferrer';card.append(link);
  const steps=el('ol');for(const text of ['Open NTU Academic Assistant and connect if prompted. Use the Auth0 identity authorized by the server; its email can differ from your ChatGPT email.','For manual setup: Plugins > Add > Add custom MCP server. Use the URL below and OAuth. Choose a unique name if needed.','In a new chat select @NTU Academic Assistant and ask for your unfinished tasks without changing anything.'])steps.append(el('li',text));card.append(steps);
  const label=el('label','Connector URL'),input=el('input');input.className='btn';input.readOnly=true;input.value=url;label.append(input);card.append(label,button('Copy URL',()=>copy(url)),button('Start live connection check',()=>window.startPersonalChatGPTCheck()));
  const p=valid();if(p){const prompt='Use verifyPlannerConnection with code '+p.id+'. Do not change tasks or assessments.';card.append(el('p','Send this in ChatGPT, then check the result here. The code expires after five minutes.','sub'),el('pre',prompt,'connection-proof'),button('Copy verification request',()=>copy(prompt)),button('Check result',()=>window.checkPersonalChatGPTResult()));}
  const status=el('p',notice||'Not checked here. Opening ChatGPT or installing a plugin does not verify live access.','sub');status.id='chatgptConnectionNotice';status.setAttribute('role','status');card.append(status);
  card.append(el('p','Requires an eligible ChatGPT account and permission to add custom MCP servers.','sub'),el('p','Disconnect and revoke access in ChatGPT. This page cannot revoke its grant. This connector is personal; it does not link other students to their planners.','sub'));
  overlay=PlannerUI.Sheet.create({key:'chatgpt-personal',content:card,title:'Connect ChatGPT',open:true,trigger:document.activeElement});
 };
 window.openNTULearnConnectionSheet=function(){const n=document.getElementById('ntuConnectionContent');if(n){n.onmousedown=e=>{if(e.target===n)PlannerUI.Sheet.close(n);};PlannerUI.Sheet.open(n,document.activeElement);}};
 window.checkNTUConnectionStatus=async function(){
  const before=scope(),node=document.getElementById('ntuConnectionSummary');if(node)node.textContent='Checking browser connector...';
  try{const result=await ntuRequest('APP_STATUS',ntuContext());if(scope()!==before)return;
   if(node)node.textContent=!result.paired?'Not connected for this account and semester.':result.error?'Needs attention: '+result.error:result.lastSync?'Snapshot saved '+new Date(result.lastSync).toLocaleString()+'; '+Number(result.count||0)+' items. This does not confirm PDFs are saved.':'Connected; no saved snapshot yet.';
  }catch(error){if(scope()===before&&node)node.textContent='Needs attention: '+error.message;}
 };
 const base=settings;
 settings=function(){
  const t=document.createElement('template');t.innerHTML=base();
  for(const row of [...t.content.querySelectorAll('.set')])if(row.querySelector('span')?.textContent.trim().startsWith('ChatGPT'))row.remove();
  const card=[...t.content.querySelectorAll('.card')].find(n=>n.querySelector('h2')?.textContent==='Connections')||el('section',undefined,'card');card.classList.add('connections-card');if(!card.querySelector('h2'))card.append(el('h2','Connections'));
  function row(title,description,action,handler){const n=el('div',undefined,'set connection-row'),label=el('span',title);label.append(el('br'),el('small',description,'sub'));const b=el('button',action,'btn');b.type='button';b.setAttribute('onclick',handler+'()');n.append(label,b);card.append(n);}
  row('ChatGPT','NTU Academic Assistant. Verify live access in setup.','Set up ChatGPT','openPersonalChatGPTSetup');
  const ntu=t.content.querySelector('.ntu-connection');
  if(ntu){
   row('NTULearn','Course updates and materials. PDFs save while the planner is open.','Manage NTULearn','openNTULearnConnectionSheet');
   const back=el('div',undefined,'mback');back.id='ntuConnectionContent';back.setAttribute('role','dialog');back.setAttribute('aria-modal','true');back.setAttribute('aria-label','NTULearn connection');
   ntu.classList.add('connection-sheet','sheet');const status=el('p','Not checked in this session.','sub');status.id='ntuConnectionSummary';status.setAttribute('role','status');const refresh=el('button','Check NTULearn status','btn');refresh.type='button';refresh.setAttribute('onclick','checkNTUConnectionStatus()');ntu.append(refresh,status);const p=ntu.querySelector('p');if(p)p.textContent='Approve your account and semester, then choose courses below. Browser refresh needs a running browser and valid NTULearn login. PDFs save to Library only while the planner is open. A material link alone is not a saved PDF.';
   const close=el('button','Close','btn');close.type='button';close.setAttribute('aria-label','Close NTULearn connection');close.setAttribute('onclick',"PlannerUI.Sheet.close(document.getElementById('ntuConnectionContent'))");ntu.prepend(close);ntu.replaceWith(back);back.append(ntu);
  }
  t.content.append(card);return t.innerHTML;
 };
 const style=el('style');style.textContent='.connection-row{gap:12px;align-items:center;flex-wrap:wrap}.connection-row>span{flex:1 1 240px;min-width:0}.connection-sheet{width:min(680px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box}.connection-sheet p{max-width:70ch}.connection-sheet a.btn{display:inline-flex;text-decoration:none}.connection-sheet input{display:block;width:100%;box-sizing:border-box;margin:6px 0 10px}.connection-sheet li{margin:12px 0}.connection-sheet ol{padding-left:24px}.connection-proof{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;border:1px solid var(--ln);padding:12px;border-radius:8px}.connection-sheet .btn{margin:4px;max-width:100%;white-space:normal}';document.head.append(style);
 if(location.hash==='#settings')go();
})();
