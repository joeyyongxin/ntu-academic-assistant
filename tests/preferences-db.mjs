import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
try{
 await db.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;grant usage on schema public,auth to anon,authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 const sql=await readFile(new URL('../supabase/001_workspace_preferences.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
 const alice=crypto.randomUUID(),bob=crypto.randomUUID();await db.query('insert into auth.users values($1),($2)',[alice,bob]);
 const c=vm.createContext({ReferenceCloud:{},Intl,Date,Map});vm.runInContext(await readFile(new URL('../workspace/production-bridge.js',import.meta.url),'utf8'),c);
 const projected=c.ProductionWorkspace.project({tasks:[],assessments:[]});const payload=c.ProductionWorkspace.preferencesOf(projected.snapshot,projected.map);
 async function run(actor,query,args=[],role='authenticated'){return db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor||'']);return tx.query(query,args);});}
 const save=(actor,owner,rev,data)=>run(actor,'select public.aa_workspace_save($1,$2,$3::jsonb) as v',[owner,rev,JSON.stringify(data)]);
 const load=async(actor,owner)=>(await run(actor,'select public.aa_workspace_load($1) as v',[owner])).rows[0].v;
 assert.equal((await load(alice,alice)).payload,null);
 assert.equal(Number((await save(alice,alice,0,payload)).rows[0].v),1);
 assert.equal((await load(alice,alice)).payload.current,payload.current);
 assert.equal(Number((await run(alice,'select public.aa_workspace_revision($1) as v',[alice])).rows[0].v),1);
 await assert.rejects(run(bob,'select public.aa_workspace_revision($1)',[alice]),/Account mismatch/);
 assert.equal((await load(bob,bob)).payload,null);
 await assert.rejects(save(bob,alice,1,payload),/Account mismatch/);
 await assert.rejects(load(bob,alice),/Account mismatch/);
 await assert.rejects(run(alice,'select * from public.aa_workspace_preferences'),/permission denied/);
 await assert.rejects(run(null,'select public.aa_workspace_load($1)',[alice],'anon'),/permission denied/);
 await assert.rejects(save(alice,alice,0,payload),/changed on another device/);
 const bad=structuredClone(payload);bad.terms[0].mods=['bad module'];await assert.rejects(save(alice,alice,1,bad),/module/i);
 assert.equal((await load(alice,alice)).revision,1);
 console.log('PASS production preferences SQL: repeatable installation, owner-only load/save, cross-account and anonymous denial, direct-table denial, stale revisions and malformed modules rejected.');
}finally{await db.close();}
