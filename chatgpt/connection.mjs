export const CHATGPT_URL='https://chatgpt.com/plugins';
export function checkConfig(c){
 if(!c?.enabled||c.environment!=='test')throw Error('ChatGPT test integration is disabled.');
 const db=new URL(c.supabaseUrl),mcp=new URL(c.connectorUrl);
 if(db.hostname.includes('qnpkiqedalgusjxojclo')||mcp.hostname==='academic-assistant-mcp.onrender.com')throw Error('Production endpoints are not permitted.');
 for(const url of [db,mcp])if(url.username||url.password||url.search||url.hash||(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Invalid test endpoint.');
 if(!c.clientId)throw Error('A test OAuth client must be approved by the administrator.');
 return c;
}
export class ChatGPTConnection{
 constructor({client,owner,config,currentOwner=()=>owner}){this.client=client;this.owner=owner;this.config=checkConfig(config);this.currentOwner=currentOwner;}
 async verify(){const {data,error}=await this.client.auth.getUser();if(error||data?.user?.id!==this.owner||this.currentOwner()!==this.owner)throw Error('Account changed. Reopen Settings.');}
 async call(name,args){await this.verify();const {data,error}=await this.client.rpc(name,args);await this.verify();if(error)throw Error(error.message||'Connection needs attention.');return data;}
 connection(action){return this.call('aa_chatgpt_connection',{p_action:action,p_client:this.config.clientId});}
 status(){return this.connection('status');}
 connect(){return this.connection('connect');}
 async disconnect(){
  // Stop all planner requests first, even if the provider is temporarily down.
  await this.connection('disconnect');
  if(!this.client.auth.oauth?.revokeGrant)throw Error('Planner access revoked. Provider revocation needs attention; update the test auth client and retry.');
  const {error}=await this.client.auth.oauth.revokeGrant({clientId:this.config.clientId});
  if(error)throw Error('Planner access revoked. Provider revocation failed; retry Disconnect.');
  await this.verify();return this.connection('revocationComplete');
 }
 async consent(authorizationId,approve=false){
  await this.verify();const oauth=this.client.auth.oauth;if(!oauth?.getAuthorizationDetails)throw Error('OAuth consent is unavailable in this test client.');
  const {data,error}=await oauth.getAuthorizationDetails(authorizationId);if(error)throw Error('Authorization request unavailable.');
  // Never automatically follow an already-consented redirect. The application
  // grant must also be active; show a deliberate Continue button instead.
  if(!data?.authorization_id||data.client?.id!==this.config.clientId)throw Error('Start a fresh authorization for the approved test client.');
  if(!approve)return data;
  await this.connect();await this.verify();
  const result=await oauth.approveAuthorization(authorizationId,{skipBrowserRedirect:true});if(result.error)throw Error('Authorization could not be approved.');
  await this.verify();const destination=new URL(result.data?.redirect_url);
  // Exact callback comes from verified authorization details, never URL input.
  const registered=new URL(data.redirect_uri);
  if(destination.origin!==registered.origin||destination.pathname!==registered.pathname)throw Error('Unexpected authorization callback.');
  return destination.href;
 }
 inbox(){return this.call('aa_chatgpt_rpc',{p_action:'inbox',p_args:{}});}
 act(action,args){return this.call('aa_chatgpt_rpc',{p_action:action,p_args:{...args,operationKey:crypto.randomUUID()}});}
}
