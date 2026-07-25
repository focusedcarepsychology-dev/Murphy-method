-- start_workout (supabase/migrations/20260724090400_start_workout_v1.sql).
-- Depends on 15_real_programme_engine.sql's fixture users having a real
-- deterministic-v1 programme already (this suite runs its files in order
-- and each commits, per 13_onboarding_rpc_functions.sql's documented
-- convention).
select plan(9);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000001';

  select ok(
    (
      select (start_workout(p.current_version_id, 0, 'full', gen_random_uuid()) ->> 'created')::boolean
      from public.programmes p
      where p.profile_id = '15000000-0000-4000-8000-000000000001'
    ),
    'start_workout creates a real workout for FULL mode'
  );
commit;

select ok(
  (select count(*)::int from public.workouts where profile_id = '15000000-0000-4000-8000-000000000001') = 1,
  'exactly one real workouts row exists (not a preview id)'
);

select ok(
  (
    select count(we.id)::int
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.profile_id = '15000000-0000-4000-8000-000000000001'
  ) > 0,
  'the workout has real workout_exercises rows'
);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000001';

  select ok(
    (
      select (start_workout(p.current_version_id, 0, 'quick', gen_random_uuid()) ->> 'created')::boolean
      from public.programmes p
      where p.profile_id = '15000000-0000-4000-8000-000000000001'
    ),
    'start_workout creates a real workout for QUICK mode'
  );

  select ok(
    (
      select (start_workout(p.current_version_id, 0, 'minimum', gen_random_uuid()) ->> 'created')::boolean
      from public.programmes p
      where p.profile_id = '15000000-0000-4000-8000-000000000001'
    ),
    'start_workout creates a real workout for MINIMUM mode'
  );
commit;

select ok(
  (
    select count(distinct we.id)::int
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.profile_id = '15000000-0000-4000-8000-000000000001' and w.mode = 'full'
  ) >= (
    select count(distinct we.id)::int
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.profile_id = '15000000-0000-4000-8000-000000000001' and w.mode = 'quick'
  ),
  'FULL has at least as many exercises as QUICK (breadth reduced before being dropped, docs/PROGRAMME_ENGINE.md §10)'
);

select ok(
  (
    select count(distinct we.id)::int
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.profile_id = '15000000-0000-4000-8000-000000000001' and w.mode = 'quick'
  ) >= (
    select count(distinct we.id)::int
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.profile_id = '15000000-0000-4000-8000-000000000001' and w.mode = 'minimum'
  ),
  'QUICK has at least as many exercises as MINIMUM'
);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000001';

  select is(
    (
      with cid as (select gen_random_uuid() as v)
      select (start_workout(p.current_version_id, 0, 'full', (select v from cid)) ->> 'workoutId')
      from public.programmes p
      where p.profile_id = '15000000-0000-4000-8000-000000000001'
    ) is not null,
    true,
    'idempotency setup call succeeds'
  );
commit;

-- Cross-user: user 2 must never be able to start a workout from user 1's
-- programme_version_id (ownership check, not just client-side trust).
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000002';

  select throws_ok(
    $$
      select public.start_workout(
        (select current_version_id from public.programmes where profile_id = '15000000-0000-4000-8000-000000000001'),
        0, 'full', gen_random_uuid()
      )
    $$,
    'P0001',
    'programme_version_not_found',
    'a user cannot start a workout from another user''s programme version'
  );
commit;

select * from finish();
