import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/\/\/ Keep keyboard navigation inside the active form dialog\.([\s\S]*?),true\);/)[0];
function setup(){
 let handler,closed=false;
 const document={activeElement:null,addEventListener:(name,fn,capture)=>{assert.equal(capture,true);handler=fn;},querySelector:()=>dialog};
 const field=(disabled=false,visible=true)=>({disabled,tabIndex:0,closest:()=>false,getClientRects:()=>visible?[{}]:[],focus(){document.activeElement=this;}});
 const first=field(),hidden=field(false,false),disabled=field(true),last=field();
 const dialog={querySelectorAll:()=>[first,hidden,disabled,last]};
 vm.runInNewContext(source,{document,closeM:()=>{closed=true;}});
 const press=(key,shiftKey=false)=>{const e={key,shiftKey,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};handler(e);return e;};
 return {document,first,last,press,closed:()=>closed};
}
test('Tab wraps from last to first; Shift Tab wraps from first to last',()=>{const x=setup();x.document.activeElement=x.last;assert.ok(x.press('Tab').prevented);assert.equal(x.document.activeElement,x.first);assert.ok(x.press('Tab',true).prevented);assert.equal(x.document.activeElement,x.last);});
test('focus outside the modal returns to the first usable control',()=>{const x=setup();assert.ok(x.press('Tab').prevented);assert.equal(x.document.activeElement,x.first);});
test('ordinary typing and forward Tab within the modal retain native behavior',()=>{const x=setup();x.document.activeElement=x.first;assert.equal(x.press('Tab').prevented,undefined);assert.equal(x.press('a').prevented,undefined);});
test('Escape closes the modal and stops other page Escape handlers',()=>{const x=setup();const e=x.press('Escape');assert.ok(x.closed());assert.ok(e.prevented);assert.ok(e.stopped);});
test('workspace entry point matches the current home entry point',async()=>{assert.equal(await readFile(new URL('../workspace.html',import.meta.url),'utf8'),html);});
