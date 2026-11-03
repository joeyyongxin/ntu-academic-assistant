const HOST = 'https://ntulearn.ntu.edu.sg';
const ROOT = '/learn/api/public/v1/';
const MAX_BYTES = 5 * 1024 * 1024;

export function apiUrl(path) {
  const url = new URL(path, HOST);
  if (url.origin !== HOST || url.username || url.password || url.hash || !url.pathname.startsWith(ROOT)) {
    throw new Error('Blocked an unexpected API destination.');
  }
  return url.href;
}

export async function getJson(path, fetcher = fetch) {
  const url = apiUrl(path);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 25000);
  try {
    const response = await fetcher(url, {
      method: 'GET', credentials: 'include', redirect: 'error',
      cache: 'no-store', headers: {Accept: 'application/json'}, signal: abort.signal
    });
    if (!response.ok) throw new Error(`NTULearn returned HTTP ${response.status}. Sign in again for 401; access may be restricted for 403.`);
    if (!/application\/(?:[\w.+-]*\+)?json\b/i.test(response.headers.get('content-type') || '')) {
      throw new Error('NTULearn did not return JSON. Sign in to NTULearn and try again.');
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error('Response exceeded the 5 MB access-check limit.');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
    try { return JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new Error('Unexpected NTULearn JSON response.'); }
  } finally { clearTimeout(timer); }
}

export async function collection(path, fetcher = fetch) {
  const rows = [], seen = new Set();
  while (path) {
    const url = apiUrl(path);
    if (seen.has(url) || seen.size >= 20) throw new Error('Pagination limit reached; check is incomplete.');
    seen.add(url);
    const data = await getJson(url, fetcher);
    if (!data || !Array.isArray(data.results)) throw new Error('Unexpected NTULearn list response.');
    if (rows.length + data.results.length > 2000) throw new Error('Item limit reached; check is incomplete.');
    rows.push(...data.results);
    path = data.paging?.nextPage;
    if (path != null && typeof path !== 'string') throw new Error('Unexpected pagination response.');
  }
  return rows;
}

export function coursePaths(id, now = new Date()) {
  if (typeof id !== 'string' || !id || id.length > 200) throw new Error('Invalid course identity.');
  const course = ROOT + 'courses/' + encodeURIComponent(id);
  const query = new URLSearchParams({courseId: id, type: 'GradebookColumn',
    since: now.toISOString(), until: new Date(now.getTime() + 30 * 86400000).toISOString(), limit: '100'});
  return {
    announcements: course + '/announcements?limit=100',
    deadlines: ROOT + 'calendars/items?' + query,
    materials: course + '/contents?limit=100'
  };
}
