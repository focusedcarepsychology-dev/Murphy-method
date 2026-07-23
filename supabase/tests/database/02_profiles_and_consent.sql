-- docs/DATABASE_SCHEMA.md §19: Profiles — profiles, consent_records.
select plan(10);

-- Owner ---------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select is(
    (select count(*)::int from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own profile'
  );

  with updated as (
    update public.profiles set display_name = 'A' where id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from updated), 1, 'User A can update own profile');

  select lives_ok(
    $$ insert into public.consent_records (profile_id, consent_type, granted, version)
       values ('a0000000-0000-4000-8000-000000000001', 'data_processing', true, 'v1') $$,
    'User A can insert own consent_records row'
  );

  select is(
    (select count(*)::int from public.consent_records where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own consent_records'
  );

  select throws_ok(
    $$ update public.consent_records set granted = false
       where profile_id = 'a0000000-0000-4000-8000-000000000001' $$,
    '42501',
    null,
    'User A cannot update consent_records (immutable, no update grant)'
  );
commit;

-- Other authenticated user ---------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s profile'
  );

  with updated as (
    update public.profiles set display_name = 'hacked' where id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from updated), 0, 'User B''s UPDATE targeting User A''s profile affects 0 rows');

  select is(
    (select count(*)::int from public.consent_records where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s consent_records'
  );
commit;

-- Unauthenticated --------------------------------------------------------
begin;
  set local role anon;

  select throws_ok(
    $$ select 1 from public.profiles limit 1 $$,
    '42501',
    null,
    'anon cannot select profiles'
  );
  select throws_ok(
    $$ select 1 from public.consent_records limit 1 $$,
    '42501',
    null,
    'anon cannot select consent_records'
  );
commit;

select * from finish();
