Production workspace storage

The new UI is index.html (also available as workspace.html); the previous interface is preserved as legacy.html. It uses the existing production Supabase project from config.js.

The additive migration supabase/001_workspace_preferences.sql creates owner-only storage and RPCs for academic-year/semester settings, module enrolments, topics, classes, feed updates and Inbox proposals. It does not change the tasks or assessments tables. This migration has been exercised in an isolated PostgreSQL-compatible database and was subsequently installed by the user, who reported Success. No rows returned on 2 November 2026.

Until the migration exists, tasks and assessments continue to use existing tables. Extended settings show pending and are not claimed to be saved. Once installed, the app detects the RPC on sign-in/reload and enables the original v2.9 semester manager, topic editor, timetable, manual course hub and proposals.

Production review: back up the database, confirm the project used by config.js and review the migration before release. No secret API key is needed in the browser. Install the migration with an authorised database administrator; do not change anon grants to existing task tables.

Concurrency: settings use owner-only RPCs with revision checks. Task and assessment updates retain existing row-version RPCs. These are separate transactions; if settings fail after a task write, the UI reports partial persistence and requests export/reload. It never blindly retries.

Private files are implemented in workspace/file-library.js, workspace/files-hook.js and the preview modules. Apply supabase/002_private_files.sql after the preferences migration, or use the combined supabase/install_workspace.sql for both. The migration creates a private 10 MB bucket and owner/semester/module checks. The user reported successful installation of the combined migration in the production project on 2 November 2026. Review existing Storage policies before release because permissive policies elsewhere can combine with these policies.

File previews: plain text/Markdown/CSV are rendered through textContent, images/PDF require matching signatures, and blob URLs are revoked on close, sign-out and semester changes. PDF rendering depends on the browser's sandboxed PDF viewer; Download remains available. Office documents and archives are download-only. No public or signed download links are created.

The user confirmed production sign-in, saved academic settings and PDF upload/preview/download after the MIME fix. Mobile More and preview behaviour were checked with an isolated browser fixture. Remaining integrations include direct NTULearn access, optional AI, actual ChatGPT connection verification and live website publication.

Cross-device updates: while visible, the new workspace checks task/assessment version fields and the workspace preference revision once per minute and when returning to the window. A notice offers reload; it does not replace the open form. Unsaved form entries and failed saves require an explicit discard/reload decision. Polling skips local saves and discards results after an account switch. No Realtime configuration is required. The combined SQL installer includes aa_workspace_revision. Older installations fall back to the owner-only load RPC for the revision check.
