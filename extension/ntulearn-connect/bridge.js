// Narrow bridge: no URL proxy, no credentials, no automatic imports.
const commands=new Set(['APP_CONNECT','APP_STATUS','APP_SNAPSHOT','APP_DISCONNECT','APP_MATERIAL','APP_PDF_LIST','APP_PDF_BYTES']);
let inFlight=0;
window.addEventListener('message',async event=>{
 const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.channel!=='aa-ntu-request'||!commands.has(m.type)||typeof m.id!=='string'||m.id.length>100||inFlight>=2)return;
 inFlight++;
 try{const reply=await chrome.runtime.sendMessage({type:m.type,context:m.context,attachment:typeof m.attachment==='string'?m.attachment.slice(0,2001):undefined,sourceKey:typeof m.sourceKey==='string'?m.sourceKey.slice(0,1001):undefined});window.postMessage({channel:'aa-ntu-response',id:m.id,...reply},location.origin);}
 catch{window.postMessage({channel:'aa-ntu-response',id:m.id,ok:false,error:'Connector unavailable. Reload this page after updating the extension.'},location.origin);}
 finally{inFlight--;}
});
