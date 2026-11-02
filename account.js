// Existing Supabase accounts, real sign-up and recovery. No simulated sessions.
(() => {
 const note=message=>{$('authMessage').textContent=message;};
 const redirect=()=>location.origin+location.pathname;
 const email=()=>{
  const value=$('email').value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Enter your email address in the email field.');
  return value;
 };
 async function action(button,run){
  if(!client){note('Account service could not load. Refresh the page.');return;}
  button.disabled=true;
  try{await run();}catch(error){note(error.message||'Request failed. Please try again.');}finally{button.disabled=false;}
 }
 $('signupToggle').onclick=()=>{
  $('signupFields').classList.toggle('hidden');
  const open=!$('signupFields').classList.contains('hidden');
  $('signupToggle').textContent=open?'Cancel account creation':'Create account';
  $('loginPassword').autocomplete=open?'new-password':'current-password';
  $('signupRepeat').value='';note(open?'Enter an email and a new password above, then confirm it below.':'');
 };
 $('createAccount').onclick=()=>action($('createAccount'),async()=>{
  const address=email(),password=$('loginPassword').value;
  if(password.length<12)throw Error('Use at least 12 characters for the password.');
  if(password!==$('signupRepeat').value)throw Error('Passwords do not match.');
  note('Creating your account…');
  const {data,error}=await client.auth.signUp({email:address,password,options:{emailRedirectTo:redirect()}});
  if(error)throw error;
  $('loginPassword').value='';$('signupRepeat').value='';
  note(data.session?'Your account is ready.':'Check your email for the confirmation link. If you already have an account, sign in or reset your password.');
 });
 $('forgotPassword').onclick=()=>action($('forgotPassword'),async()=>{
  const address=email();note('Requesting a password reset…');
  const {error}=await client.auth.resetPasswordForEmail(address,{redirectTo:redirect()});
  if(error)throw error;
  note('If that email has an account, a password reset link will arrive. Open it in this browser.');
 });
 if(client)client.auth.onAuthStateChange(event=>{
  if(event==='PASSWORD_RECOVERY')setTimeout(()=>{
   $('authDetails').open=true;note('Choose a new password below to finish resetting your account.');
   $('newPassword').focus();
  },0);
 });
})();
