# Connector 0.9 — Sync now from the NTULearn Hub

1. Replace the files in your existing installed connector folder with this version. Keep the folder location unchanged.
2. Open chrome://extensions, find Academic Assistant, click Reload, and check version 0.9.0.
3. Refresh the planner after the website update is published.
4. In NTULearn, click Sync now. It refreshes only your selected courses and requires the existing account/semester pairing.
5. In Connection settings, retain or set up course-to-module mappings and automatic updates. Enable scheduled refresh in the connector for 30-minute checks.
6. Tick Automatically save available PDFs to My Files and approve PDF copies in the connector if not already approved. Keep the planner open and NTULearn signed in.
7. Expand a module in My Files and download a saved PDF to verify it.

No new host permissions. The new APP_SYNC command is limited to the approved page, account and semester. An absent material must reappear in a refreshed selected-course snapshot before its attachments can be fetched. Missing, inaccessible, non-PDF and blocked-redirect sources are still reported as errors; this update does not bypass NTULearn access restrictions.

---

# Connector 0.8 — PDFs inside Ultra child blocks

Replace all files in the SAME installed connector folder, Reload at chrome://extensions, confirm version 0.8.0, then refresh the planner. Pairing and permissions are unchanged.

The PDF checker now follows authenticated child content blocks of the selected material, where Blackboard Ultra can store the actual attachment link. It checks up to 25 blocks and four child levels, skips unavailable items, and refuses incomplete checks instead of reporting a misleading empty result. It does not scan other courses or unrelated course items. Each byte request rechecks the selected material subtree, account identity, approved NTULearn destination, PDF signature and size.

Regression checks cover a parent with an empty attachment list and a child containing an extensionless PDF link, actual synthetic PDF byte retrieval, restricted children, cycles and depth limits. This is a documented structure the previous checker missed; the user's Quiz 1 Answer Key remains unverified until retried. A material may genuinely contain no PDF. No cloud data, database configuration or website deployment is changed by this connector-only update.

Reference: https://docs.blackboard.com/docs/blackboard/rest-apis/demo-code/curl-attach-demo

---

# Connector 0.7 — Ultra attachment discovery fix

Replace ALL files in the SAME installed connector folder, Reload at chrome://extensions, verify Version 0.7.0, and refresh the planner. No new permissions are added; existing pairing and PDF-copy approval are preserved when the folder path stays the same.

This patch reads authenticated Ultra content metadata before choosing a download route. It recognizes PDF attachment names/MIME metadata even when the WebDAV URL has no .pdf extension. Ultra documents with these links no longer require the Original-course attachment-list endpoint that can reject the request with HTTP 400. Original attachment-list discovery is retained where supported, and access denials remain errors. Every byte request is still checked against freshly retrieved content metadata, fixed NTULearn HTTPS destinations, PDF signature/size checks and source account checks. No credentials or signed source URLs are logged.

Retry ONE previously failing PDF from Materials using Save selected to My Files. If successful, open My Files and download it once to verify a completed private copy. Real account verification is pending; automated tests use synthetic Ultra metadata and PDFs. No website deployment is required just to use this connector patch with the currently published copy workflow.

Official behavior reference: https://docs.blackboard.com/docs/blackboard/rest-apis/demo-code/curl-attach-demo

# Connector 0.6 — simpler saving and direct PDF fallback

Update ALL files in the SAME installed extension folder, Reload at chrome://extensions, verify Version 0.6.0 and refresh the planner. No new permissions are added; existing account/semester pairing and PDF-copy approval remain required.

The website now uses one Settings checkbox under Save PDFs to My Files for future mapped course imports. Existing materials use selection checkboxes, Select all results (all matching materials, not only the visible page), and one Save selected to My Files action. Successful materials are deselected; failures remain selected and appear together in Needs attention. Retry failed repeats only those materials; deduplication skips already-copied PDFs. Stop copying stops after the in-flight transfer. Originals are kept, not moved/deleted. A download icon opens available attachments. Downloaded-file upload is shown only for failures needing that fallback.

For blocked attachment API downloads, the connector reads the current material metadata and looks for a direct PDF link under https://ntulearn.ntu.edu.sg/bbcswebdav/. Only an unambiguous matching filename (or one PDF link for one PDF attachment) is eligible. It retries that verified same-host URL while continuing to refuse redirects and external destinations. Header, size and account checks still apply. This follows Blackboard’s documented content links: https://docs.blackboard.com/docs/blackboard/rest-apis/demo-code/curl-attach-demo . It cannot guarantee access where no eligible direct link is exposed or the direct route is itself blocked.

Tests use synthetic PDF responses; the user’s original failing PDF still needs a real check after updating. No new Supabase configuration is needed. All prior byte limits and consent rules remain.

# Copy existing materials to My Files

