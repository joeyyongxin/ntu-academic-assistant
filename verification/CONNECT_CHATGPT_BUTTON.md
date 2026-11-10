# Connect ChatGPT — existing personal connection

This UI-only branch follows the user's narrowed request for a Settings button.
It does not deploy or continue the new multi-user/test-project backend work.

## Changes

- workspace/chatgpt-connect-hook.js: replace the old ChatGPT status row with a
  Connect ChatGPT button; open the existing shared Sheet with setup instructions,
  the documented https://chatgpt.com/plugins link and Copy URL.
- index.html/workspace.html: load the one new script. Existing HTML/inline
  scripts are unchanged apart from that reference (verified against main).
- build_workspace.py: retain the script reference when rebuilding.
- sw.js: cache v40 -> v41 and add the new script so installed copies receive it
  after publication. The cache change was announced before editing.

Existing connector: https://academic-assistant-mcp.onrender.com/mcp. This is a
public endpoint, not a credential. The button makes NO request to it. Connection
and authorization still happen inside ChatGPT using the user's existing Auth0
connection. No fake Connected status, invented one-click authorization link or
planner-side Disconnect is provided. Other student accounts are not enabled.

No data layer, task handlers, Auth0 configuration, API, Edge Function, SQL, RLS,
NTULearn connector or Stage 4B changes. No tokens, keys or credentials are used.
The multi-user backend draft PRs remain separate and unmerged.

## Verification actually performed

Local browser fixture using the app's stylesheet and actual shared Sheet:
1440px/390px, light/dark. Verified button opens, correct link/URL, clipboard copy,
Esc close, reopening without duplicate sheets, neighbouring NTULearn row
preserved, no page errors or document horizontal overflow. No external requests
were allowed. Script parsing and Git whitespace checks passed. This is not a
live Auth0/ChatGPT login test or a full-app account/data verification.

Official connection steps checked:
https://developers.openai.com/plugins/deploy/connect-chatgpt

## Publication boundary

This branch has not been published. The user's earlier instruction explicitly
reserved production deployment until they say "deploy to production". If they
approve publishing this button, deploy this UI-only branch only; do not merge
the multi-user backend or experimental OAuth drafts as part of that action.
