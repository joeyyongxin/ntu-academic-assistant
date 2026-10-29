NTU ACADEMIC PLANNER — REDESIGNED UI

This update changes the website layout but preserves the existing task database,
Supabase project configuration, sign-in controls, schedule import/export and app.js.

TO UPDATE NETLIFY:
1. Make an Export backup of your planner first (especially if you have local-only edits).
2. Extract this ZIP and upload the *folder containing index.html* via Netlify Deploys.
3. Open your Netlify URL and hard-refresh the page.
4. Check sync status, sign-in, All Tasks and Assessments before changing any tasks.
5. Test on phone and laptop using the same Supabase account.

WHAT'S NEW:
- Desktop sidebar navigation and phone bottom navigation
- Redesigned task cards, assessment panels and dashboard indicators
- Responsive layout, cleaner form styling and module tags
- Existing Daily, Weekly, All Tasks, Assessments, Edit schedule features retained

IMPORTANT:
- A green Cloud synced status should still be verified by checking records in Supabase.
- The earlier 'Auth session missing!' password-update issue may still require a separate
  authentication fix. The redesign does not claim to repair authentication internals.
- The ChatGPT undo action still requires your separate API deployment.
- Do NOT put a Supabase secret/service-role key in config.js.
- This archive is not a live deployment; you must upload it to Netlify.