The planner now adds Copy to My Files and Upload downloaded PDF to material entries. Connector 0.5 remains compatible; no new extension update is needed.

For synced materials: Copy to My Files checks the paired connector and lists available PDFs. Select the files, then Copy selected PDFs to My Files. This copies real bytes into your private Library under the material module and currently viewed semester; it does not remove the source entry.

For older link-only entries or unsupported attachments: Open source, download the PDF normally, then Upload downloaded PDF on that material. This path uses the existing private Library upload adapter and does not depend on connector access. Up to 10 MB per PDF. Existing matching content is skipped; original material and files are preserved.

The automatic-copy status now distinguishes materials checked, duplicate copies and materials returning no PDF attachments, instead of only reporting zero copied. Copies remain opt-in. Existing automatic-import limitations, including refused PDF redirects, still apply.

# Connector 0.5 — optional automatic PDF copies

Update ALL extension files in the SAME installed folder, Reload at chrome://extensions, verify Version 0.5.0, and refresh the planner. There are no new browser host permissions.

After the matching website update is published:
1. Settings → NTULearn connection → Connect NTULearn. In the extension approval tab, check the planner account/semester and tick the new permission for PDF copies to private Supabase Library. Approve the connection.
2. Set up course-to-module mappings under Courses and automatic updates.
3. Open PDF copies to My Files and select Approve and enable PDF copies. This opt-in transfers actual NTULearn PDF contents to your existing private Supabase storage. Files are assigned to this semester and its mapped modules.
4. Keep the planner open and NTULearn signed in. The importer checks up to three materials and transfers at most three PDFs each pass. Remaining work continues on later one-minute passes. Status is shown in the same Settings section; My Files can refresh after an import.
5. Turn off PDF copies at any time. A transfer already started may finish in its original semester; existing files remain.

Up to 10 MB per PDF. Strict PDF header checks reject HTML/login responses. Names contain a stable source marker and SHA-256 content hash so retries/reloads find existing copies without overwriting files. Different content receives a separate version. Renaming is not currently a Library feature; manually deleting an imported file can cause it to be imported again on a later source refresh while automatic copies remain enabled. Change course mappings, then enable PDF copies again to adopt those new mappings.

Fetches use the fixed authenticated attachment API and refuse redirects. An unsupported/redirecting download is reported and can be downloaded manually via Download PDFs. Real NTULearn bytes still need verification; automated tests use synthetic PDFs. No file content is sent to an AI provider. The new answer panel uses saved Hub deadlines and announcement snippets only, without PDF text extraction or an AI service.

# Connector 0.4 — download compatibility feedback

Replace the extension files in the SAME installed folder, click Reload on its card at chrome://extensions, and verify Version 0.4.0. Then refresh the planner with Ctrl+Shift+R. Keeping the folder path preserves the extension ID and local pairing. No new permissions are added.

The planner now checks PDF capability before requesting a download window and displays progress/errors directly under the selected material. Older connectors that ignore the PDF command now produce an explicit update instruction. A completed real NTULearn PDF download still needs account-specific verification.

# PDF downloads in connector 0.3

Update the installed connector to 0.3 for the Hub’s **Download PDFs** button. Extract the new ZIP, copy the files inside `ntulearn-connect` into the same folder used by your installed extension, replacing old files, then open chrome://extensions and click the connector’s Reload button. Keep the folder path the same to preserve its ID, selected courses and pairing. Refresh the planner afterward. No new permissions are requested.

In NTULearn Hub, select a module and Materials, then choose Download PDFs. A local extension window lists PDF attachments returned by the authenticated NTULearn API. Choose a filename. The browser downloads from NTULearn or opens its PDF viewer, where the Download button saves it. No PDF is copied to Supabase. Non-PDF materials, external resources and pages without attachment metadata retain Open source. An empty list or denied API access is shown explicitly.

