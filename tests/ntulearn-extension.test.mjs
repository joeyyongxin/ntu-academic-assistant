import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {apiUrl, getJson, collection, coursePaths} from '../extension/ntulearn-connect/api.mjs';
const root = '/learn/api/public/v1/';
const json = value => new Response(JSON.stringify(value), {headers: {'content-type':'application/json'}});

test('extension rejects unexpected destinations before making a request', async () => {
  let calls = 0;
  for (const path of ['https://evil.example/learn/api/public/v1/users/me', '//evil.example/test',
    'http://ntulearn.ntu.edu.sg'+root, 'https://user:pass@ntulearn.ntu.edu.sg'+root,
    '/webapps/login', root+'users/me#fragment', root+'../private']) {
    await assert.rejects(getJson(path, async () => {calls++;}));
  }
  assert.equal(calls, 0);
  assert.equal(apiUrl(root+'users/me'), 'https://ntulearn.ntu.edu.sg'+root+'users/me');
});
test('requests use session-managed GET only and block redirects', async () => {
  await getJson(root+'users/me', async (url, options) => {
    assert.equal(options.method,'GET'); assert.equal(options.credentials,'include');
    assert.equal(options.redirect,'error'); assert.equal(options.cache,'no-store');
    assert.deepEqual(options.headers,{Accept:'application/json'});
    assert.ok(options.signal instanceof AbortSignal);
    return json({id:'synthetic'});
  });
});
test('HTTP and login HTML fail explicitly, not as empty data', async () => {
  await assert.rejects(getJson(root+'users/me', async () => new Response('',{status:403})), /HTTP 403/);
  await assert.rejects(getJson(root+'users/me', async () => new Response('<html>login</html>',{headers:{'content-type':'text/html'}})), /did not return JSON/);
  await assert.rejects(getJson(root+'users/me', async () => new Response('{',{headers:{'content-type':'application/json'}})), /Unexpected NTULearn JSON/);
});
test('pagination supports same-host pages, rejects foreign pages and loops', async () => {
  let calls = 0;
  assert.equal((await collection(root+'users/me/courses', async () => {
    calls++; return calls === 1 ? json({results:[{id:1}],paging:{nextPage:root+'users/me/courses?offset=1'}}) : json({results:[{id:2}]});
  })).length,2);
  calls = 0;
  await assert.rejects(collection(root+'users/me/courses', async () => {
    calls++; return json({results:[],paging:{nextPage:'https://evil.example/x'}});
  }), /unexpected API destination/);
  assert.equal(calls,1);
  await assert.rejects(collection(root+'users/me/courses', async () => json({results:[],paging:{nextPage:root+'users/me/courses'}})), /Pagination limit/);
});
test('body and collection limits stop large responses', async () => {
  await assert.rejects(getJson(root+'users/me', async () => new Response(' '.repeat(5*1024*1024+1),{headers:{'content-type':'application/json'}})), /5 MB/);
  await assert.rejects(collection(root+'users/me/courses', async () => json({results:Array(2001).fill({})})), /Item limit/);
});
test('course check scopes encoded IDs and a 30-day assignment calendar window', () => {
  const paths = coursePaths('course/one', new Date('2026-11-03T00:00:00Z'));
  assert.match(paths.announcements,/course%2Fone\/announcements/);
  const url = new URL(apiUrl(paths.deadlines));
  assert.equal(url.searchParams.get('courseId'),'course/one');
  assert.equal(url.searchParams.get('type'),'GradebookColumn');
  assert.equal(url.searchParams.get('until'),'2026-12-03T00:00:00.000Z');
  assert.throws(()=>coursePaths(''));
});
test('manifest restricts optional NTULearn access and planner bridge, without cookie access', () => {
  const manifest = JSON.parse(readFileSync(new URL('../extension/ntulearn-connect/manifest.json',import.meta.url)));
  assert.deepEqual(manifest.optional_host_permissions,['https://ntulearn.ntu.edu.sg/*']);
  assert.deepEqual(manifest.permissions,['storage','alarms']); assert.equal(manifest.host_permissions,undefined);
  assert.equal(manifest.content_scripts.length,1);assert.equal(manifest.content_scripts[0].all_frames,false);
  assert.ok(manifest.content_scripts[0].matches.every(x=>x.startsWith('https://joeyyongxin.github.io/ntu-academic-assistant/')&&!x.includes('*')));
  assert.equal(manifest.externally_connectable,undefined);
});
