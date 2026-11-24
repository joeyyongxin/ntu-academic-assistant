# Timetable and study-plan import review

Prepared against main `5eb2f4b` (PR #39). This branch is not a live deployment. All tests use synthetic records/images; no real planner records were read or changed.

## Files changed

- `workspace/timetable-import.js`: organise OCR words by their positions; recognise clear weekly weekday columns, multiline class lists, AM/PM/compact times, spaced course codes and enrolled-code O/0 or I/1 confusion. Return uncertain rows with their source text. Preserve blank unreadable values; canonicalise class duplicates before checking overlaps.
- `workspace/class-plan-import-hook.js`: one image/text/JSON review; compact expandable class summaries; editable flagged rows initially excluded; source-image preview; image drop target; stale-source/account/semester guards. Excluded rows do not trigger required-field validation.
- `workspace/class-plan-import.js`: improved formatting prompt for spatial image interpretation, required fields, course codes and ambiguity.
- `workspace/plan-import.js`: classify unchanged, new, changed and ambiguous tasks; stable snapshot references for renames/reschedules; preserve omitted optional fields; reject outdated/ambiguous references and conflicting changes; duplicate retry handling.
- `workspace/plan-import-hook.js`: optional unfinished-task context in the copied prompt, before/after review, explicit selection of updates, ambiguous-match chooser, existing task save pipeline, targeted Undo.
- `index.html`, `workspace.html`: identical shipped entrypoints containing the updated hooks.
- `sw.js`: shell cache **v46 → v47**. Necessary after publishing for installed/offline clients to replace cached code; no service-worker strategy changes.
- Tests: `tests/import-reconciliation.test.mjs`, `tests/smarter-imports-browser.mjs`, `tests/timetable-ocr-browser.mjs`; updated existing plan/class import regression expectations.
- Evidence: this report and `verification/smarter-imports/` screenshots plus the generated OCR input/result.

No changes to `config.js`, `data-service.js`, Supabase schema/SQL/RLS/Edge Functions, authentication, the MCP adapter, NTULearn connector, Stage 4B or live data. No framework/build dependency added. The previously prepared 50 MB backend change remains unrun and the default upload limit is unchanged.

## Behaviour changed

### Timetable

1. Open Classes → Import classes, then select/drop an image. OCR executes locally in the browser; public reader/language assets download as needed.
2. The importer uses word coordinates to keep clearly labelled weekday columns apart. Recognised classes appear as selected compact summaries. Expand a summary to edit its fields. View the original image when needed.
3. Unreadable/ambiguous rows remain visible with their extracted text, missing fields blank, and selection off. Correct/verify a row and tick it to include it, or leave it excluded.
4. Import selected classes checks enrolled modules, weekdays, time ranges, duplicates and clashes against both existing and selected classes before appending anything. Existing classes are not modified or removed.
5. Text/ChatGPT JSON is an alternative in the same sheet. Changing the source clears its old preview. A result arriving after an account/semester change or a newer source is ignored.

### Task plans

1. Open Home/Plan → Import a plan. Copy prompt can include up to 100 unfinished tasks, with scoped snapshot references. Titles/dates/module/duration/priority/times are included; private task notes and account identifiers are not copied. Untick the option to omit saved-task context entirely.
2. Ask ChatGPT to format the new/revised plan. The prompt asks for clarification rather than invented modules/dates/times and asks it to retain a reference when revising a listed task.
3. Paste JSON and Preview tasks. This performs no writes. Exact unchanged/repeated tasks are skipped. New tasks start selected. Changes show field differences and start unselected.
4. A reference can match a renamed/rescheduled task. Without a reference, a unique module/title match offers a possible update; repeated titles require an explicit existing-task choice or “Add as a separate new task.” Identical sessions cannot be added twice by choosing “new”; distinct sessions need distinct titles/times/dates.
5. Select intended updates/additions and Apply. Updates use the same original task and preserve its completion and omitted notes/priority/times. Unlisted and completed tasks remain in place. Nothing is deleted merely because the revised plan omits it.
6. A targeted Undo toast reverses the imported batch only while those tasks still match their imported snapshots. It does not overwrite later edits. Additions undone through the task deletion pipeline enter the existing Trash. Date changes retain the existing movement history behaviour.
7. Retrying an applied referenced change is skipped if its desired result is already present. A stale reference with a different current result is rejected, rather than creating a replacement task. References survive local numeric ID renumbering on reload, but fail closed for another workspace, changed content or identical ambiguous records.

## Intentionally unchanged

Existing sign-in, cloud save/storage services, task/class/assessment data models, permissions, task completion, manual task edit/delete, Inbox policy for autonomous ChatGPT/MCP proposals, 7-day Trash, Library, semester navigation, light/dark themes and bottom navigation/More. These imports are explicitly reviewed user actions; they do not alter the live plugin or require a plugin connection.

## Verification actually run

- **116 passing Node tests**, 0 failures: import validation/reconciliation; stale/cross-scope references; duplicate retries; completed-task protection; task change pipeline/Inbox; backup/restore; production metadata projection; Trash; optional times; recurrence/reminders/timer/grades; Library adapters; modal keyboard handling. These are local models/adapters and synthetic fixtures, not hosted Supabase integration tests.
- `node tests/smarter-imports-browser.mjs`: full app synthetic browser fixtures at **1440, 768 and 390 px**, each in **light and dark**. Clipboard context on/off, no-write preview, unchecked updates, ambiguity choice, same-ID rename/date/time/duration change, preserved notes, new sessions, targeted Undo, stale-preview/account guards, structured image-to-class wiring, editable/excluded flagged rows, two-column phone fields, no document horizontal overflow, duplicate import, source invalidation, mobile More → Settings, no page errors. External traffic blocked. OCR response in this full-app test is synthetic.
- `node tests/timetable-ocr-browser.mjs`: **real Tesseract 5.1.1**, generated weekly timetable image, public OCR assets only. Two course codes, Mon/Tue columns, explicit start/end times, class types and venues extracted correctly. Input PNG and parsed JSON saved in `smarter-imports/real-ocr-*`. This is a clear synthetic image, not a claim about arbitrary student screenshots.
- Existing `plan-import-browser.mjs`: four desktop/phone × light/dark cases; creation, validation, duplicate retry and scope guards passed.
- Existing `refinement-browser.mjs`: four desktop/phone × light/dark cases; JSON class prompt, expanding/editing rows, clash rejection, exclusion, import, priority dots and folder upload regression passed. Storage was mocked; no actual cloud uploads.
- Screenshots inspected for desktop dark and phone light plan/class layouts; additional screenshots for all six viewport/theme combinations are included. Browsers simulate viewport sizes; physical iPad/iPhone hardware was not tested.
- JavaScript syntax, identical entrypoints/embedded hooks, clean whitespace diff and added-content secret scan checked before commit.

OCR integration follows the pinned version’s [official recognition API](https://github.com/naptha/tesseract.js/blob/v5.1.1/docs/api.md#worker-recognize), using block/word coordinates as well as text.

## Limits

- OCR is not guaranteed accurate. Current automatic grid handling needs at least three clearly aligned weekday headings and explicit class time ranges in the class blocks. Grids whose durations appear only in a time axis, merged cells, cropped/blurry/rotated images, or complex week patterns may need corrections or the ChatGPT image-formatting route. Missing end times/class types are never filled with a default.
- Week-specific class annotations are flagged: the current timetable stores repeating weekdays, not per-teaching-week exceptions. The change does not add an exceptions model.
- Images remain limited to PNG/JPG/WebP up to 10 MB; text/JSON/class/task batch limits remain. OCR needs network access for its assets on first use; no image is uploaded to an AI service.
- Task reference matching uses the active workspace only. It is a local row locator, not a credential. Unknown/renamed tasks without a reference are not guessed using fuzzy title similarity. The copied prompt contains at most 100 unfinished tasks.
- No task removals, automatic whole-plan replacement, changes to completion or class rescheduling through these importers. Review selected changes before applying.
- The existing cloud adapter still saves asynchronously. This is not a server transaction/idempotency-key deployment; do not close the app before the saved status. After a failed/partial cloud save, reload and preview the current records before retrying. No hosted save or real-image accuracy test with the user’s data was performed.
- Undo is session/UI scoped; reload removes its toast. Existing Trash/backup recovery continues to apply. Restoring a previous deployed UI cannot reverse task changes already intentionally saved.

## Manual review / safe publication

1. Review the PR and screenshots. Merge the feature PR to `main` when ready; Pages uses the existing main-root deployment. No SQL/connector steps are needed.
2. After Pages finishes, reload the app with network access so cache v47 activates. Open Classes → Import classes with a real timetable image; compare module, weekday, time, type and venue against the original before importing.
3. Leave an uncertain row unticked and verify valid rows can still import. Re-import the same timetable and confirm duplicate classes are skipped. Try a conflicting time and confirm nothing is appended.
4. In Home/Plan → Import a plan, copy the fresh prompt with unfinished tasks included. Ask for one existing task to move day and one new session. Preview: the move is initially unchecked, additions checked, and the old task is shown in the comparison.
5. Apply the intended rows, wait for saved status, confirm the moved task keeps its completion/notes and the unlisted tasks stay. Re-import the already-applied reply to verify it cannot duplicate tasks; close that preview, then try the original Undo toast before making later edits.
6. Check More, modal keyboard close, light/dark and a narrow screen. A deployment rollback is a normal revert of this feature commit through a PR; no database rollback/migration is required.
