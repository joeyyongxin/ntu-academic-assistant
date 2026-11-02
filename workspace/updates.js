(function(root){
 function stamp(records){return JSON.stringify(['tasks','assessments'].map(table=>(records?.[table]||[]).map(r=>[String(r.id),r.updated_at||'',r.deleted_at||'']).sort((a,b)=>a[0].localeCompare(b[0]))));}
 class Watcher{
  constructor(bridge,notify){this.bridge=bridge;this.notify=notify;this.running=false;}
  async check(){
   const b=this.bridge,owner=b.owner,epoch=b.epoch;
   if(this.running||!owner||b.pending||b.loading||b.blocked)return;
   this.running=true;
   const valid=()=>b.owner===owner&&b.epoch===epoch&&!b.pending&&!b.loading&&!b.blocked;
   try{
    const [records,preferences]=await Promise.all([b.service.revisions(owner),b.preferences.revision(owner)]);
    if(!valid())return;
    await b.service.verify(owner);if(!valid())return;
    if(stamp(records)!==stamp(b.remoteRows)||preferences.available!==b.preferencesAvailable||preferences.available&&preferences.revision!==b.preferencesRevision)this.notify({changed:true});
    else this.notify({changed:false});
   }catch(error){if(valid())this.notify({error:'Could not check for updates. Your open work has been kept.'});}
   finally{this.running=false;}
  }
 }
 root.AcademicUpdates={stamp,Watcher};
})(globalThis);
