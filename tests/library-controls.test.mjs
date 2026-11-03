import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../workspace/files-hook.js',import.meta.url),'utf8');
function setup(){const rendered=[],status={},button={};const c=vm.createContext({ReferenceCloud:{user:{id:'owner'},signOut(){},bridge:{ensurePreferences:async()=>{}}},active:'semester',cloudReady:true,document:{getElementById:id=>({assetInput:{files:[{}]},assetModule:{value:'Other'},assetUploadStatus:status}[id])},addEventListener(){},go(){rendered.push(vm.runInContext('assetBusy',c));}});vm.runInContext('window=globalThis;',c);vm.runInContext(source,c);vm.runInContext("assetState={key:'owner:semester',rows:[{id:'file'}]};renderAssetList=()=>{};assetLibrary=async()=>({upload:async()=>{},remove:async()=>{}});",c);return {c,rendered,button};}
test('successful upload rebuilds controls after clearing the busy state',async()=>{const x=setup();await x.c.assetUpload({preventDefault(){},target:{querySelector:()=>x.button}});assert.deepEqual(x.rendered,[false]);assert.equal(x.button.disabled,false);});
test('successful deletion rebuilds controls after clearing the busy state',async()=>{const x=setup();await x.c.assetRemove('file');assert.deepEqual(x.rendered,[false]);});
