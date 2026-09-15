-- QA Bug Tracker: notifications now target the bug's assignee specifically
-- (assigned, status change, new comment), so allow the new 'assigned' type.
-- Run this in the Supabase SQL editor after 0005_username_login.sql.

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('assigned', 'status_change', 'new_comment'));
