import test from 'node:test';
import assert from 'node:assert/strict';
import '../workspace/file-library.js';
import '../workspace/file-preview.js';
test('HTML disguised as PDF or image cannot become an active preview',async()=>{
 for(const name of ['bad.pdf','bad.png','bad.jpg','bad.webp'])await assert.rejects(AcademicFilePreview.inspect(new Blob(['<html><script>alert(1)</script></html>']),name),/unavailable/);
});
test('supported image/PDF previews use content-checked MIME types',async()=>{
 const pdf=await AcademicFilePreview.inspect(new Blob(['%PDF-1.7\n']), 'notes.pdf');assert.equal(pdf.kind,'pdf');assert.equal(pdf.blob.type,'application/pdf');
 const image=await AcademicFilePreview.inspect(new Blob([new Uint8Array([137,80,78,71,13,10,26,10])]),'figure.png');assert.equal(image.kind,'image');assert.equal(image.blob.type,'image/png');
});
test('text stays text, long previews are limited and archives remain download-only',async()=>{
 const text='<img src=x onerror=alert(1)>';
 assert.equal((await AcademicFilePreview.inspect(new Blob([text]),'notes.md')).text,text);
 const large=await AcademicFilePreview.inspect(new Blob(['a'.repeat(200100)]),'data.csv');assert.ok(large.text.endsWith('full file.]'));assert.ok(large.text.length<201000);
 await assert.rejects(AcademicFilePreview.inspect(new Blob(['PK data']),'document.docx'),/unavailable/);
});
