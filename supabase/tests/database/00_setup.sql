-- Shared fixtures for the whole pgTAP suite (docs/DATABASE_SCHEMA.md §19 RLS
-- Test Matrix). Runs first (00_ prefix) and, deliberately, is NOT wrapped in
-- a rolled-back transaction — User A / User B need to exist for every later
-- file in this directory. `supabase test db` resets the database before the
-- whole suite runs, so these fixtures are fresh for every run.
--
-- Role-simulation idiom used throughout this suite: Supabase's local stack
-- provides the same `auth.uid()` (reads the `request.jwt.claim.sub` setting)
-- as production. Every test file that needs to act as a specific user
-- wraps the relevant assertions in an explicit `begin; ... commit;` block
-- (SET LOCAL is transaction-scoped) with:
--   set local role authenticated;
--   set local request.jwt.claim.sub = '<user id>';
-- and simulates the unauthenticated case with `set local role anon;` and no
-- claim at all.
create extension if not exists pgtap with schema extensions;

select plan(2);

insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'user-a@example.com'),
  ('a0000000-0000-4000-8000-000000000002', 'user-b@example.com')
on conflict (id) do nothing;

select is(
  (select count(*)::int from public.profiles where id in (
    'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'
  )),
  2,
  'handle_new_user created a profiles row for both fixture users'
);

select is(
  (select count(*)::int from public.notification_preferences where profile_id in (
    'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'
  )),
  2,
  'handle_new_profile created a default notification_preferences row for both fixture users'
);

select * from finish();
