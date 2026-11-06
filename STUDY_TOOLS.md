# Study tools

These additions use the existing account/semester cloud preferences and save bridge. They require no Supabase schema, credentials or policy changes. Existing task durations and source records are retained.

- **Recurring tasks:** Add study task → Schedule → Weekly repeat. Choose module, weekdays, interval and an end date within the semester. Preview all dates, then create. Matching tasks are skipped. Occurrences can be edited individually; deleting one does not regenerate it. This is a bounded schedule creation feature, not a continuing background recurrence service.
- **Study timer:** Start timer beside a task on Home, Plan or a module page. Pause/resume, Stop and review, then save actual minutes. Actual sessions are separate from planned minutes. An unfinished timer is local to that browser tab; switching semester or signing out pauses it. Saved sessions sync with semester preferences. Review time after the device sleeps.
- **Assessment weights/results:** Assessments → Weight / result. Enter percentage, optional score and maximum. Totals distinguish earned points out of 100, scored/unscored weight, unassigned weight and average on scored work. Weights above a combined 100% are rejected. No letter-grade scale is assumed. Allow newly added assessments to finish saving before entering a result.
- **Reminders:** Settings → Deadline reminders. Choose one week/day/hour or the deadline, plus an explicit Singapore-time anchor for date-only items. Save settings for this semester. In-app reminders check while the app is open; optional browser notifications require a separate explicit permission click. This release has no closed-browser push service. Alerts may be missed while the browser/device is closed; it checks recently missed reminders up to one day old and does not repeatedly notify the same event. Date-only anchors are not verified event times.
- **PDF search:** My Files → Index PDFs, up to five per pass. Only private files already copied/uploaded to this account and semester are eligible. Search selectable text with page references, then open a rendered page. The saved-updates question panel also retrieves passages and saved assessment dates. This uses keyword matching and saved records, not an AI service. Indexes are local to this browser, scoped by account and semester, and can be cleared without deleting files. Copying from NTULearn is a separate connector workflow and remains subject to source access.

PDF limits: 10 MB, 200 pages and one million extracted characters per file; 100 indexed files/eight million characters per account-semester index. Image-only PDFs need OCR, which is not included. Unusual PDF encodings may not extract readable text; original download remains available. PDF.js 6.5.438 and Apache-2.0 license are vendored locally in vendor/pdfjs, with its worker cached by the service worker. No PDF bytes or extracted text are sent to an AI provider.

Full backups include the new semester metadata. Restore merges missing schedules, sessions and grades for the same owner without replacing current entries or reminder choices. An unambiguous restored assessment can recover its result through its module/title/date/time signature when the database UUID changes. Identical duplicate assessments require manual confirmation instead of guessing the association. Local PDF indexes and unfinished timers are not cloud records or backup contents; reindex/restart them on another browser.

## Verification

Run `node --test tests/*.test.mjs`. `python tests/build_study_fixture.py` creates an isolated browser fixture at tests/study-ui-fixture.html and a synthetic two-page PDF. The fixture substitutes authentication, cloud records and file storage before connecting the UI. It performs no real service writes.

Browser checks performed: recurrence preview/creation, timer review/save while preserving planned minutes, assessment totals (20% weighted, 8/10 produces 16 points), reminder preference saving, actual PDF extraction/index persistence after reload, page-2 search and visible page rendering, saved assessment answer with PDF source, mobile More navigation, light/dark layouts and no console errors in those flows. The deployed account's actual NTULearn PDF copy is not verified by these synthetic checks.


## Timetable import and revised task entry

Home uses one Add study task entry point for one-off and weekly tasks. The existing one-off notes/fixed fields and individual task editing remain available. Weekly schedules retain date previews, duplicate checks and bounded semester dates.

Classes → Import classes accepts a pasted class list or a PNG/JPEG/WebP image up to 10 MB. Tesseract.js 5.1.1 is loaded only on image selection; OCR runs in the browser and downloads its runtime/language files. Images are not uploaded to planner storage or an AI service. First use needs internet and can take time.

The parser recognizes one class per line with a module, weekday and explicit time range, such as `SC2000, Mon, 09:00–10:00, Lecture, LT1`. It also accepts `0900-1000`. OCR is not a general timetable-grid interpreter: screenshots without readable weekdays and explicit ranges in each class line need manual corrections or preview rows. Unread lines are reported, never silently imported. Users can edit every preview field and deselect rows. Unknown modules must be mapped to an enrolled module. All selected rows validate before any classes are added; duplicates are skipped, clashes rejected and account/semester changes block saving. The existing semester bridge saves the resulting classes.

Verification: synthetic browser checks covered one-off save, weekly preview/create, Home edit, mobile More/Inbox, timetable text preview/save, and OCR of `verification/timetable-sample.png` (two class lines). This does not establish accuracy for arbitrary student screenshots.


## Academic editing, priorities and moved tasks

- Settings → Manage years & semesters → Edit academic year / Edit semester changes metadata in place. Names, dates, teaching weeks and year assignment are editable; stable IDs keep tasks, files, classes and enrolments attached. Year changes never shift record dates. Duplicate names/years and date ranges excluding saved tasks, assessments, class dates or recurring schedules are rejected. These edits require the same signed-in writable workspace as other changes.
- Add/Edit study task offers Low, Normal (default) and High priority. Weekly repeat has the same choice. Priority is carried through the existing per-task preference extras keyed by database UUID, so no database column or SQL migration is needed. Priority is shown in Home, Plan and module tasks; it does not change task order.
- Move to today updates the same task's date, retaining its completion state, priority, notes and database identity. It writes an independent move-history snapshot into the semester's study preferences. Home shows moves involving the viewed day; module pages show that module's moves. Old completed source copies with the generated `Moved from YYYY-MM-DD to YYYY-MM-DD.` note are rendered as move history instead of crossed-out tasks. Their saved records are retained. A genuinely completed destination task still appears completed normally.
- Backup merge preserves task priorities and merges move-history entries by ID without duplication. Renamed academic-year/semester metadata continues to trigger the existing explicit conflict check when restoring incompatible older backups.

Verification used synthetic local data: moving an overdue task kept it unfinished, saved priority appeared on the module page, academic-year/semester renames saved, an end date excluding a saved assessment was rejected, and desktop/mobile task icons aligned with no horizontal overflow or console errors. Cloud metadata projection and backup tests cover priority and move-history persistence.


## Delete dialogs and workspace Trash

Delete confirmations now appear as app dialogs for tasks, topics, classes, assessments, course updates and private files. Cancel, X, Esc or clicking outside cancels. File deletion still removes the actual stored file when explicitly confirmed; workspace deletion instead goes to recoverable Trash.

Settings → Manage years & semesters has Delete academic year / Delete semester and a Trash section with Restore. Deleted workspaces are hidden from normal selection while retaining all records and file associations. At least one available semester is required. An empty academic year must have a semester created or restored before it can be viewed. Inbox Undo and backup restoration use app confirmation dialogs too.

See `verification/WORKFLOW_AUDIT.md` for verified controls, test results and live integration checks still requiring an account/device. Cache v35 includes the new workspace helpers for offline reuse after installation.
