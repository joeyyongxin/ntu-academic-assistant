-- Production private files. Run after 001_workspace_preferences.sql.
-- Does not alter existing tasks or assessments.
begin;
create or replace function public.aa_workspace_enrolment(p_semester text,p_module text default null) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.aa_workspace_preferences w,
  lateral jsonb_array_elements(w.payload->'terms') t
  where w.user_id=auth.uid() and t->>'id'=p_semester
   and (p_module is null or (t->'mods') ? p_module)
 );
$$;
revoke all on function public.aa_workspace_enrolment(text,text) from public,anon;
grant execute on function public.aa_workspace_enrolment(text,text) to authenticated;

create table if not exists public.aa_file_assets (
 id uuid primary key,
 user_id uuid not null references auth.users(id),
 semester_id text not null check (semester_id ~ '^s[0-9]+$'),
 module text not null check (module ~ '^[A-Z0-9_-]{2,16}$'),
 name text not null check (length(name) between 1 and 240),
 bytes bigint not null check (bytes between 1 and 10485760),
 mime text not null check (length(mime) <= 200),
 path text not null unique,
 created_at timestamptz not null default now(),
 check (path = user_id::text || '/' || semester_id || '/' || id::text || '.' || split_part(path,'.',2)),
 check (path ~ '^[0-9a-f-]+/s[0-9]+/[0-9a-f-]+\.(pdf|txt|md|csv|png|jpg|jpeg|webp|docx|pptx|xlsx|zip)$')
);
create index if not exists aa_file_assets_owner_term on public.aa_file_assets(user_id,semester_id,created_at desc);
alter table public.aa_file_assets enable row level security;
revoke all on public.aa_file_assets from public,anon,authenticated;
grant select,insert,delete on public.aa_file_assets to authenticated;
drop policy if exists aa_files_read on public.aa_file_assets;
create policy aa_files_read on public.aa_file_assets for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists aa_files_add on public.aa_file_assets;
create policy aa_files_add on public.aa_file_assets for insert to authenticated with check (
 user_id=(select auth.uid()) and public.aa_workspace_enrolment(semester_id,module)
);
drop policy if exists aa_files_delete on public.aa_file_assets;
create policy aa_files_delete on public.aa_file_assets for delete to authenticated using (user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('academic-private-files','academic-private-files',false,10485760,array['application/octet-stream'])
 on conflict (id) do nothing;
-- Fail rather than silently use an existing public or incompatible bucket.
do $$begin
 if not exists (select 1 from storage.buckets where id='academic-private-files' and public=false and file_size_limit=10485760 and allowed_mime_types=array['application/octet-stream']) then
  raise exception 'Existing academic-private-files bucket has incompatible settings';
 end if;
end$$;
drop policy if exists aa_private_file_read on storage.objects;
create policy aa_private_file_read on storage.objects for select to authenticated
 using (bucket_id='academic-private-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists aa_private_file_add on storage.objects;
create policy aa_private_file_add on storage.objects for insert to authenticated
 with check (bucket_id='academic-private-files' and (storage.foldername(name))[1]=(select auth.uid())::text and public.aa_workspace_enrolment((storage.foldername(name))[2],null) and name ~ '^[0-9a-f-]+/s[0-9]+/[0-9a-f-]+\.(pdf|txt|md|csv|png|jpg|jpeg|webp|docx|pptx|xlsx|zip)$');
drop policy if exists aa_private_file_delete on storage.objects;
create policy aa_private_file_delete on storage.objects for delete to authenticated
 using (bucket_id='academic-private-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
