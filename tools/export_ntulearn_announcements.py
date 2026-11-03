"""Run locally: read selected NTULearn announcements and export a private JSON file.

No browser-cookie extraction, stored credentials, grades, downloads or LMS writes.
"""
import getpass
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urljoin, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

HOST = 'https://ntulearn.ntu.edu.sg'
PREFIX = '/learn/api/public/v1/'

def allowed_url(url):
    p = urlsplit(url)
    return p.scheme == 'https' and p.netloc == 'ntulearn.ntu.edu.sg' and p.path.startswith(PREFIX) and not p.fragment

class SameOrigin(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed_url(newurl):
            raise ValueError('NTULearn redirected outside its API. Sign in again locally.')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.hidden = [], 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.hidden += 1
        if tag in ('p', 'div', 'br', 'li'): self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.hidden = max(0, self.hidden - 1)
    def handle_data(self, data):
        if not self.hidden: self.parts.append(data)

def plain_text(html):
    parser = PlainText()
    parser.feed(str(html or ''))
    return '\n'.join(line.strip() for line in ''.join(parser.parts).splitlines() if line.strip())[:20000]

class Client:
    def __init__(self, cookie):
        self.cookie = cookie.removeprefix('BbRouter=').strip()
        if not self.cookie or any(c in self.cookie for c in '\r\n;'):
            raise ValueError('Enter only the BbRouter cookie value.')
        self.opener = build_opener(SameOrigin())
    def get(self, path):
        url = urljoin(HOST, path)
        if not allowed_url(url): raise ValueError('Refusing an unexpected API destination.')
        req = Request(url, headers={'Cookie': 'BbRouter=' + self.cookie, 'Accept': 'application/json'})
        try:
            with self.opener.open(req, timeout=25) as response:
                raw = response.read(5 * 1024 * 1024 + 1)
                if len(raw) > 5 * 1024 * 1024: raise ValueError('API response exceeds 5 MB.')
                try: return json.loads(raw)
                except (ValueError, UnicodeDecodeError): raise ValueError('NTULearn did not return JSON. Your session may have expired.') from None
        except HTTPError as error:
            raise ValueError('NTULearn API returned HTTP ' + str(error.code) + '. No credentials or response body were logged.') from None
    def rows(self, path):
        rows, seen = [], set()
        while path:
            if path in seen or len(seen) >= 20: raise ValueError('API pagination limit reached.')
            seen.add(path)
            data = self.get(path)
            if not isinstance(data, dict) or not isinstance(data.get('results'), list): raise ValueError('Unexpected API collection.')
            rows.extend(data['results'])
            path = (data.get('paging') or {}).get('nextPage')
        return rows

def export_course(client, course):
    course_id = str(course['id'])
    rows = client.rows(PREFIX + 'courses/' + quote(course_id, safe='') + '/announcements?limit=100')
    result = []
    for row in rows:
        if not row.get('id') or not row.get('title') or not row.get('created'): continue
        result.append({'id': str(row['id']), 'courseId': course_id,
                       'courseName': str(course.get('name') or course.get('courseId') or course_id),
                       'title': str(row['title'])[:500], 'text': plain_text(row.get('body')),
                       'created': row['created'], 'modified': row.get('modified')})
    return result

def main():
    print('NTULearn announcement export — local, read only. Your cookie is not saved.')
    print('Sign in to NTULearn in your browser. In DevTools > Application > Cookies, find BbRouter.')
    client = Client(getpass.getpass('Paste its value here locally (hidden; never paste it into chat): '))
    client.get(PREFIX + 'users/me')
    enrollments = client.rows(PREFIX + 'users/me/courses?limit=100')
    courses = []
    for entry in enrollments:
        cid = entry.get('courseId')
        if cid:
            try: courses.append(client.get(PREFIX + 'courses/' + quote(str(cid), safe='')))
            except ValueError: print('One unavailable course was skipped.')
    for index, course in enumerate(courses, 1): print(str(index) + '. ' + str(course.get('name') or course.get('courseId') or course['id']))
    selection = input('Course numbers to export, separated by commas (blank cancels): ').strip()
    if not selection: return
    indexes = sorted(set(int(n.strip()) - 1 for n in selection.split(',')))
    if any(n < 0 or n >= len(courses) for n in indexes): raise ValueError('Invalid course selection.')
    items = []
    for index in indexes: items.extend(export_course(client, courses[index]))
    if len(items) > 1000: raise ValueError('More than 1,000 announcements. Export fewer courses.')
    target = Path.home() / 'Downloads' / ('NTULearn_Announcements_' + datetime.now().strftime('%Y%m%d_%H%M%S_%f') + '.json')
    payload = {'format': 'academic-assistant-ntulearn-announcements', 'schemaVersion': 1,
               'exportedAt': datetime.now(timezone.utc).isoformat(), 'items': items}
    raw = json.dumps(payload, ensure_ascii=False, indent=2)
    if len(raw.encode('utf-8')) > 5 * 1024 * 1024: raise ValueError('Export exceeds 5 MB. Choose fewer courses.')
    with target.open('x', encoding='utf-8') as stream: stream.write(raw)
    print('Exported ' + str(len(items)) + ' announcements to ' + str(target))
    print('Keep this file private. Review it in Academic Assistant Settings before saving.')

if __name__ == '__main__':
    try: main()
    except (ValueError, OSError) as error: print('Export stopped: ' + str(error))
