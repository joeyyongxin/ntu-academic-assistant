-- Production extension for the existing Academic Assistant database.
-- Adds new owner-only records. Existing tasks/assessments tables are untouched.
begin;
create table if not exists public.aa_workspace_preferences (
 user_id uuid primary key references auth.users(id),
 revision bigint not null default 0 check(revision>=0),
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.aa_workspace_preferences enable row level security;
revoke all on public.aa_workspace_preferences from public,anon,authenticated;
create or replace function public.aa_workspace_validate(p jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare y jsonb;t jsonb;x jsonb;v jsonb;k text;year_start integer;total integer:=0;number_tasks integer;unique_tasks integer;
begin
 if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>5000000 then raise exception 'Invalid workspace or workspace exceeds 5 MB';end if;
 if jsonb_typeof(p->'years') is distinct from 'array' or jsonb_typeof(p->'terms') is distinct from 'array' then raise exception 'Academic years and semesters are required';end if;
 if jsonb_array_length(p->'years') not between 1 and 100 or jsonb_array_length(p->'terms') not between 1 and 300 then raise exception 'Workspace limits exceeded';end if;
 if (select count(distinct a->>'id') from jsonb_array_elements(p->'years') a)<>jsonb_array_length(p->'years') or (select count(distinct a->>'start') from jsonb_array_elements(p->'years') a)<>jsonb_array_length(p->'years') then raise exception 'Duplicate academic years';end if;
 for y in select * from jsonb_array_elements(p->'years') loop
  if coalesce(y->>'id','')!~'^y[0-9]+$' or jsonb_typeof(y->'start') is distinct from 'number' or coalesce(y->>'start','')!~'^[0-9]{4}$' or (y->>'start')::int not between 2000 and 2098 or jsonb_typeof(y->'label') is distinct from 'string' or length(y->>'label')>80 then raise exception 'Invalid academic year';end if;
 end loop;
 if (select count(distinct a->>'id') from jsonb_array_elements(p->'terms') a)<>jsonb_array_length(p->'terms') then raise exception 'Duplicate semester IDs';end if;
 for t in select * from jsonb_array_elements(p->'terms') loop
  select (a->>'start')::int into year_start from jsonb_array_elements(p->'years') a where a->>'id'=t->>'yearId';
  if year_start is null or coalesce(t->>'id','')!~'^s[0-9]+$' or jsonb_typeof(t->'label') is distinct from 'string' or length(trim(t->>'label')) not between 1 and 40 or jsonb_typeof(t->'name') is distinct from 'string' or length(t->>'name')>140 then raise exception 'Invalid semester';end if;
  if coalesce(t->>'start','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(t->>'end','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(t->>'date','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid dates';end if;
  if (t->>'start')::date<make_date(year_start,8,1) or (t->>'end')::date>make_date(year_start+1,7,31) or (t->>'end')::date<(t->>'start')::date then raise exception 'Semester dates outside academic year';end if;
  perform (t->>'date')::date;
  if jsonb_typeof(t->'weeks') is distinct from 'number' or coalesce(t->>'weeks','')!~'^[0-9]+$' or (t->>'weeks')::int not between 1 and 52 then raise exception 'Invalid teaching weeks';end if;
  if jsonb_typeof(t->'mods') is distinct from 'array' then raise exception 'Missing module enrolments';end if;
  if (select count(distinct a#>>'{}') from jsonb_array_elements(t->'mods') a)<>jsonb_array_length(t->'mods') then raise exception 'Duplicate module enrolments';end if;
  for x in select * from jsonb_array_elements(t->'mods') loop
   if jsonb_typeof(x) is distinct from 'string' or (x#>>'{}')!~'^[A-Z0-9_-]{2,16}$' then raise exception 'Invalid module code';end if;
  end loop;
  foreach k in array array['tasks','classes','inbox','files','assessments','timetable','hub'] loop
   if jsonb_typeof(t->k) is distinct from 'array' then raise exception 'Missing collection: %',k;end if;
   if jsonb_array_length(t->k)>10000 then raise exception 'Collection too large';end if;
   total:=total+jsonb_array_length(t->k);
  end loop;
  for x in select * from jsonb_array_elements(t->'tasks') loop
   if jsonb_typeof(x->'id') is distinct from 'number' or coalesce(x->>'id','')!~'^[0-9]+$' or (x->>'id')::numeric not between 1 and 9007199254740991 or not coalesce((t->'mods') ? (x->>'mod'),false) or jsonb_typeof(x->'title') is distinct from 'string' or length(trim(x->>'title')) not between 1 and 500 or jsonb_typeof(x->'min') is distinct from 'number' or coalesce(x->>'min','')!~'^[0-9]+$' or (x->>'min')::int not between 0 and 1440 or jsonb_typeof(x->'done') is distinct from 'boolean' then raise exception 'Invalid task or semester assignment';end if;
   perform (x->>'date')::date;if x->>'date' is null then raise exception 'Task date required';end if;
  end loop;
  for x in select * from jsonb_array_elements(t->'assessments') loop
   if not coalesce((t->'mods') ? (x->>'mod'),false) or jsonb_typeof(x->'name') is distinct from 'string' or length(x->>'name')>500 or jsonb_typeof(x->'time') is distinct from 'string' or jsonb_typeof(x->'type') is distinct from 'string' then raise exception 'Invalid assessment';end if;
   perform (x->>'date')::date;if x->>'date' is null then raise exception 'Assessment date required';end if;
  end loop;
  for x in select * from jsonb_array_elements(t->'files') loop
   if jsonb_typeof(x) is distinct from 'array' or jsonb_array_length(x)<5 or not coalesce((t->'mods') ? (x->>1),false) or exists(select 1 from jsonb_array_elements(x) a where jsonb_typeof(a) is distinct from 'string') then raise exception 'Invalid file reference';end if;
  end loop;
  for x in select * from jsonb_array_elements(t->'classes') loop
   if jsonb_typeof(x) is distinct from 'array' or jsonb_array_length(x)<4 or not coalesce((t->'mods') ? (x->>1),false) then raise exception 'Invalid planner class';end if;perform (x->>0)::date;
  end loop;
  for x in select * from jsonb_array_elements(t->'timetable') loop
   if not coalesce((t->'mods') ? (x->>'mod'),false) or coalesce(x->>'d','') not in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun') or jsonb_typeof(x->'kind') is distinct from 'string' or jsonb_typeof(x->'range') is distinct from 'string' or jsonb_typeof(x->'venue') is distinct from 'string' then raise exception 'Invalid timetable class';end if;
  end loop;
  if jsonb_typeof(t->'topics') is distinct from 'object' then raise exception 'Invalid topics';end if;
  for k,v in select * from jsonb_each(t->'topics') loop
   if not ((t->'mods') ? k) or jsonb_typeof(v) is distinct from 'array' then raise exception 'Invalid topic module';end if;
   for x in select * from jsonb_array_elements(v) loop
    if jsonb_typeof(x) is distinct from 'array' or jsonb_typeof(x->0) is distinct from 'string' or jsonb_typeof(x->1) is distinct from 'number' or coalesce(x->>1,'') not in ('0','1','2','3') or jsonb_typeof(x->2) is distinct from 'number' or coalesce(x->>2,'')!~'^[0-9]+([.][0-9]+)?$' then raise exception 'Invalid topic progress';end if;
   end loop;
  end loop;
  for x in select * from jsonb_array_elements(t->'inbox') loop
   if jsonb_typeof(x->'id') is distinct from 'number' or coalesce(x->>'id','')!~'^[0-9]+$' or coalesce(x->>'s','') not in ('p','a','r') or (x ? 'mod' and not coalesce((t->'mods') ? (x->>'mod'),false)) then raise exception 'Invalid Inbox item';end if;
  end loop;
  for x in select * from jsonb_array_elements(t->'hub') loop
   if jsonb_typeof(x->'id') is distinct from 'number' or coalesce(x->>'id','')!~'^[0-9]+$' or not coalesce((t->'mods') ? (x->>'mod'),false) or coalesce(x->>'type','') not in ('ann','file','deadline') or jsonb_typeof(x->'title') is distinct from 'string' or jsonb_typeof(x->'desc') is distinct from 'string' or jsonb_typeof(x->'unread') is distinct from 'boolean' then raise exception 'Invalid course feed record';end if;
  end loop;
 end loop;
 select count(*),count(distinct a#>>'{}') into number_tasks,unique_tasks from jsonb_array_elements(jsonb_path_query_array(p,'$.terms[*].tasks[*].id')) a;
 if number_tasks<>unique_tasks or total>50000 then raise exception 'Duplicate task IDs or workspace too large';end if;
 if not exists(select 1 from jsonb_array_elements(p->'terms') a where a->>'id'=p->>'active') or not exists(select 1 from jsonb_array_elements(p->'terms') a where a->>'id'=p->>'current') or coalesce(p->>'studyYear','') not in ('Year 1','Year 2','Year 3','Year 4','Year 5+','Postgraduate','Other') or jsonb_typeof(p->'n') is distinct from 'number' or coalesce(p->>'n','')!~'^[0-9]+$' then raise exception 'Invalid workspace preferences';end if;
end $$;
revoke all on function public.aa_workspace_validate(jsonb) from public,anon,authenticated;


create or replace function public.aa_workspace_load(p_expected_user_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();w public.aa_workspace_preferences;
begin
 if owner is null or owner is distinct from p_expected_user_id then raise exception 'Account mismatch' using errcode='28000';end if;
 select * into w from public.aa_workspace_preferences where user_id=owner;
 return jsonb_build_object('revision',coalesce(w.revision,0),'payload',w.payload);
end $$;
create or replace function public.aa_workspace_save(p_expected_user_id uuid,p_expected_revision bigint,p_payload jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();v bigint;
begin
 if owner is null or owner is distinct from p_expected_user_id then raise exception 'Account mismatch' using errcode='28000';end if;
 if pg_column_size(p_payload)>10000000 then raise exception 'Workspace too large';end if;
 perform public.aa_workspace_validate(p_payload);
 insert into public.aa_workspace_preferences(user_id,revision,payload) values(owner,0,p_payload) on conflict(user_id) do nothing;
 select revision into v from public.aa_workspace_preferences where user_id=owner for update;
 if v is distinct from p_expected_revision then raise exception 'Workspace settings changed on another device; reload before saving' using errcode='40001';end if;
 update public.aa_workspace_preferences set revision=v+1,payload=p_payload,updated_at=now() where user_id=owner;
 return v+1;
end $$;
revoke all on function public.aa_workspace_load(uuid),public.aa_workspace_save(uuid,bigint,jsonb) from public,anon;
grant execute on function public.aa_workspace_load(uuid),public.aa_workspace_save(uuid,bigint,jsonb) to authenticated;
create or replace function public.aa_workspace_revision(p_expected_user_id uuid) returns bigint
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() is distinct from p_expected_user_id then raise exception 'Account mismatch' using errcode='28000';end if;
 return coalesce((select revision from public.aa_workspace_preferences where user_id=auth.uid()),0);
end $$;
revoke all on function public.aa_workspace_revision(uuid) from public,anon;
grant execute on function public.aa_workspace_revision(uuid) to authenticated;
commit;
