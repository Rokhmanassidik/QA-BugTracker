-- QA Bug Tracker: optional Test Case ID field on bugs, so reports can be
-- traced back to the test case that found them.
-- Run this in the Supabase SQL editor after 0006_assignee_notifications.sql.

alter table bugs add column if not exists test_case_id text;
