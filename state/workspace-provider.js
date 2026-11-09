(function(root){
 const state={account:null,active:'s1',settings:{years:[],terms:[],current:'s1',studyYear:'Year 1',lastByYear:{}}};
 const api={state,get account(){return state.account;},get activeSemester(){return state.settings.terms.find(t=>t.id===state.active);},get settings(){return state.settings;},scope(){return (state.account?.id||'')+':'+state.active;},
  bind(target,names){for(const name of names)Object.defineProperty(target,name,{configurable:true,get:()=>name==='active'?state.active:state.settings[name],set:value=>{if(name==='active')state.active=value;else state.settings[name]=value;}});},
  bindAccount(auth){state.account=auth.user||null;Object.defineProperty(auth,'user',{configurable:true,get:()=>state.account,set:value=>{state.account=value;}});}
 };
 root.WorkspaceProvider=api;
})(globalThis);
