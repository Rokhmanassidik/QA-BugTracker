-- QA Bug Tracker: add a DEV role and switch to standard self-service signup
-- Run this in the Supabase SQL editor after 0003_notifications.sql.

alter type user_role add value if not exists 'DEV';

-- IMPORTANT (manual step, cannot be done via SQL):
-- In the Supabase dashboard, go to Authentication -> Sign In / Providers ->
-- Email, and turn OFF "Confirm email". This app has no email provider
-- configured, so with confirmation left on, self-registered accounts would
-- never receive a confirmation email and could never sign in.
