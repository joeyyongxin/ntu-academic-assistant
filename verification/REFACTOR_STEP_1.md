# Refactor Step 1 — shared controls and workspace state

## Files changed
- `index.html`, `workspace.html`: shared UI wiring, header semester selector, academic manager sheet, recoverable delete handlers, hidden trashed files and PDF search filtering. Entry points remain identical.
- `ui/primitives.js`: Sheet/Modal, IconButton, UndoToast, EmptyState. Home and Plan continue using the shared `ui/date-nav.js` introduced in PR #27.
- `state/workspace-provider.js`: single account, active semester and academic settings state, with compatibility accessors for existing screens.
- `state/record-trash.js`: recoverable record deletion and restoration.
- `workspace/production-bridge.js`, `workspace/local-store.js`: persist Trash metadata and preserve database UUIDs when soft-deleting/restoring tasks and assessments.
- `workspace/backup-recovery.js`: preserve deleted records, allocate collision-free restored IDs and remap file Trash entries when restored storage IDs change.
- `workspace/ntulearn-auto-hook.js`: do not automatically resurrect a material explicitly placed in Trash.
- `sw.js`: shell cache v37 → v38; cache new shared modules.
- Tests: `shared-workspace.test.mjs`, `production-workspace.test.mjs`, `backup-recovery.test.mjs`, `modal-keyboard.test.mjs`, `workspace-trash.test.mjs`, `build_study_fixture.py`.

## Changed behavior
- Switch semesters in the header. Open academic years/semesters/modules/Trash in its management sheet.
- Delete task, class, assessment, topic, course update, file or academic period immediately; recover with Undo or Trash.
- Deleted files retain their Storage objects. No permanent file deletion is performed by these controls.
- Add/edit assessment joins the shared form sheets. Existing form validation and saves remain in place.
- Shared sheets support Escape, outside click, focus trapping and focus return. Buttons retain accessible names and tooltips.

## Intentionally unchanged
- Backend schema, RLS, Edge Functions, authentication, OAuth, MCP adapter and connector.
- Existing navigation destinations and mobile More menu. Inbox consolidation is Step 2; Library consolidation is Step 3.
- Existing task/class/assessment save validation, timer, recurrence and import behavior.
- Backup restore still asks for confirmation. The existing unsaved-work reload warning remains. Approval Undo confirmation remains for Step 2.
- No live account data was edited during verification. No merge or deployment performed.

## Verification actually run
- 169 JavaScript tests passed; 4 Python tests passed.
- `git diff --check` passed.
- Isolated browser fixture (no real service calls): task/class/assessment/file/year deletion and Undo; semester switching; class sheet Escape; assessment sheet save; mobile More → Assessments; Home day and Plan week navigation.
- Responsive checks at 390, 834 and 1440 pixels: inspected mobile academic sheet, tablet Plan and desktop Home; measured no horizontal page overflow in these checked views.
- Dark mobile/tablet and light desktop screenshots saved outside the repository in `outputs/Refactor_Step_1`.
- Captured browser error log: empty.
- Mock service test confirms task soft-delete and Undo use the original database UUID and clear `deleted_at` on restore. Backup test verifies restored-file bytes through the actual Library adapter with a mock storage service.

## Limits / remaining release check
- No real cloud soft-delete/restore round trip was run. The existing RPC must allow clearing `deleted_at`; this is not proven by the mocked adapter tests. Keep this PR in draft until that check is complete with a disposable record.
- Browser fixture resets on reload; persistence is covered by automated projection tests, not a real-account browser reload.
- Topic and Hub delete handlers were not individually exercised in this browser pass.
- This report covers Step 1, not an exhaustive retest of every unrelated existing feature.

## Manual review steps
1. On a preview with a disposable task, switch semesters using the header. Open the manager and close it using Escape; keyboard focus should return to its trigger.
2. Add a task and assessment through their sheets; enter invalid data and confirm the sheet stays open. Save valid data and confirm it closes.
3. Delete the disposable task; it should disappear immediately with an Undo toast. Undo and verify the same task returns.
4. Delete it again, wait for the saved status, reload, then restore it from the academic manager's Deleted items. Verify it returns once and cloud saving succeeds. This is the outstanding live RPC check.
5. Repeat Delete/Undo for a disposable class, topic, course update and uploaded file. Verify file download still works after restoration.
6. Delete an empty second semester/year and Undo. Existing populated semesters must remain untouched.
7. Review Home/Plan DateNav and mobile More in light/dark themes. Try 390px phone, 834px tablet and laptop widths.
8. Restore a backup only in a disposable workspace; confirm it preserves Trash records and file recovery. Restore remains the explicit confirmation flow.
