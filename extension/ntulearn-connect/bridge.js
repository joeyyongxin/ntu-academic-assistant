// Narrow bridge: no URL proxy, no credentials, no automatic imports.
const commands=new Set(['APP_CONNECT','APP_STATUS','APP_SNAPSHOT','APP_DISCONNECT']);
let inFlight=0;
window.addEventListener('message',async event=>{
 const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.channel!=='aa-ntu-request'||!commands.has(m.type)||typeof m.id!=='string'||m.id.length>100||inFlight>=2)return;
 inFlight++;
 try{const reply=await chrome.runtime.sendMessage({type:m.type,context:m.context});window.postMessage({channel:'aa-ntu-response',id:m.id,...reply},location.origin);}
 catch{window.postMessage({channel:'aa-ntu-response',id:m.id,ok:false,error:'Connector unavailable. Reload this page after updating the extension.'},location.origin);}
 finally{inFlight--;}
});
