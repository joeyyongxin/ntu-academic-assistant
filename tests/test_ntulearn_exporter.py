import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('exporter', Path(__file__).parents[1] / 'tools/export_ntulearn_announcements.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ExporterTests(unittest.TestCase):
    def test_origin_restrictions(self):
        self.assertTrue(module.allowed_url(module.HOST + module.PREFIX + 'users/me'))
        for url in ['http://ntulearn.ntu.edu.sg/learn/api/public/v1/users/me', 'https://evil.invalid/learn/api/public/v1/users/me', 'https://ntulearn.ntu.edu.sg.evil.invalid/learn/api/public/v1/users/me', module.HOST + '/webapps/login/']:
            self.assertFalse(module.allowed_url(url))
            with self.assertRaises(ValueError): module.Client('synthetic').get(url)
    def test_plain_text_excludes_script_and_decodes_entities(self):
        self.assertEqual(module.plain_text('<p>Read &amp; revise</p><script>secret()</script><style>hidden</style><p>Next</p>'), 'Read & revise\nNext')
    def test_export_has_no_credentials_and_keeps_source_identity(self):
        class Fake:
            def rows(self, path):
                self.path = path
                return [{'id':'ann-1','title':'Announcement','body':'<b>Review</b>','created':'2026-11-03T00:00:00Z'}]
        fake = Fake()
        rows = module.export_course(fake, {'id':'course/1','name':'SC1004'})
        self.assertIn('course%2F1', fake.path)
        self.assertEqual(rows[0]['text'], 'Review')
        self.assertEqual(rows[0]['courseId'], 'course/1')
        self.assertNotIn('cookie', str(rows).lower())
    def test_header_injection_is_rejected(self):
        for value in ['', 'value\r\nX-Test: injected', 'value; other=secret']:
            with self.assertRaises(ValueError): module.Client(value)

if __name__ == '__main__': unittest.main()
