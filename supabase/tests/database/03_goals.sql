-- docs/DATABASE_SCHEMA.md §19: Goals — user_goals, body_area_goals.
select plan(11);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select lives_ok(
    $$ insert into public.user_goals (profile_id, goal_id, priority)
       select 'a0000000-0000-4000-8000-000000000001', id, 1 from public.goals where key = 'build_muscle' $$,
    'User A can insert own user_goals row'
  );

  select is(
    (select count(*)::int from public.user_goals where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own user_goals'
  );

  with updated as (
    update public.user_goals set priority = 2
      where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from updated), 1, 'User A can update own user_goals');

  select lives_ok(
    $$ insert into public.body_area_goals (profile_id, body_area_key)
       values ('a0000000-0000-4000-8000-000000000001', 'shoulders') $$,
    'User A can insert own body_area_goals row'
  );

  select is(
    (select count(*)::int from public.body_area_goals where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own body_area_goals'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int from public.user_goals where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s user_goals'
  );

  with updated as (
    update public.user_goals set priority = 3
      where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from updated), 0, 'User B''s UPDATE targeting User A''s user_goals affects 0 rows');

  with deleted as (
    delete from public.user_goals where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from deleted), 0, 'User B''s DELETE targeting User A''s user_goals affects 0 rows');

  select is(
    (select count(*)::int from public.body_area_goals where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s body_area_goals'
  );
commit;

begin;
  set local role anon;

  select throws_ok(
    $$ select 1 from public.user_goals limit 1 $$,
    '42501',
    null,
    'anon cannot select user_goals'
  );
  select throws_ok(
    $$ select 1 from public.body_area_goals limit 1 $$,
    '42501',
    null,
    'anon cannot select body_area_goals'
  );
commit;

select * from finish();
