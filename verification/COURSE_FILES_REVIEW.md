# Course files and NTULearn refinement

- My Files: expandable module groups; filename searches reveal matching groups; existing preview/details/download/delete controls retained.
- Coming up: title and date on distinct lines, stable countdown alignment.
- Agenda: weekday groups and start-time order without changing stored class order.
- Class import: joins multi-line module/day/time/type OCR text and normalises spaced times. A preview and validation remain mandatory; arbitrary grid screenshots and incorrect OCR are not guaranteed to parse accurately.
- Hub: compact stats, Sync now, connection status/settings and existing opt-in PDF copying exposed in the Hub.
- Fixed automatic imports incorrectly pausing for CLOSED modal shells.
- Connector 0.9: paired APP_SYNC command refreshes selected courses; existing permissions and file security checks retained.
- Cache advanced from v35 to v36; index.html and workspace.html remain identical.

## Verification
163 JavaScript tests and 4 Python tests pass. Browser checks used isolated synthetic records: module expand, sample PDF download event, multi-line class preview/save, ordered Agenda, mobile More navigation, mobile width, light/dark files, Home layout, Hub sync unavailable feedback/button recovery. Browser console had no errors.

Not verified with the user's live NTULearn account: refreshed source membership and PDF copies for the material in the screenshot. It reports missing from latest snapshot, not a stored My Files PDF. Update connector, sync selected courses, enable mapped automatic updates/PDF copies with consent, then retry that material. Automatic refresh requires a running browser/valid NTULearn session; planner saving requires the planner open. No server-side always-on sync was added.

No Supabase schema, credentials or live records changed. Not automatically published.
