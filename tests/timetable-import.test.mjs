import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context={};vm.runInNewContext(await readFile(new URL('../workspace/timetable-import.js',import.meta.url),'utf8'),context);
const {parse,validate}=context.TimetableImport;
test('reads class-list text with colon or compact times and reports unread lines',()=>{const x=parse('SC2000, Monday, 09:00–10:00, Lecture, LT1\nSC1004 Tue 1100-1200 Tutorial\nunread heading');assert.equal(x.rows.length,2);assert.equal(x.rows[1].start,'11:00');assert.equal(x.rows[1].d,'Tue');assert.equal(x.unread.length,1);assert.equal(parse('SC2000 Mon 09:00-10:00 Lecture LT1').rows[0].venue,'LT1');});
test('duplicate imports are skipped without mutating existing classes',()=>{const x=parse('SC2000, Mon, 09:00-10:00, Lecture, LT1').rows;const first=validate(x,['SC2000'],[]);const existing=structuredClone(first.accepted);const next=validate(x,['SC2000'],existing);assert.equal(next.accepted.length,0);assert.equal(next.duplicates.length,1);assert.equal(JSON.stringify(existing),JSON.stringify(first.accepted));});
test('unknown modules, invalid times and overlaps are rejected atomically',()=>{const x=parse('SC2000, Mon, 09:00-10:00, Lecture, LT1').rows;assert.throws(()=>validate(x,['SC1004'],[]));assert.throws(()=>validate([{...x[0],end:'08:00'}],['SC2000'],[]));assert.throws(()=>validate([x[0],{...x[0],start:'09:30',end:'11:00'}],['SC2000'],[]));});
test('oversized input and non-images are rejected before loading OCR',async()=>{assert.throws(()=>parse('a'.repeat(100001)));await assert.rejects(context.TimetableImport.recognize({type:'text/html',size:10}),/Choose a PNG/);});

test('organises OCR class blocks without inventing absent weekdays',()=>{const x=parse('SC2000\nMonday\n09 : 00 - 10 : 00\nLecture LT1\nSC1004\nTuesday 1100-1200 Tutorial TR2');assert.equal(x.rows.length,2);assert.equal(x.rows[0].venue,'LT1');assert.equal(x.rows[1].d,'Tue');assert.equal(parse('SC2000\n09:00-10:00 Lecture LT1').rows.length,0);});
