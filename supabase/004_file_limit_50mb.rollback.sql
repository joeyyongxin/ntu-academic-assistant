-- PREPARED ONLY. Never deletes larger files to force rollback.
begin;
do $$begin
 if exists(select 1 from public.aa_file_assets where bytes>10485760) then raise exception 'Larger file records exist. Retain the 50 MB limit; do not delete user files for rollback.';end if;
 if exists(select 1 from pg_constraint where conrelid='public.aa_file_assets'::regclass and conname='aa_file_assets_bytes_50mb_check') then
  alter table public.aa_file_assets drop constraint aa_file_assets_bytes_50mb_check;
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.aa_file_assets'::regclass and conname='aa_file_assets_bytes_check') then
  alter table public.aa_file_assets add constraint aa_file_assets_bytes_check check(bytes between 1 and 10485760);
 end if;
end$$;
update storage.buckets set file_size_limit=10485760 where id='academic-private-files' and public=false;
commit;
-- Reset website PLANNER_CONFIG.maxFileMB to 10 after a permitted rollback.
