# Refactor Step 3 — one Library

## Files changed
- `index.html`, `workspace.html`: unified Library rendering, one desktop/mobile Library destination, course updates retained inside Library, upload/material/update sheets, source-aware PDF linking and compact responsive rows. Entry points remain identical.
- `library/library-model.js`: combines materials and uploaded assets without duplicate standalone rows, module guessing, exact-source-hash link suggestions, reversible links and shared attachment associations.
- `library/workspace-library-hook.js`: source mirror of the embedded UI adapter. Uses the existing authenticated file service and workspace preference saving.
- `library/LINKING_PLAN.md`: non-destructive mapping design, described before implementation. No database migration is required or was run.
- `workspace/ntulearn-library-hook.js`: background PDF copies retain source-to-asset relationships when newly saved or deduplicated.
- `workspace/backup-recovery.js`: merges links using material identity, handles Hub ID collisions, remaps restored Storage IDs and attachment Trash recovery metadata.
- `sw.js`: shell cache v39 → v40; include Library model.
- Tests: `unified-library.test.mjs`, `library-workflow.test.mjs`, `backup-recovery.test.mjs`, `build_study_fixture.py`.

## Behavior changed
- My Files and NTULearn now share the Library destination. Module folders contain uploads and course materials, with source labels. Announcements, deadlines, saved-update questions and sync controls remain under Course updates within Library.
- A linked material appears once with its stored PDFs as attachments. One physical PDF can retain multiple source associations when existing deduplication shares it between materials.
- New manual/bulk/background PDF copies save links using their known source and Storage ID. Existing copies remain separate unless a certain source-hash match is reviewed and accepted, or the user chooses Attach existing file. Detach reverses links.
- Row click opens a preview sheet; a single saved attachment previews automatically. Multiple attachments are listed with individual actions. Existing upload date/module/size details remain available in the sheet.
- Download and Delete are icon buttons with tooltips and accessible names. Material bulk controls appear when materials are selected; retry and stop controls remain available.
- Upload supports multi-selection with an editable per-file module guess. Dropping files onto a module folder opens the same review with that module selected. Up to 50 files per batch, existing 10 MB/type validation per file. Partial upload retries skip files already saved during that attempt.
- Material deletion uses recoverable Trash, hides its exclusively linked attachments and retains stored bytes. Shared attachments remain available through their other material. Undo restores the material and its attachment flags without overwriting later Trash changes.
- Add/edit course updates and task-proposal forms open as sheets. Escape closes them, and Add can reopen after closing.

## Behavior intentionally unchanged
- Existing tasks, classes, assessments, Hub rows and stored assets are retained. Link metadata changes presentation; no existing Storage object is moved or removed by linking.
- Auth, Supabase configuration, data-service, backend schema, RLS, Edge Functions, MCP adapter, OAuth and connector package.
- PDF permissions, source validation, pairing, download service, copy validation, PDF indexing/search, Inbox routing and original course-update save validation.
- Mobile More menu retains Modules, Assessments, Settings and Sign out. Library is now directly available in the bottom navigation; Inbox remains in the header.
- No production account records, real NTULearn session or live website were changed.

## Verification actually run
- 194 JavaScript tests and 4 Python tests passed. Syntax and diff whitespace checks passed.
- Automated coverage: canonical entries, no duplicate standalone copies, source/module isolation, ambiguous-match refusal, module guessing, shared attachments, material deletion/Undo including unfetched assets, later Trash-change protection, cross-account copy isolation, backup link/Storage-ID remapping and Hub-ID collision safety.
- Isolated browser fixture only: module folders, material preview sheet, one preview element ID, material delete/Undo, Detach and Attach, course updates, Add update sheet including close/reopen/save, and mobile More.
- Multi-file chooser selected two synthetic PDFs. SC2000 was guessed correctly for one filename; the other required and accepted SC1004 before save. Both module counts increased. The first detached-picker implementation failed the test and was corrected; the attached picker then succeeded.
- Downloaded `Synthetic regression notes.pdf` using the material row's actual Download button. Downloaded bytes and original fixture both had SHA-256 E00B3CF09809E101565AA400A6F183B75243467BB3931DD4A4A2641A9F5E095B.
- PDF indexing completed for two PDFs. Search for regression returned matching page-2 passages with module, filename and page reference.
- Inspected 1440px desktop light, 390px phone dark and 834px tablet dark. No page horizontal overflow in checked views. Fixed inherited mobile flex-direction styles that initially stacked actions; final file rows keep icons beside the title. Library appears in the phone bottom navigation.
- Captured final browser error log: empty. Screenshots saved in `outputs/Refactor_Step_3` outside the repository.

## Limits / release gates
- This PR is stacked on Step 2 (#29), which depends on Step 1 (#28). Merge/review in that order and retarget later PRs to main.
- Real cloud soft-delete/restore verification from Step 1 remains outstanding. All browser writes here used synthetic services. No live-data linking migration was run.
- Drag/drop was implemented but not directly automated with an OS file drag; multi-select review and upload were verified in the browser.
- Real connector PDF fetching/background copy was not exercised. Existing source errors and permissions still apply. A material without saved file bytes cannot become downloadable merely by linking.
- The embedded PDF frame opened; the in-app browser showed its fallback rather than rendering PDF pages. The actual Download succeeded and its bytes were verified separately.
- Fixture reload resets sample records; persistence/link remapping is covered by adapter and backup tests rather than a live-account browser reload.

## Manual review steps
1. Open Library, expand a module and verify uploaded and source material entries. A known linked PDF should appear under its material only, not as a second standalone row.
2. Click a row to preview; use its Download icon. Verify the downloaded file opens in a normal browser/PDF reader.
3. Upload two disposable files. Confirm module guesses, correct ambiguous assignments and save. Drop a file onto a different module folder and confirm that module is preselected.
4. For an older unlinked copy, open its material, choose Attach existing file and select the correct file. Detach and verify it becomes a standalone upload again. Review exact-hash suggestions without applying uncertain filename matches.
5. Delete a disposable material with attached PDFs. Undo and verify both material and attachments return. Test an individual attachment deletion separately; the material should remain.
6. Check Course updates, announcements, deadlines, source links, saved-update search and Inbox proposal creation. Add an update through its sheet; validation errors should keep it open.
7. Index a saved PDF and search for a phrase. Check filename/module/page references and opening the result.
8. Test phone, tablet and laptop in light/dark mode, including Library in bottom navigation and More. Before production publishing, finish the inherited real cloud recovery gate using disposable data.
