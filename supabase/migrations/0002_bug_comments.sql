-- QA Bug Tracker: per-bug comment thread (PM/QA discussion)
-- Run this in the Supabase SQL editor after 0001_init.sql.

create table bug_comments (
  id uuid primary key default gen_random_uuid(),
  bug_id uuid not null references bugs (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index bug_comments_bug_id_idx on bug_comments (bug_id);

alter table bug_comments enable row level security;

create policy "bug_comments: read by authenticated" on bug_comments
  for select using (auth.role() = 'authenticated');
create policy "bug_comments: insert by authenticated" on bug_comments
  for insert with check (auth.role() = 'authenticated');
