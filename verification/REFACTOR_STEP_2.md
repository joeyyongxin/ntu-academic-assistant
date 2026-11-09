# Refactor Step 2 — one Inbox and change routing

## Files changed
- `index.html`, `workspace.html`: task/class/assessment edits and deletions use applyOrPropose; header Inbox badge and shared Inbox sheet; existing Inbox links open the sheet. Entry points remain identical.
- `state/change-pipeline.js`: source/operation rules, detached proposal snapshots, normalized comparison, stale/ambiguous target checks.
- `inbox/workspace-inbox-hook.js`: source mirror of the embedded Inbox UI and approval adapter; no framework or new build step.
- `workspace/production-bridge.js`: persist immutable database UUIDs on pending task/assessment changes, resolve local IDs after loading, mark missing targets unavailable.
- `workspace/ntulearn-sync-hook.js`, `workspace/ntulearn-auto-hook.js`: material/Hub changes use the shared routing path; manual review renders in Inbox; clear saved selections and retain success feedback. Settings connection status retains its own element.
- `workspace/backup-recovery.js`: imported schedule proposals retain their data but are held unavailable until their saved database identity can be resolved. They cannot target a recycled local ID immediately after restore.
- `sw.js`: cache v38 → v39 and include the change-pipeline module.
- Tests: change-pipeline, inbox-workflow, production-workspace, backup-recovery, planner-refinements, ntulearn-auto, ntulearn-sync, build_study_fixture.

## Behavior changed
- Header Inbox badge counts pending proposals. Approval Inbox navigation and NTULearn review entry points open this shared sheet.
- New user tasks save immediately. New classes/assessments retain their existing direct-save behavior. New NTULearn material/Hub entries and safe source refreshes apply through the same routing function.
- Editing, moving or deleting an existing task/class/assessment creates a proposal; the current record remains until approval. Identical user edits create no redundant proposal.
- ChatGPT/MCP source changes are always classified as proposals. Existing MCP proposal creation and authentication are untouched.
- Approval rechecks the original record and class overlaps. Changed, missing or ambiguous targets are refused.
- Approval closes the sheet and provides Undo in a toast, making it reachable with keyboard focus outside the modal. Existing task approval Undo no longer asks for confirmation. The existing unchanged-task guard remains.
- Approved schedule deletions use recoverable Trash. File, topic, Hub and academic-period deletion retains Step 1 behavior.
- Manual NTULearn snapshot review now lives in Inbox; saving clears the review choices and shows the result. Course mappings/pairing remain in Settings until Step 4.

## Behavior intentionally unchanged
- Completion checkboxes, topic progress, actual study sessions and assessment results remain direct progress updates; schedule field edits/removals use Inbox.
- Existing automatic recurrence creation, file/PDF storage and source protections, calendar/announcement import validation, semester isolation and mobile More controls.
- MCP adapter, OAuth/Auth0 configuration, Edge Functions, database schema, RLS and connector package.
- No live account records were edited. Nothing merged or deployed.

## Verification actually run
- 180 JavaScript tests pass, including proposal-vs-apply rules; delete→approve→Undo; stale approvals/Undo; scope isolation; duplicate proposals; no-op edits; class overlap recheck; UUID resolution after local IDs shift; missing records; backup proposal safety.
- 4 Python tests pass. Inline-script parsing is covered by the entrypoint tests. Git diff whitespace check passes.
- Browser with synthetic account/data only: task edit waits; approval updates its title and closes Inbox; Undo restores the original title. Schedule delete waits, approval removes the task, Undo restores it. Existing legacy proposal approval shows Undo without a confirmation.
- Browser with a synthetic connector responder: snapshot loads inside the mobile Inbox; selected material saves through applyOrPropose; Hub count increases; saved choices clear and success feedback appears.
- Checked desktop light and 390px mobile dark. Mobile width measured 390px with no horizontal page overflow; screenshots inspected. Escape returns focus to header Inbox trigger; mobile More remains usable. Captured browser error log was empty after final checks.
- Screenshots: `outputs/Refactor_Step_2` outside the repository.

## Limits and publishing
- PR is stacked on Step 1 (PR #28); review/merge Step 1 first, then retarget Step 2 to main.
- Real Supabase persistence and real NTULearn browser pairing were not exercised. The inherited Step 1 live soft-delete/restore gate still applies before publication.
- Fixture reload resets sample data. Reload identity safety is tested through the production projection adapter with fake records, not a real-account browser reload.
- Class/assessment edit routing is covered by code and workflow tests; those full form flows were not individually clicked in this browser pass.

## Manual review steps
1. Open the preview and press the header Inbox badge. Close with Escape; focus should return to the badge.
2. Create a disposable task: it should save immediately. Edit its title: original stays visible and badge increments. Open Inbox, compare and approve; revised title appears with Undo. Undo returns the original.
3. Delete the disposable task: it remains pending approval. Approve, Undo, and verify Trash recovery. Test real cloud save/reload only with disposable data.
4. Propose a class time change, add a conflicting class, then approve. Approval must refuse the overlap and keep both existing records intact.
5. Create a pending edit, change that task's progress or contents elsewhere, then approve the old proposal. It must refuse a stale overwrite.
6. With the real connector paired, open review from Settings. It should open the same Inbox sheet. Review an item and save; the success message replaces the choices. Verify the saved Hub item once.
7. Switch semesters/accounts and verify pending changes and toast actions cannot affect a different workspace. Reload and verify task/assessment proposal targets resolve to their original records.
8. Repeat on phone/tablet and light/dark themes. No merge or production deployment is part of this step.