Real attachment access and a completed PDF download still need user verification; synthetic tests cannot confirm NTULearn’s account-specific file access. The implementation follows the documented [Blackboard attachment route](https://docs.blackboard.com/docs/blackboard/rest-apis/demo-code/curl-attach-demo).

# Academic Assistant NTULearn connector — 0.3.0

An unofficial browser connector for selected courses. Your successful 0.1 access check verified announcements and top-level materials on one course; the next 30 days of assignment-calendar entries returned zero. Nested materials, scheduling and planner pairing still need your real-browser check.

## Update the extension on Windows

1. Download and extract `Academic_Assistant_NTULearn_Connector_0_2.zip` into a folder you will keep.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Remove **Academic Assistant — NTULearn access check** version 0.1. It did not save course content. Keep your actual planner records unchanged.
4. Turn on **Developer mode**, click **Load unpacked**, and select the extracted `ntulearn-connect` folder containing `manifest.json`.
5. Sign in to NTULearn normally in the same browser/profile, including MFA. Never put your password into the extension or planner.
6. Open the extension through the puzzle icon. Click **Connect and list courses**, then approve NTULearn access.
7. Select 1–5 courses. Optionally select **Refresh these courses about every 30 minutes while my browser is running**. Click **Save courses and sync** and keep the extension page open until it finishes.
8. Check **Sync status**. Report the item count and any category errors; do not share passwords, cookie values, course contents or screenshots containing personal information.

## Connect the planner after the website update is published

These Settings controls are part of the draft website update; they will not appear on the live website until that update is reviewed and merged. Do not merge just to run the extension-only source-sync check above.

1. Refresh the published planner after installing the extension. Sign in and choose the intended semester in Settings.
2. In **Connect NTULearn**, click **Connect NTULearn**. A local extension approval tab opens.
3. Verify the displayed planner account and semester. Ensure you have synced selected courses, then click **Approve this account and semester**. A request expires after five minutes; start again from Settings if needed.
4. Return to Settings and click **Check connection**, then **Review latest updates**.
5. Review announcements, assignment deadlines and material listings. Choose the correct enrolled module for each item and select the items to save.
6. Click **Save selected updates to Hub**. These reviewed records use the planner’s existing cloud save. No schema or database configuration changes are required.
7. Return later to **Review latest updates** to review new source snapshots. Scheduled refresh updates the extension’s local snapshot. To save mapped course updates automatically while the planner is open, use Settings → Automatic planner updates → Set up automatic updates. Choose module mappings, tick the explicit approval, and save. This account/semester preference is saved through the existing workspace preferences. Unmapped items and personal edits remain in the review list. Turn off planner updates there at any time. Existing connector 0.2 installations are compatible; no extension update is required.

## What sync reads and saves

- Announcements: title, plain text, source identity and creation date.
- Deadlines: published `GradebookColumn` calendar entries for the next 30 days only. Dates in announcement prose are not inferred. Zero results are not proof there are no deadlines elsewhere.
- Materials: nested content listings and links back to NTULearn. Folders are explored, but attachments, file bytes, videos and external linked services are not downloaded. An undated material uses its first-seen date and is labeled accordingly.
- Source identity is stable across refreshes. Reimporting does not create another copy. Untouched imported rows can receive reviewed source changes; personal edits, legacy imports and tasks are kept. Source disappearance or partial failures never delete planner records.
- Only items dated within the selected semester are offered for import. Choose the appropriate semester and inspect the outside-semester count.

## Privacy and controls

- NTULearn access is optional and requested by a button click. Requests are GET-only, restricted to its HTTPS API, with all redirects refused. The browser attaches its session. No cookie API, password storage, credential extraction, remote code or analytics is used.
- Chrome may describe host permission as the ability to read and change site data; the implemented connector only reads NTULearn APIs. Installation also requests access to the exact Academic Assistant page paths to provide the pairing bridge, plus local storage and scheduled alarms.
- Selected course contents and one planner account/semester approval are stored in this browser extension’s local storage (not Chrome sync storage). No course data is sent elsewhere until the approved planner page requests a snapshot for review. Saving selected items then uses your existing planner cloud account.
- **Disconnect planner** in Settings revokes that pairing and any matching pending request; existing imported records are kept. It does not stop browser refresh.
- **Disconnect and clear local data** in the extension stops refresh, clears its cached content and pairing, and removes NTULearn access. Existing planner records and your NTULearn sign-in are kept.
- Refresh depends on the browser running and a valid NTULearn session. Timers can be delayed by sleep/browser scheduling. An account change clears the snapshot, disables scheduling and requires reconnection.
- Limits: 1–5 courses, first 50 enrollments for selection, 5 MB per response, 20 pages/2,000 rows per API list, 100 folder listings per category, 180 requests/two minutes per sync, and 2,000 items/4 MB per snapshot. Limits and category failures are surfaced; incomplete categories are not imported as successful empty lists.

## Verification and publication

Automated tests use synthetic responses and cover request restrictions, folder traversal, date conversion, partial failure, pairing scope, duplicate imports and protecting personal edits. Browser review uses a synthetic account and mocked extension calls. Real scheduling, installation permission prompts and end-to-end pairing with the published site still need verification. This is a draft release; no automatic merge or deployment is performed.

References: [Chrome network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), [Blackboard calendar API](https://docs.blackboard.com/docs/blackboard/rest-apis/hands-on/calendar-apis), [Blackboard content API](https://docs.blackboard.com/docs/blackboard/rest-apis/hands-on/creating-content-with-rest-apis). [NTUlearn-agent](https://github.com/Zhu-Qianyu/NTUlearn-agent) informed endpoint selection only; no source copied.
