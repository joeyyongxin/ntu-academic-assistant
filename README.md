# NTU Academic Planner — GitHub Pages edition (V7)

This is the redesigned planner for phone, tablet and laptop. Supabase remains the database; GitHub Pages only hosts the website files. **Deploying code does not import or alter your tasks.**

## Publish with GitHub Pages

1. Go to https://github.com/new and create a repository called `ntu-academic-planner`.
2. For a **free GitHub Pages site**, use a **public repository**. Only add the files inside this website folder. Do not upload personal files, schedule exports, credentials, or the separate study-schedule JSON.
3. Open the repository, choose **Add file → Upload files**, select **every file in this folder** (not the folder itself), and click **Commit changes**. `index.html` must be in the repository root.
4. In the repository choose **Settings → Pages**. Under **Build and deployment**, set Source = **Deploy from a branch**, Branch = `main`, Folder = `/ (root)`, then **Save**.
5. Find your link on that Pages settings screen. Usually it is `https://YOUR-USERNAME.github.io/ntu-academic-planner/` (replace `YOUR-USERNAME`).
6. In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to your GitHub Pages URL if this is your primary planner and add the exact GitHub Pages URL under **Redirect URLs**. Keep the Netlify URL as an allowed redirect while transitioning.
7. Test sign-in, task completion, refresh, and cross-device syncing using the same Supabase account. Back up your schedule first.

The hosting path is supported by relative URLs in the HTML, manifest, and service worker. A PWA on GitHub Pages needs HTTPS (provided by Pages).

## Existing account and username

- `config.js` contains only the **browser-safe Supabase publishable key**. Never add a database password, service-role key, secret key or user password.
- `username-config.js` is an **optional username alias** for your existing Supabase email/password account. This JavaScript file is publicly accessible on a GitHub Pages site and can expose your login email if you fill it in. **For privacy, leave username/email blank and sign in with email + password instead.** Username alias is not a true username authentication system.
- Password sign-in works only if you have actually set a password for your current Supabase account. The earlier “Auth session missing” issue requires verification if it persists.
- The header's Signed in and Cloud synced indicators are different checks. Refresh and verify changes on a second device to confirm actual cloud persistence.

## Import the latest schedule safely

Download `NTU_Master_Schedule_2026_Import.json` separately from ChatGPT. It is deliberately **not in this website repository** because your schedule is personal. In the website choose Import Schedule after confirming cloud sign-in. **Export a backup first and check for duplicates**: importing on top of earlier seed data may add overlapping tasks. The provided schedule has 27–28 October itemized tasks marked completed and later tasks unconfirmed; final-revision ranges are summaries, not invented daily entries.

## Status and limitations

- Client-side Supabase login and syncing are present; live GitHub Pages deployment has not been tested yet.
- Avoid editing while offline; robust conflict resolution is not fully tested.
- Direct ChatGPT database updates require a separately deployed secure API and supported integration. They are NOT enabled by GitHub Pages alone.
