-- QA Bug Tracker: switch from email login to username login
-- Run this in the Supabase SQL editor after 0004_dev_role_and_signup.sql.

alter table profiles add column username text unique;

-- Accounts are now created via the Supabase Admin API (server-side, with
-- email_confirm: true) instead of the public sign-up flow, so no email is
-- ever sent and the "Confirm email" setting no longer matters for this app.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'QA'),
    new.raw_user_meta_data ->> 'username'
  );
  return new;
end;
$$;
