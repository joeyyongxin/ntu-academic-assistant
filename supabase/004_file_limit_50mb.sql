-- PREPARED ONLY. Apply separately after explicit approval and a backup.
-- Narrow validation/bucket size upgrade; no RLS, data deletion or auth changes.
begin;
do $$
begin
 if not exists(select 1 from storage.buckets where id='academic-private-files' and public=false and file_size_limit in (10485760,52428800) and allowed_mime_types=array['application/octet-stream']) then
  raise exception 'Unexpected private bucket configuration; inspect before upgrading';
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.aa_file_assets'::regclass and conname='aa_file_assets_bytes_50mb_check') then
  if not exists(select 1 from pg_constraint where conrelid='public.aa_file_assets'::regclass and conname='aa_file_assets_bytes_check' and contype='c' and pg_get_constraintdef(oid) like '%10485760%') then
   raise exception 'Expected 10 MB bytes constraint not found; inspect before upgrading';
  end if;
  alter table public.aa_file_assets drop constraint aa_file_assets_bytes_check;
  alter table public.aa_file_assets add constraint aa_file_assets_bytes_50mb_check check(bytes between 1 and 52428800);
 end if;
end$$;
update storage.buckets set file_size_limit=52428800 where id='academic-private-files' and public=false;
commit;
-- After verifying Storage + metadata with a temporary real file, set the website
-- PLANNER_CONFIG.maxFileMB to 50 in a separate approved configuration release.
