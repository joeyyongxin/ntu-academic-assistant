// Setup UI for the existing personal connector. No account/auth/data changes.
(() => {
 const connectorUrl='https://academic-assistant-mcp.onrender.com/mcp';
 const chatgptUrl='https://chatgpt.com/plugins';
 const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 let overlay;
 window.openPersonalChatGPTSetup=function(){
  if(overlay?.isConnected){PlannerUI.Sheet.open(overlay,document.activeElement);return;}
  const card=element('section',undefined,'card chatgpt-personal-sheet');
  card.append(element('h2','Connect ChatGPT'),element('p','Use your existing personal Academic Assistant connection.','sub'));
  const open=element('a','Open ChatGPT','btn p');open.href=chatgptUrl;open.target='_blank';open.rel='noopener noreferrer';card.append(open);
  const steps=element('ol');
  for(const text of ['Open Academic Assistant in ChatGPT and select Authenticate or Reconnect if prompted.','If it is not installed, go to Plugins → + → Add custom MCP server. Paste the URL below, choose OAuth, then sign in and approve access.','Start a new chat, select @Academic Assistant and ask: “Add a study task…”'])steps.append(element('li',text));
  card.append(steps);
  const label=element('label','Connector URL'),input=element('input');input.type='text';input.readOnly=true;input.value=connectorUrl;input.className='btn';label.append(input);card.append(label);
  const copy=element('button','Copy URL','btn');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(connectorUrl);PlannerUI.UndoToast.show('Connector URL copied');}catch{input.focus();input.select();PlannerUI.UndoToast.show('Select the URL and copy it manually.');}};card.append(copy);
  card.append(element('p','Requires an eligible ChatGPT account and permission to add custom MCP servers.','sub'),element('p','Connection status and disconnection are managed in ChatGPT. This existing personal connector does not enable other students to link their own planners yet.','sub'));
  overlay=PlannerUI.Sheet.create({key:'chatgpt-personal',content:card,title:'Connect ChatGPT',open:true,trigger:document.activeElement});
 };
 const originalSettings=settings;
 settings=function(){
  const template=document.createElement('template');template.innerHTML=originalSettings();
  let row=[...template.content.querySelectorAll('.set')].find(node=>node.querySelector('span')?.textContent.trim().startsWith('ChatGPT assistant'));
  if(!row){const card=element('section',undefined,'card');card.append(element('h2','ChatGPT'));row=element('div',undefined,'set');card.append(row);template.content.append(card);}
  row.classList.add('chatgpt-connect-row');
  const label=element('span','ChatGPT','chatgpt-connect-label');label.append(element('br'),element('small','Set up your existing personal planner connection.','sub'));
  const connect=element('button','Connect ChatGPT','btn p');connect.type='button';connect.setAttribute('onclick','openPersonalChatGPTSetup()');row.replaceChildren(label,connect);
  return template.innerHTML;
 };
 const style=element('style');style.textContent='.chatgpt-connect-row{gap:12px;align-items:center;flex-wrap:wrap}.chatgpt-connect-label{flex:1 1 220px;min-width:0}.chatgpt-connect-row .btn{max-width:100%}.chatgpt-personal-sheet{width:min(640px,100%);max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:auto}.chatgpt-personal-sheet p{max-width:65ch}.chatgpt-personal-sheet a.btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none}.chatgpt-personal-sheet input{display:block;width:100%;box-sizing:border-box;margin:6px 0 10px}.chatgpt-personal-sheet li{margin:12px 0}.chatgpt-personal-sheet ol{padding-left:24px}';document.head.append(style);
 if(location.hash==='#settings')go();
})();
