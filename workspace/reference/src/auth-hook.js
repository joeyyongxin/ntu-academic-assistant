// Inside the original auth closure. Local mode retains the original demo flow.
async function submitTestAuth(mode,form){
 if(busy)return;busy=true;const button=form.querySelector('.auth-submit');if(button)button.disabled=true;
 const status=form.querySelector('[role="status"]');if(status)status.textContent='Contacting the test project…';
 try{const message=await ReferenceCloud.submit(mode,form);if(message){show(mode==='forgot'?'recovery':'signin');const s=root.querySelector('[role="status"]');if(s)s.textContent=message;}}
 catch(error){const s=root.querySelector('[role="status"]')||root.querySelector('.sub');if(s)s.textContent=error.message;}
 finally{busy=false;const b=root.querySelector('.auth-submit');if(b&&(!ReferenceCloud.recovering||mode==='reset'))b.disabled=false;}
}
window.ReferenceAuth={
 loading(){signedIn=false;show('restoring');},
 open(){signedIn=true;busy=false;if(['signin','signup','forgot','reset','signedout','restoring'].includes(route()))location.hash='settings';enter();},
 closed(){signedIn=false;busy=false;clearTimeout(restoreTimer);closeAccount();show('signedout');},
 recovery(){signedIn=false;busy=false;show('reset');},
 error(error){if(ws.hidden){signedIn=false;busy=false;show('signin');const s=root.querySelector('[role="status"]');if(s)s.textContent=error.message;}},
 signedOut(){signedIn=false;busy=false;show('signin');}
};
