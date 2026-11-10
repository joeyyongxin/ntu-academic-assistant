# ChatGPT integration draft — local evidence, 2026-11-10

## Changed files

- chatgpt/config.js: disabled test-only configuration, no production URL/key.
- chatgpt/connection.mjs: account-bound connection/consent/revocation controller.
- chatgpt/settings-hook.js: shared setup sheet, status card, remote Inbox items,
  guarded approval/Undo and owner-change handling. Invite-only signup message.
- index.html, workspace.html: two optional script references at the end.
- build_workspace.py: preserve those references in the existing build path.
- state/change-pipeline.js, tests/change-pipeline.test.mjs: align browser policy
  with approved new-task/complete/reopen rules. Server remains authoritative.
- tests/chatgpt-connection.test.mjs: controller tests.
- tests/chatgpt-ui.html, tests/chatgpt-browser.mjs: synthetic browser fixture/run.
- verification/chatgpt/setup-*.png: four synthetic setup screenshots.

No edits to Supabase config.js/data-service.js, NTULearn connector, Edge Functions,
Auth0 configuration, existing RLS policies, production data or sw.js. No Stage 4B.
New backend SQL and test adapter live in the separately reviewed MCP draft.

## Behaviour changed (only when explicitly enabled for a separate test project)

Settings gains Connect ChatGPT setup/status/disconnect using existing Sheet and
UndoToast primitives. Backend proposals appear inside the existing Inbox sheet;
the header count includes them after a poll. New task/progress operations can
show an Undo toast while the planner is open; recent operations are fetched on
the next focus/open. A successful approval closes the sheet before showing Undo.
The module refuses known production endpoints and a mismatched planner project.

## Intentionally unchanged

Production defaults remain disabled. Existing tasks/classes/assessments/files,
semester storage, auth, NTULearn and mobile More are not migrated or replaced.
ChatGPT has no file access. No service-worker version is bumped without a later
deployment decision; a separate test origin avoids the live cache entirely.

## Executed verification

- `node --test tests/chatgpt-connection.test.mjs tests/change-pipeline.test.mjs
  tests/inbox-workflow.test.mjs`: 15 passed.
- `node tests/chatgpt-browser.mjs`: passed at 1440px and 390px, light and dark,
  in a fresh headless Chrome profile. All non-loopback requests were blocked.
- Browser actions: open setup, copy URL, inspect Open ChatGPT target, Esc close,
  refresh Connected status, Disconnect order, open Inbox, approve, click Undo.
- No page JavaScript errors or document horizontal overflow in those fixtures.
- Script syntax and Git whitespace checks passed.

These are the new component fixtures, NOT a browser verification of every page
in the full planner and NOT real ChatGPT/Supabase OAuth login verification.
Provider calls/statuses in the browser are synthetic. The backend draft records
its separate SQL/JWT tests and unrun hosted release gates.

## Limits / open release gates

Original planner-api source is unrecovered. No separate Supabase project or
management session was available, and no deployment was run. Real consent,
refresh-token revocation, callback metadata, SDK/token-hook compatibility, full
planner hydration and account/semester concurrency remain hosted release gates.
The polling path currently offers up to 20 recent operation toasts per session;
durable notification acknowledgement is not implemented. Already-consented
redirect-only authorization responses fail safely and require a fresh consent
request rather than silently authorizing or following an unchecked callback.

## Manual review (separate test project only, after deployment authorization)

1. Follow the MCP draft's backup, preflight and TEST setup checklist.
2. Point a separate planner copy to that test project; enable chatgpt/config.js
   with its matching URL, connector URL and administratively approved client ID.
3. Sign in as synthetic A. Settings -> Set up. Follow the documented ChatGPT web
   setup and verify consent names the same account/client and has no file scope.
4. In a fresh chat: read context, add one task, complete/reopen it, propose an
   edit/reschedule/removal. Confirm original schedule remains until approval.
5. Open Inbox, approve, Undo, reload, and verify the same task UUID is targeted.
6. Sign in as synthetic B and execute every cross-user negative release gate.
7. Disconnect A, test issued tokens and refresh, reconnect and test old tokens
   again. B must remain unaffected. Provider failures must leave Needs attention.
8. Repeat on desktop/phone, including keyboard focus, and record evidence.

Do not publish to the live website. No production deployment is authorized.
