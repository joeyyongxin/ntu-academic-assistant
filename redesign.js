// UI-only navigation layer. All data and authentication remain managed by app.js.
(function(){
  const nav=document.querySelectorAll('[data-side-tab]');
  function select(name){nav.forEach(x=>x.classList.toggle('active',x.dataset.sideTab===name));}
  nav.forEach(button=>button.addEventListener('click',()=>{if(typeof tab==='function')tab(button.dataset.sideTab);select(button.dataset.sideTab);window.scrollTo({top:0,behavior:'smooth'});}));
  document.querySelectorAll('.tabs [data-tab]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.tab)));
  document.querySelectorAll('[data-side-action]').forEach(b=>b.addEventListener('click',()=>{const action=b.dataset.sideAction;if(action==='account'){const d=document.getElementById('authDetails');d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'});}else document.getElementById(action==='export'?'exportBtn':'importBtn')?.click();}));
  const status=document.getElementById('syncStatus'), side=document.getElementById('sidebarStatus'),card=document.getElementById('syncCardText');
  if(status){const update=()=>{const s=status.textContent||'';side.textContent=s;const short=s.includes('Cloud synced')?'Cloud synced':s.includes('Offline')?'Offline':s.includes('Signed in')?'Syncing…':'Not connected';if(card)card.textContent=short;};new MutationObserver(update).observe(status,{childList:true,characterData:true,subtree:true});update();}
})();
