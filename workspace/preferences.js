// Owner-only production extension; core tasks and assessments remain in their
// existing tables. A missing migration is reported as pending, not saved.
(function(root){
 class WorkspacePreferences{
  constructor(client,service){this.client=client;this.service=service;}
  async load(owner){
   await this.service.verify(owner);
   const {data,error}=await this.client.rpc('aa_workspace_load',{p_expected_user_id:owner});
   if(error){if(['PGRST202','42883'].includes(error.code))return {available:false,revision:0,payload:null};throw error;}
   await this.service.verify(owner);
   if(!Number.isSafeInteger(Number(data?.revision))||Number(data.revision)<0)throw Error('Invalid workspace revision.');
   return {available:true,revision:Number(data.revision),payload:data.payload};
  }
  async save(owner,revision,payload){
   await this.service.verify(owner);
   const {data,error}=await this.client.rpc('aa_workspace_save',{p_expected_user_id:owner,p_expected_revision:revision,p_payload:payload});
   if(error)throw error;
   await this.service.verify(owner);
   if(Number(data)!==revision+1)throw Error('Workspace save could not be confirmed. Reload before retrying.');
   return Number(data);
  }
  async revision(owner){
   const {data,error}=await this.client.rpc('aa_workspace_revision',{p_expected_user_id:owner});
   if(error){if(['PGRST202','42883'].includes(error.code))return this.load(owner);throw error;}
   if(!Number.isSafeInteger(Number(data))||Number(data)<0)throw Error('Invalid workspace revision.');
   return {available:true,revision:Number(data)};
  }
 }
 root.WorkspacePreferences=WorkspacePreferences;
})(globalThis);
