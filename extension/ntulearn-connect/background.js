import {getJson} from './api.mjs';
import {collectCourse,listCourses,safeError} from './collect.mjs';
import {appUrl,validContext,sameContext} from './policy.mjs';
import {materialInSnapshot,pdfAttachments} from './materials.mjs';
const origins=['https://ntulearn.ntu.edu.sg/*'],KEY='ntuConnector',ALARM='ntu-refresh';
let queue=Promise.resolve(),syncAbort=null;
function serial(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}
async function load(){return (await chrome.storage.local.get(KEY))[KEY]||{};}
async function store(state){await chrome.storage.local.set({[KEY]:state});}
async function reset(){await chrome.alarms.clear(ALARM);await chrome.storage.local.remove(KEY);}
async function permission(){if(!await chrome.permissions.contains({origins}))throw Error('NTULearn access removed. Connect again.');}
async function sync(){
 const state=await load();await permission();if(!state.selected?.length||!state.subject)throw Error('Choose courses in the extension first.');
 const me=await getJson('/learn/api/public/v1/users/me');
 if(me?.id!==state.subject){state.snapshot=null;state.pair=null;state.auto=false;state.lastError='NTULearn account changed. Reconnect and choose courses again.';await store(state);await chrome.alarms.clear(ALARM);throw Error(state.lastError);}
 const now=new Date(),items=[],warnings=[];let requests=0;
 syncAbort=new AbortController();const controller=syncAbort,timer=setTimeout(()=>controller.abort(),120000);
 const boundedFetch=(url,options)=>{if(++requests>180)throw Error('Sync request limit reached. Choose fewer courses.');return fetch(url,{...options,signal:AbortSignal.any([options.signal,controller.signal])});};
 try{for(const course of state.selected){if(controller.signal.aborted)throw Error('Sync cancelled or time limit reached.');const result=await collectCourse(course,boundedFetch,now);items.push(...result.items);warnings.push(...result.warnings.map(x=>course.name+': '+x));}
 if(controller.signal.aborted)throw Error('Sync cancelled or time limit reached.');
 const after=await getJson('/learn/api/public/v1/users/me',boundedFetch);if(after?.id!==state.subject){state.snapshot=null;state.pair=null;state.auto=false;await store(state);await chrome.alarms.clear(ALARM);throw Error('NTULearn account changed during sync. Reconnect before importing.');}
 }finally{clearTimeout(timer);syncAbort=null;}
 const snapshot={format:'academic-assistant-ntulearn-sync',schemaVersion:1,exportedAt:now.toISOString(),items,warnings};
 if(items.length>2000||new TextEncoder().encode(JSON.stringify(snapshot)).length>4*1024*1024)throw Error('Sync exceeds the 2,000 item / 4 MB limit. Choose fewer courses.');
 state.snapshot=snapshot;state.lastError=warnings.length?'Some categories could not be refreshed. Review warnings.':'';await store(state);return {count:items.length,warnings,lastSync:snapshot.exportedAt};
}
async function handle(message,sender){
 if(sender.id!==chrome.runtime.id)throw Error('Unexpected sender.');
 if(sender.url?.startsWith(chrome.runtime.getURL(''))){switch(message?.type){
  case 'LIST':{await permission();const found=await listCourses(),state=await load();if(state.subject!==found.subject){await reset();await store({subject:found.subject,courses:found.courses,pending:state.pending});}else await store({...state,courses:found.courses});return found;}
  case 'CONFIG':{const state=await load();if(!Array.isArray(message.ids)||!message.ids.length||message.ids.length>5)throw Error('Choose 1–5 courses.');const selected=[...new Set(message.ids)].map(id=>state.courses?.find(c=>c.id===id));if(selected.some(c=>!c))throw Error('Refresh the course list and choose again.');state.selected=selected;state.snapshot=null;state.auto=message.auto===true;await store(state);if(state.auto)await chrome.alarms.create(ALARM,{periodInMinutes:30});else await chrome.alarms.clear(ALARM);return sync();}
  case 'SYNC':return sync();
  case 'LOCAL_STATUS':{const state=await load();return {selected:state.selected||[],auto:!!state.auto,pair:state.pair||null,lastSync:state.snapshot?.exportedAt||'',lastError:state.lastError||'',count:state.snapshot?.items.length||0,pending:state.pending?.id===message.pending&&state.pending.expires>Date.now()?state.pending:null};}
  case 'APPROVE':{const state=await load();if(!state.subject||!state.selected?.length||!state.snapshot)throw Error('Connect, choose courses and sync before approving the planner.');if(!state.pending||state.pending.id!==message.pending||state.pending.expires<Date.now())throw Error('Connection request expired. Press Connect in app Settings again.');state.pair=state.pending.context;delete state.pending;await store(state);return {paired:true};}
  case 'PDF_FILES':{await permission();const state=await load();if(state.materialRequest?.id!==message.request||!sameContext(state.pair,state.materialRequest?.context))throw Error('Download approval is no longer valid. Open it again from the planner.');return pdfAttachments(state,state.materialRequest);}
  case 'RESET':await reset();await chrome.permissions.remove({origins});return {disconnected:true};
  default:throw Error('Unsupported extension request.');
 }}
 if(!appUrl(sender.url)||sender.frameId!==0||!validContext(message?.context))throw Error('Open the signed-in Academic Assistant Settings page.');
 const state=await load(),paired=sameContext(state.pair,message.context);
 switch(message.type){
  case 'APP_MATERIAL':{if(!paired)throw Error('Approve this account and semester in the connector first.');materialInSnapshot(state,message.sourceKey);state.materialRequest={id:crypto.randomUUID(),key:message.sourceKey,context:message.context,expires:Date.now()+5*60000};await store(state);await chrome.tabs.create({url:chrome.runtime.getURL('material.html')+'?request='+encodeURIComponent(state.materialRequest.id)});return {opened:true};}
  case 'APP_CONNECT':{state.pending={id:crypto.randomUUID(),context:message.context,expires:Date.now()+5*60000};await store(state);await chrome.tabs.create({url:chrome.runtime.getURL('connect.html')+'?approve='+encodeURIComponent(state.pending.id)});return {approvalRequired:true};}
  case 'APP_STATUS':return {paired,lastSync:paired?state.snapshot?.exportedAt||'':'',count:paired?state.snapshot?.items.length||0:0,auto:paired&&!!state.auto,error:paired?state.lastError||'':''};
  case 'APP_SNAPSHOT':if(!paired)throw Error('Approve this account and semester in the extension first.');if(!state.snapshot)throw Error('No snapshot yet. Choose courses and sync in the extension.');return state.snapshot;
  case 'APP_DISCONNECT':if(paired)delete state.pair;if(sameContext(state.pending?.context,message.context))delete state.pending;await store(state);return {disconnected:true};
  default:throw Error('Unsupported app request.');
 }
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{if(message?.type==='RESET'&&sender.id===chrome.runtime.id&&sender.url?.startsWith(chrome.runtime.getURL('')))syncAbort?.abort();serial(()=>handle(message,sender)).then(data=>reply({ok:true,data}),error=>reply({ok:false,error:safeError(error)}));return true;});
chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('connect.html')}));
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM)serial(async()=>{const state=await load();if(!state.auto)return;try{await sync();}catch(error){const current=await load();current.lastError=safeError(error);await store(current);}});});
chrome.permissions.onRemoved.addListener(p=>{if(p.origins?.some(x=>x.includes('ntulearn.ntu.edu.sg'))){syncAbort?.abort();serial(reset);}});
chrome.runtime.onStartup.addListener(()=>serial(async()=>{const state=await load();if(state.auto)await chrome.alarms.create(ALARM,{periodInMinutes:30});}));
