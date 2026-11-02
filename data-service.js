// Production data access shared by the current app and the approved new interface.
// Uses the existing authenticated Supabase tables and conflict-aware update RPCs.
(function(root){
 class PlannerDataService {
  constructor(client){this.client=client;}
  async verify(owner){
   if(!owner)throw Error('Sign in before saving changes.');
   const {data,error}=await this.client.auth.getUser();
   if(error||data?.user?.id!==owner)throw Error('Account changed or session expired. Sign in again.');
  }
  table(name){if(!['tasks','assessments'].includes(name))throw Error('Unsupported record type.');return name;}
  async rows(table,owner){
   const all=[],pageSize=500;
   for(let offset=0;;offset+=pageSize){
    const {data,error}=await this.client.from(this.table(table)).select('*').eq('user_id',owner).order('id').range(offset,offset+pageSize-1);
    if(error)throw error;
    if(!Array.isArray(data)||data.some(x=>x.user_id!==owner))throw Error('Unexpected account in saved records.');
    all.push(...data);if(data.length<pageSize)return all;
   }
  }
  async load(owner){
   await this.verify(owner);
   const [tasks,assessments]=await Promise.all([this.rows('tasks',owner),this.rows('assessments',owner)]);
   await this.verify(owner);
   return {tasks,assessments};
  }
  async revisions(owner){
   await this.verify(owner);
   const entries=await Promise.all(['tasks','assessments'].map(async table=>{
    const rows=[];
    for(let offset=0;;offset+=500){
     const {data,error}=await this.client.from(table).select('id,user_id,updated_at,deleted_at').eq('user_id',owner).order('id').range(offset,offset+499);
     if(error)throw error;
     if(!Array.isArray(data)||data.some(r=>r.user_id!==owner))throw Error('Unexpected account in sync response.');
     rows.push(...data);if(data.length<500)break;
    }
    return [table,rows];
   }));
   await this.verify(owner);return Object.fromEntries(entries);
  }
  async apply(owner,op){
   await this.verify(owner);const table=this.table(op.table);
   let result;
   if(op.kind==='insert'){
    if(op.doc?.user_id!==owner)throw Error('Queued change belongs to another account.');
    const doc={...op.doc,user_id:owner};delete doc.created_at;delete doc.updated_at;
    result=await this.client.from(table).insert(doc).select().single();
   }else if(op.kind==='update'){
    if(op.base?.user_id!==owner)throw Error('Queued change belongs to another account.');
    result=await this.client.rpc(table==='tasks'?'update_planner_task':'update_planner_assessment',{p_id:op.id,p_expected:op.expected,p_patch:op.patch});
   }else throw Error('Unsupported saved operation.');
   if(result.error)throw result.error;
   const record=Array.isArray(result.data)?result.data[0]:result.data;
   if(!record||record.id!==op.id||record.user_id!==owner)throw Error('Save could not be confirmed. Reload before retrying.');
   await this.verify(owner);
   return record;
  }
 }
 root.PlannerDataService=PlannerDataService;
})(globalThis);
