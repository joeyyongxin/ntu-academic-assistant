Academic Assistant production interface release

The approved v2.9 interface becomes the website home page. Existing accounts, tasks and assessments use the existing production database. The previous interface remains at legacy.html.

Adds saved year/semester settings, module enrolments, timetable, manual NTULearn hub, Inbox proposals and private file upload/preview/download. Mobile More keeps the additional pages accessible; year/semester controls stay in Settings. Cross-device change notices preserve unsaved drafts.

Verification: 24 isolated application checks and isolated SQL ownership/conflict checks passed before release. Six file checks passed again after the PDF MIME fix, including byte preservation and multipart MIME. The user confirmed production sign-in, settings persistence and file operations. Actual ChatGPT connection, direct NTULearn and AI access remain unverified or unconnected.

Publishing requires merging the reviewed app-production branch into main. GitHub Pages serves main at https://joeyyongxin.github.io/ntu-academic-assistant/ . Email confirmation/password recovery require the deployed URL in Supabase Authentication URL Configuration.
