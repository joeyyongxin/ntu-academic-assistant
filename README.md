# NTU Academic Planner — GitHub-ready V7

Static site based on the latest V6 redesigned planner, with account status and username-alias login.

## Upload to GitHub
1. Create a **private** repository in GitHub (e.g. `ntu-academic-planner`).
2. Choose **Add file → Upload files**, and upload the **contents of this folder** (not the ZIP and not an enclosing folder). `index.html` must be at the repository root.
3. Commit the files.
4. In Netlify, link your GitHub repository as the deployment source (Site configuration / Build & deploy / Link repository), or create a new Netlify site via **Add new project → Import an existing project → GitHub**. The project is static: no build command; publish directory `.`. If creating a new site, configure its new URL in Supabase Auth redirect settings. Keep your previous site available until the new one works.
5. Netlify serves the PWA, Supabase stores your task data; uploading files does **not** replace or reset your database.

## Login and privacy
- `config.js` contains the **public** Supabase project URL and publishable key. Never commit a service-role key, `sb_secret_...`, a database password, or a user password.
- `username-config.js` currently has an empty alias. For username login, set `username` and `email` to your **existing** Supabase account's details before deployment. Note this mapping is **publicly readable**, even in a private GitHub repository once deployed to a publicly accessible Netlify site. You may simply log in using your email instead.
- Username alias does NOT create a user or set a password. The underlying Supabase email/password login must already work.
- A displayed cloud sync status isn't proof of full cross-device syncing: test an edit on device A and refresh device B.

## Latest study schedule import
- `latest-master-schedule-2026.json` is a separate optional import based on your newest schedule (27 Oct – 28 Nov 2026).
- 27–28 October listed tasks are marked completed; later tasks are unconfirmed. Your statement that **18 tasks** were completed includes items outside the 14 explicitly itemised for those two days; this file marks only the **14 supplied itemised tasks** done and doesn't invent four more.
- The 17–22 Nov and 25–27 Nov revision ranges are entered as **planning blocks**, not made-up individual daily sessions.
- IMPORTANT: if you previously imported earlier seed data, importing this will ADD new tasks, since the import function skips only matching IDs. **Export your current planner JSON first** and review for duplicates. Do not import again blindly. In particular, the 27–28 Oct tasks may differ from earlier records. GitHub deployment alone never imports this file.

## Known limitations
- The V6 app may show sync errors if Supabase table permissions/RLS policies are not configured to allow signed-in users to read/write their own rows.
- Offline writes and concurrent-device edits need real-world testing. Don't assume they are conflict-free.
- ChatGPT writeback requires a separate secured API and a supported integration; it's not enabled simply by hosting this repository.
