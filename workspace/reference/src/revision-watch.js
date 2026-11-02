// Read only the revision counter, using the existing owner-only table policy.
(function(root){
 class RevisionWatch {
  constructor(client, bridge, changed){this.client=client;this.bridge=bridge;this.changed=changed;this.running=false;}
  async check(){
   const b=this.bridge,owner=b.owner,epoch=b.epoch;
   if(this.running||!owner||b.loading||b.pending||b.blocked)return;
   this.running=true;
   try{
    await b.verify(owner);
    const {data,error}=await this.client.from('aa_reference_workspaces').select('revision').eq('user_id',owner).maybeSingle();
    if(error)throw error;
    if(b.epoch!==epoch||b.owner!==owner||b.pending||b.loading||b.blocked)return;
    await b.verify(owner);
    if(b.epoch!==epoch||b.owner!==owner||b.pending||b.loading||b.blocked)return;
    const remote=Number(data?.revision);
    if(Number.isSafeInteger(remote)&&remote>b.revision)this.changed(remote);
   }finally{this.running=false;}
  }
 }
 root.AcademicRevisionWatch=RevisionWatch;
})(globalThis);
