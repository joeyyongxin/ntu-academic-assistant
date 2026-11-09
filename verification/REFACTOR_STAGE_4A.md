# Stage 4A — finished setup UI and verification

## Files changed (complete Stage 4A list)
- `index.html`: embed the setup UI adapter, load its model and add scoped responsive setup styles.
- `workspace.html`: identical entrypoint changes.
- `library/ntulearn-setup-model.js`: exact/ambiguous mapping suggestions, per-course selection validation and honest status rules.
- `library/ntulearn-setup-hook.js`: setup sheet, existing connector command handoff, save/disconnect, status chip and duplicate setup removal. Preserves manual import controls inside the sheet.
- `tests/ntulearn-setup.test.mjs`: 14 dedicated automated setup/status tests.
- `tests/build_study_fixture.py`: optional synthetic setup connector responses for browser review. Does not contact NTULearn or Supabase.
- `sw.js`: cache v40 → v41 and cache the new setup model so the UI updates after a later deployment.
- `verification/REFACTOR_STAGE_4A.md`: this report.

No connector files, connector credentials, Edge Functions, SQL, RLS, backend configuration, Supabase config, data-service or MCP/OAuth files changed. No live-data operation was performed. No 4B implementation was started. The existing 4B proposal was not modified in this task.

## Behaviour changed
- One NTULearn setup sheet owns the existing connection/approval handoff, course mappings and per-course Keep PDFs in Library controls. The existing connector still owns course selection and permission approval; no new pairing code or credential protocol was added.
- Exact enrolled course codes are suggested only when unambiguous. Unmatched courses, code substrings and multiple-code names remain unselected. Previously confirmed skips persist when reopening.
- Saving rechecks pairing and PDF approval. Only selected courses enter the update mapping, and only their individually checked PDF courses enter the PDF-copy mapping. Existing records remain intact.
- Disconnect uses the existing command and disables planner-open automatic updates/PDF saving. Late status responses cannot reverse the disconnected state. An already-started existing transfer may still finish under the existing transfer behaviour.
- Status chip has Not connected / Syncing / Up to date / Needs attention and visibly says planner open. Up to date requires a fresh source snapshot, a completed planner-open check, no warning/failure and no pending selected PDF work. It is not set merely by loading setup. Workspace writes still pending prevent a premature completed status.
- Missing attachments produce Needs attention. Failure feedback is retained when reopening setup. Scope changes discard stale setup actions.
- The sheet, Settings card, chip tooltip/accessibility name and save notice explicitly state that PDF saving needs this planner open and visible. Closing the planner stops cloud saving.
- Old overlapping setup controls were removed from Settings/Library. Calendar and announcement manual import controls remain in the setup sheet's Manual import options.

## Behaviour intentionally unchanged
- Existing connector 0.9 permission/approval messages and APP_CONNECT / APP_STATUS / APP_SNAPSHOT / APP_SYNC / APP_DISCONNECT protocol; no credential creation or refresh changes.
- Existing planner-open PDF fetch, file validation, authenticated upload, consent checks, source identity protections and Library links.
- Tasks, assessments, classes, files, Inbox rules, semester data, manual import handlers and other account settings.
- No local background PDF cache, intake service, grant/token, expiry policy or other 4B functionality. 4B remains unimplemented and unapproved.
- Nothing merged, published, deployed or executed against the live project.

## Verification actually run
- 14 dedicated setup tests passed: existing pairing command; exact/ambiguous/unmatched/substrings; individual PDF choices; save and skip persistence; PDF permission refusal; disconnect preservation; pending-request Syncing; all four chip states; stale/invalid timestamps and pending/warning failure states; account/semester changes; PDF toggle off; fresh pairing recheck; Sync now; failed PDF feedback after reopening; late response after disconnect. Some cases share a test.
- Full suite: 208 JavaScript tests passed. 4 Python tests passed.
- New source syntax checks and git diff whitespace check passed. Entrypoint tests parse inline scripts and require the two entrypoints/source mirror to match.
- Browser tests used only the optional synthetic account, records, Storage service and connector responder at localhost. Simulated pairing stands in for the real extension approval; no real extension login/approval was performed.
- Desktop 1440×1000: inspected setup in light and dark mode; exact SC2000 suggested; combined/unmatched courses initially skipped; edited a mapping; checked one course's PDF toggle; saved; observed completed planner-open status. With the final missing-attachment fixture, enabling PDFs produced Needs attention with the zero-attachments reason.
- Phone 390×844: inspected light and dark mode; loaded courses; saved/reopened; checked retained mappings and skipped courses; ran Sync now; observed Up to date with the planner-open qualifier when PDF saving was off; disconnected and observed Not connected. Expanded Manual import options and observed both import inputs. Escape closed the sheet and returned focus to Set up NTULearn.
- Browser directly observed Not connected, Needs attention and Up to date. Transient Syncing was asserted by the automated pending-request test; no browser screenshot of that transient state is claimed.
- Measured no horizontal page overflow in the checked desktop and phone views. Final browser error log was empty.
- Screenshots: `outputs/Refactor_Stage_4A/desktop-setup-light.png`, `desktop-setup-dark.png`, `phone-setup-light.png`, `phone-setup-dark.png` (outside the repository).

## Limits
- No real connector, real NTULearn session, real PDF transfer or live Supabase saving/reload was tested in this stage. The missing-PDF browser case deliberately returned no attachments. The previous Step 3 download verification is not claimed as a new 4A test.
- The fixture resets synthetic records on reload. Reopening persistence was checked within the running fixture; actual cloud reload persistence still needs separate verification.
- Manual import controls were expanded and observed, but new calendar/announcement file imports were not run in this browser pass.
- No tablet browser check was run for 4A; this pass covered the desktop and phone sizes requested.
- Existing PRs 28–30 and their live recovery gates remain prerequisites. This PR is stacked on Step 3, and must be reviewed/merged in sequence and retargeted appropriately before publication.
- Up to date is the most recent successful planner-open check, not a promise of instant updates or cloud saving with the app closed. Source freshness is limited to one hour; the existing connector refresh cadence and NTULearn session limits still apply.

## Manual review steps
1. In a preview, open Settings → Set up NTULearn, or tap the header chip. Verify the planner-open/visible wording and a single setup area.
2. Connect through the existing connector and approve the current account/semester. Choose courses there, then Load selected courses in the sheet.
3. Confirm one exact-code suggestion. Verify ambiguous/unmatched courses stay on Skip course, then explicitly map only courses you want.
4. Tick Keep PDFs in Library for one mapped course, leave another off, save and reopen. Verify each setting independently; skipped courses should remain skipped.
5. Keep the planner open and visible and run Sync now. If the source offers an approved PDF, check it in Library. Missing permissions/attachments must show Needs attention, not a PDF-save success.
6. Turn PDF saving off, save, and verify a completed source/update check can show Up to date with the visible planner-open qualifier. Closing the page must never be represented as cloud saving.
7. Disconnect. Verify the chip becomes Not connected and old tasks/materials/files remain. Repeat setup in desktop and phone light/dark themes; check Escape and scrolling.
8. Perform any real cloud/PDF verification only in an approved preview/test workflow with disposable data. This implementation and its tests did not touch production. Do not start 4B.
