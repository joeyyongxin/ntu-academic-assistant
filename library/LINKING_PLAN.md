# Step 3 linking plan (non-destructive)

No database migration or Storage move is required. Existing Hub material rows and aa_file_assets records remain in place. A semester preference map `libraryLinks[assetId] = {materialId, sourceKey}` links them for display. A `related` list preserves additional source associations when existing content deduplication shares one stored PDF between materials. The material is the canonical visible entry; linked files are its attachments. Unlinked uploads remain ordinary Library entries.

For new PDF copies, the existing transfer already knows the source material, file hash and saved Storage ID. Store that relationship after successful upload or deduplication. For older copies, infer links only from an exact deterministic NTU filename source hash (same module, one candidate). A title or filename resemblance is not enough. Ambiguous files remain separate, with a manual Attach existing file action.

All inference runs locally. Candidate links are shown for review before saving; there is no automatic live-data rewrite. Linking only saves preference metadata through the existing workspace sync. Detach reverses it. Deleting a canonical material hides its linked attachments using existing recoverable Trash metadata; Undo restores those flags without removing bytes. Deleting an individual attachment keeps the material and other attachments.

Backup exports preserve the preference map. New backups include source asset IDs so restored files can remap links to their new Storage IDs. Existing backups still restore without links. Linking never deletes a Hub entry, an asset row or file bytes.
