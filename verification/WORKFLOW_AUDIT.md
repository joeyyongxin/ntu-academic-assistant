# Academic Assistant workflow audit

Checked 6–7 November 2026, Asia/Singapore. All browser writes used an isolated synthetic account, record service and Storage adapter. No real planner records, Supabase configuration, permissions or connector pairings were changed.

## Changes

- Task, topic, class, assessment, course-update and file deletions use centered app confirmation dialogs. X, Cancel, Esc and clicking outside cancel through each record's existing handler. Cancel receives initial focus; Tab and Shift+Tab remain inside the dialog.
- Academic years and semesters now have Delete controls under Settings → Manage years & semesters. Delete moves the workspace to recoverable Trash, preserving stable IDs, records and private-file links. Deleting the active/current term chooses another available semester. The last available semester cannot be deleted. Restore brings back the deleted workspace; a year restore respects terms deleted independently earlier. Nothing is permanently purged by these controls.
- Week sections size to their content; the screenshot's excessive gaps came from nested grids stretching day sections and their internal rows. Days now use compact white cards with workload and task actions grouped together.
- Inbox Undo uses an app confirmation and treats priority changes as edits. Legacy approval snapshots default to Normal priority for comparison. Backup restore also uses an app confirmation and rechecks account/semester context before applying.
- Service-worker cache v35 precaches the new workspace scripts. No database migration is required.

## Automated verification

161 JavaScript tests and 4 Python exporter tests pass. The suite covers data/service account guards, tasks and assessments, semester switching, Inbox ownership/Undo, classes and module preferences, private-file content checks/upload/download/delete, backup integrity/merge/recovery, recurrence and timers, reminders/results, NTULearn import/sync/copy parsers, context guards, and Trash/Restore metadata projection. Complete HTML entrypoints parse and match. The service worker passes its syntax check and all 25 precache paths exist.

New regression checks cover last-semester protection, unchanged records during Trash, batch restoration, stale deletion context, deletion Cancel delegation without accessing private file state, and priority-aware Undo confirmation.

## Browser checks completed

- Task delete: Escape cancels and closes.
- Task delete: Cancel/confirm; Add task and High priority save.
- Task edit: date/minutes/notes; checkbox; Plan Previous/Next/This week; Home previous day.
- Home Today/reset and Move to today; timer start/pause/resume/review/session save; recurrence preview.
- Topics: add, cycle status, edit, delete pop-up/confirm.
- Classes: add/edit, agenda/grid, delete Cancel/confirm, class-list import preview/save.
- Assessments: add/edit/delete pop-up, weight/result save.
- NTULearn saved search/filter/module tabs, mark read, saved assessment question.
- Inbox approve, Undo Cancel/confirm and dismiss verified using keyboard.
- My Files: PDF preview/close, Details, downloaded PDF bytes match original.
- PDF index/search found page 2; page renderer opened; clear index; module filter.
- File delete dialog: Escape cancels, confirm calls the mock Storage removal API and removes the library entry.
- File upload succeeded: audit-notes.txt 33 B; text preview/close.
- Populated academic year Trash/restore; last-semester deletion blocked; semester Trash/restore; View/Set current.
- Backup chooser/preview, app confirmation and legacy restore added one missing task, retained existing records.
- Reminder toggles/settings save, year-of-study selector, calendar download event.
- Full backup export produced a download event after including retained uploaded file.
- Academic year creation, semester creation and module enrolment controls.
- Academic year/semester edit forms save; global task search populated results.
- Global search result navigation, account menu open/Escape; delete X closes and cancels.
- Eight pages navigated through mobile bottom nav/More in light and dark modes: zero horizontal overflow; delete modal Tab/Shift+Tab focus wraps and Escape cancels.
- Course updates: add, edit, delete confirmation and proposal send to Inbox were exercised before the test browser native-prompt interruption..

The PDF download was compared byte for byte with the original 955-byte two-page sample. PDF search found the relevant page 2 and rendered it. A 33-byte text upload was previewed and remained available after deleting/restoring its academic year and semester. The full-backup export reported 3 tasks, 1 assessment and 1 private file; a synthetic legacy backup restore added one missing task while keeping existing records. Calendar and full-backup download events were observed. Full archive file restoration is additionally covered by automated checksum/adapter tests; a new full archive was not imported through the browser in this pass.

Eight main pages were navigated using mobile bottom navigation and More at 390 px in both light/dark mode: Home, Plan, Classes, Modules, Assessments, My Files, NTULearn and Settings. Every recorded layout had zero horizontal overflow. Desktop Plan/delete checks used 1440 px. Pop-ups fit mobile width, keyboard focus wrapped, and the final corrected test tab reported no console errors. The representative day heights were 119–224 px rather than the screenshot's stretched sections.

## External and device-dependent checks not completed

This report is not a claim that every live integration or every possible state was verified. The following require the user's account/device and were not marked as passed end to end:

- Real Supabase sign-in/sign-up/recovery email delivery, live session expiry and sign-out across devices.
- ChatGPT OAuth/MCP authentication and connected task changes.
- The installed NTULearn extension's real pairing, course mappings, automatic sync, protected material downloads and PDF copies. Their local validation/transport logic has automated coverage, but the synthetic browser cannot establish authenticated NTULearn access.
- Browser notification permission prompts and delivery with the real OS/browser; reminder preferences and scheduling calculations were checked.
- Arbitrary timetable screenshots: the existing image reader was not changed. The earlier sample OCR check and current text-import preview/save check do not guarantee grid recognition accuracy.
- All external source URLs, all future record combinations or a complete multi-device conflict scenario. Existing conflict guards have automated coverage.

## Repeating the local review

Run `python tests/build_study_fixture.py --audit`, serve the repository locally, and open `tests/study-ui-fixture.html`. All authentication, records and Storage are synthetic. The generated HTML is ignored by Git. `verification/audit-notes.txt` and `verification/audit-restore.json` are disposable synthetic upload/restore inputs. The restore fixture's metadata matches the unedited audit seed; regenerate the test page before reusing it after year/semester renames.

Screenshots and `browser-checks.json` are delivered alongside this report. The tracked feature branch is based on main after PR #24; no merge or production deployment was performed during this audit.
