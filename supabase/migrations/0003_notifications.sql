-- QA Bug Tracker: real-time notifications for status changes and comments
-- Run this in the Supabase SQL editor after 0002_bug_comments.sql.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  bug_id uuid not null references bugs (id) on delete cascade,
  type text not null check (type in ('status_change', 'new_comment')),
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_id_idx on notifications (recipient_id, created_at desc);

alter table notifications enable row level security;

create policy "notifications: read own" on notifications
  for select using (auth.uid() = recipient_id);
create policy "notifications: insert by authenticated" on notifications
  for insert with check (auth.role() = 'authenticated');
create policy "notifications: update own" on notifications
  for update using (auth.uid() = recipient_id);
create policy "notifications: delete own" on notifications
  for delete using (auth.uid() = recipient_id);

-- Required so Supabase Realtime pushes INSERT events for this table to
-- subscribed clients (the notification bell listens for these).
alter publication supabase_realtime add table notifications;
