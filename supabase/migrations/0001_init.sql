-- QA Bug Tracker: initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- Enums -----------------------------------------------------------------

create type user_role as enum ('PM', 'QA');
create type bug_priority as enum ('Low', 'Medium', 'High', 'Critical');
create type bug_severity as enum ('Minor', 'Major', 'Critical', 'Blocker');
create type bug_status as enum ('Open', 'In Progress', 'Resolved', 'Closed', 'Reopened');

-- Tables ------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'QA',
  created_at timestamptz not null default now()
);

create table bugs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  priority bug_priority not null default 'Medium',
  severity bug_severity not null default 'Minor',
  steps_to_reproduce text,
  actual_result text,
  expected_result text,
  status bug_status not null default 'Open',
  reporter_id uuid references profiles (id) on delete set null,
  assignee_id uuid references profiles (id) on delete set null,
  ai_generated boolean not null default false,
  original_report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bug_evidence (
  id uuid primary key default gen_random_uuid(),
  bug_id uuid not null references bugs (id) on delete cascade,
  file_path text not null,
  file_type text not null check (file_type in ('image', 'video')),
  file_name text not null,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index bugs_status_idx on bugs (status);
create index bugs_assignee_idx on bugs (assignee_id);
create index bug_evidence_bug_id_idx on bug_evidence (bug_id);

-- Keep bugs.updated_at fresh ------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bugs_set_updated_at
before update on bugs
for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user is created ------------
-- (used by scripts/seed-users.mjs, which sets full_name/role in user_metadata)

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'QA')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Row Level Security ---------------------------------------------------
-- This tracker is a single internal project shared by a small, trusted set
-- of pre-created PM/QA accounts, so every authenticated user has full
-- read/write access (no per-row ownership restrictions).

alter table profiles enable row level security;
alter table bugs enable row level security;
alter table bug_evidence enable row level security;

create policy "profiles: read by authenticated" on profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles: update own row" on profiles
  for update using (auth.uid() = id);

create policy "bugs: read by authenticated" on bugs
  for select using (auth.role() = 'authenticated');
create policy "bugs: insert by authenticated" on bugs
  for insert with check (auth.role() = 'authenticated');
create policy "bugs: update by authenticated" on bugs
  for update using (auth.role() = 'authenticated');
create policy "bugs: delete by authenticated" on bugs
  for delete using (auth.role() = 'authenticated');

create policy "bug_evidence: read by authenticated" on bug_evidence
  for select using (auth.role() = 'authenticated');
create policy "bug_evidence: insert by authenticated" on bug_evidence
  for insert with check (auth.role() = 'authenticated');
create policy "bug_evidence: delete by authenticated" on bug_evidence
  for delete using (auth.role() = 'authenticated');

-- Storage: private bucket for bug evidence (photos/videos) -----------------

insert into storage.buckets (id, name, public)
values ('bug-evidence', 'bug-evidence', false)
on conflict (id) do nothing;

create policy "bug-evidence: read by authenticated"
on storage.objects for select
using (bucket_id = 'bug-evidence' and auth.role() = 'authenticated');

create policy "bug-evidence: insert by authenticated"
on storage.objects for insert
with check (bucket_id = 'bug-evidence' and auth.role() = 'authenticated');

create policy "bug-evidence: delete by authenticated"
on storage.objects for delete
using (bucket_id = 'bug-evidence' and auth.role() = 'authenticated');
