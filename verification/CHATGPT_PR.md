Depends on the MCP task-policy and invite/grant drafts. Adds a disabled-by-default
test-only Connect ChatGPT Settings card/sheet using existing UI primitives,
owner-bound status/consent/revocation calls and remote proposals in the Inbox.
Adds targeted Undo toasts, and aligns browser policy with immediate new tasks
and complete/reopen. Edit/reschedule/remove remain proposals.

The setup text includes the exact eligibility notice and uses the documented
https://chatgpt.com/plugins navigation target, not a one-click installation URL.
Production endpoints and mismatched planner projects are refused. No existing
Supabase config/data service, NTULearn connector, Edge Function, RLS or sw.js
was changed. No data migration, live edits, Stage 4B or ChatGPT file access.

Ran: 15 Node controller/pipeline/Inbox tests passed. Synthetic headless Chrome
fixture passed at 1440px and 390px in light/dark, with non-loopback requests
blocked: setup/copy/Esc/status/disconnect/Inbox approval/Undo, no page errors or
horizontal overflow. Screenshots and exact limits are in verification/.
This is NOT a full-planner or real ChatGPT/Supabase login verification.

Do not merge/deploy. The original planner-api source is unrecovered and hosted
OAuth/SDK/hook/callback/refresh revocation tests remain unrun. Backup, preflight,
test setup and rollback steps are in the MCP draft's deployment checklist.

Cross-user release gates, unchecked until actually run on a separate Supabase
project with synthetic A/B:

- [ ] A cannot list, search, count or retrieve B's records.
- [ ] A cannot edit, complete, reschedule or remove B's task by ID.
- [ ] A cannot create under B's account or semester.
- [ ] A cannot approve, dismiss or undo B's operation.
- [ ] Mixed-owner batches fail atomically.
- [ ] Retry keys never return another owner's result or collide across owners.
- [ ] Matching emails do not cause automatic account linking.
- [ ] Expired/tampered/replayed authorization requests fail.
- [ ] Disconnect blocks issued tokens and provider refresh attempts.
- [ ] Old tokens never revive after reconnect; revoking A leaves B working.
- [ ] Concurrent requests, caches and jobs preserve owner isolation.
- [ ] Errors do not disclose another owner's record existence.
- [ ] Real fresh-chat and full-planner browser/account/semester flows pass.
