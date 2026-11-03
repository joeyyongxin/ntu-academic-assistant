# NTULearn browser connector and optional import

The preferred connection is now the [browser connector](extension/ntulearn-connect/README.md), with course selection, opt-in local scheduled refresh and account/semester approval. Its Settings integration is in a draft release. The manual exporter below remains an optional fallback.

# NTULearn announcement import

This optional local exporter reads selected courses' announcements. It does not submit work, read grades, download course files or change NTULearn. It is not an official NTU integration. Access depends on what NTU enables for your student session.

## Set up on your Windows computer

1. Download [export_ntulearn_announcements.py](tools/export_ntulearn_announcements.py) from this repository. Open the file on GitHub, select **Raw**, and save it as `export_ntulearn_announcements.py` in Downloads. Review the source before running it. It uses Python's standard library; there are no packages to install.
2. Open PowerShell in Downloads. Run `python .\export_ntulearn_announcements.py`. Python 3.9 or newer is required. If Windows cannot find Python, install Python from its official website and reopen PowerShell.
3. Sign in to NTULearn yourself in your browser. Press **F12**, choose **Application → Storage → Cookies → https://ntulearn.ntu.edu.sg**, and find `BbRouter`. Copy its **Value** only.
4. Paste the value into the exporter's hidden prompt on your own computer and press Enter. The value will not be visible. Do not put it into a command, source file, chat message or the Academic Assistant website. The exporter keeps it in memory for this run; it does not save credentials or extract browser cookies automatically.
5. The exporter lists accessible courses. Enter only the course numbers you want, separated by commas, for example `1,3`. A blank selection cancels. An API error stops the export rather than claiming an empty course was imported. Unavailable course-detail requests are reported and skipped.
6. The exporter writes a new timestamped `NTULearn_Announcements_*.json` file to Downloads. Keep it private. If the session expires or NTU denies API access, stop and use the existing manual Hub forms; do not disable authentication protections.

## Review in Academic Assistant

1. In Settings, choose the academic year and semester you want to import into.
2. Under **Import NTULearn announcements**, select the exported JSON file.
3. Review each announcement's text, date and suggested module. Only announcements created within the selected semester are offered. Select the items you want and assign an enrolled module to each.
4. Select **Save selected announcements to Hub**. Existing imports with the same course and announcement IDs are skipped, including changed source versions; current Hub entries are kept.
5. Open **NTULearn Hub** to review the saved announcements. **Propose study task** lets you choose a task title, date and duration, then sends it to Inbox for approval. Dates in announcement prose are not automatically treated as deadlines.

There is no automatic background sync. Raw announcement text is displayed as text. Long announcements are shortened to the Hub's existing text limit, with a notice to consult the original.

## Reference

Endpoint selection and the local-session approach were informed by [Zhu-Qianyu/NTUlearn-agent](https://github.com/Zhu-Qianyu/NTUlearn-agent), reviewed at commit `7f902c769a99b65e2889fd63e4e4a05a5e5107e5`. This exporter was independently implemented; no source code from that repository was copied. Session-authenticated access has not yet been verified against your account.
