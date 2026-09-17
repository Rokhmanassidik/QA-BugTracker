-- QA Bug Tracker: allow assigning a bug to an entire team (PM, DEV, or QA)
-- instead of only one person. When a bug is assigned to a team, every
-- member of that team is notified (see the app's notification logic).
-- Run this in the Supabase SQL editor after 0007_test_case_id.sql.

alter table bugs add column if not exists assignee_team user_role;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bugs_assignee_single_target'
  ) then
    alter table bugs add constraint bugs_assignee_single_target
      check (assignee_id is null or assignee_team is null);
  end if;
end $$;
