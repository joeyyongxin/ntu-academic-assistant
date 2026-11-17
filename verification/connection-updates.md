# Connection updates — draft, no deployment

## Six requested updates
1. Implemented: working NTU Academic Assistant link/name; actual Settings scope fixed; optional authenticated connection-proof flow. No fabricated Connected state.
2. Targeted Undo/history: implemented in existing connector draft PR #3, not live. Existing personal server still has global latest-change Undo. Do not relabel it as targeted.
3. Semester context: implemented in draft PR #3 with context versions, module validation and record-to-semester mapping. Not available from current personal tools.
4. Retry safety: draft PR #3 uses transactional owner-scoped operation keys and rejects changed payloads under a reused key. Not active in the personal API.
5. Implemented: account/semester-scoped NTULearn snapshot status, error and last-success display, with explicit distinction between material links and saved PDFs. Per-course completion details are unavailable from the existing connector status contract; none are invented. No connector/Stage 4B changes.
6. Implemented: one Connections section retaining calendar export, with ChatGPT and NTULearn setup sheets. Existing controls, mappings, uploads and manual imports retained.

## Files changed
workspace/chatgpt-connect-hook.js; index.html; workspace.html; build_workspace.py; sw.js; tests/build_ui_fixture.py; tests/connections-browser.mjs; tests/connections-full-browser.mjs; this report; verification screenshots.

## Behaviour intentionally unchanged
Auth0 settings; Supabase configuration, database, existing RLS and Edge Functions; account restrictions; all schedule records; NTULearn extension and credentials; PDF copying/sync handlers; mobile More navigation. No production deployment or new live data tests in this work.

## Verification actually run
- 27 Node regression tests passed: production record projection/save semantics, modal keyboard, NTULearn sync and PDF-library handling.
- 4 synthetic isolated UI scenarios passed: 1440/390 px, light/dark; setup, pending/verified/failure, account boundary, NTULearn status states, existing PDF control, Escape, no horizontal overflow or page errors.
- 4 complete-app synthetic browser scenarios passed: same sizes/themes; Settings, ChatGPT sheet, NTULearn sheet and Escape, no overflow/page errors. External network was blocked.
- Desktop dark and phone light screenshots visually inspected. The full-app dark test uses data-theme=dark, not an unrelated class.
- Existing connector draft tasks.test.mjs: 5 tests passed on PGlite with synthetic database records; includes targeted Undo, exact retries/conflicting keys, stale semesters/modules, foreign records and nullable legacy durations. PGlite is a local in-process PostgreSQL engine with a synthetic base schema/auth claims; it is not hosted Supabase or a real OAuth flow.

## Limits / release gates
No Supabase TEST project reference supplied. Recovered planner-api source is still missing from the recovery worktree. These prevent hosted compatibility validation and deployment of draft PR #3. The optional proof endpoint must be deployed to a separate test connector with its flag enabled before the new live check can work; without it the UI reports verification unavailable, not disconnected. Direct plugin link is for the owner's private existing app, not a public multi-user installation link. No fresh-chat test of the NEW verification tool has been run.

## Manual review / deployment order
1. Review sheets using synthetic fixtures (run node tests/connections-browser.mjs and node tests/connections-full-browser.mjs). Real existing account data is not used.
2. Supply a public TEST project reference; recover the old API source and compare its entire contract before switching anything.
3. Snapshot/export data and save current commit/deployment/config versions privately before any hosted changes. Never commit environment values.
4. Test optional connector endpoint on a separate deployment, flag ENABLE_CONNECTION_CHECK=true, CONNECTION_CHECK_ORIGINS set to that exact test planner origin. Refresh MCP metadata; run the provided verification prompt. Wrong owner/origin and expired code must fail.
5. Review and test PR #3 separately against the non-production API. Its additive SQL has companion rollback scripts; hosted gates remain unchecked.
6. Production remains blocked pending explicit user approval. sw.js is bumped from v41 to v42 in this draft so cached setup code updates after a future approved website publish.
7. Roll back website by reverting this commit and bumping cache again. Disable ENABLE_CONNECTION_CHECK and restore the old connector commit to remove only the optional probe. It stores only ephemeral five-minute status, so no database rollback is required for this connector change. For draft #3 use its SQL rollback scripts only after preserving new audit/history and stopping writes.
