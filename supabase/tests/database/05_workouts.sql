-- docs/DATABASE_SCHEMA.md §19: Workouts — workouts, workout_exercises, set_logs.
select plan(16);

-- Reference and server-authoritative workout fixtures are seeded by the
-- unrestricted test runner, matching service-role/RPC writes in production.
insert into public.exercises (
  name, slug, movement_pattern_id, skill_requirement, difficulty, stability_requirement,
  loading_potential, fatigue_profile, recommended_rep_range_low, recommended_rep_range_high, source
)
select 'Test Squat', 'rls-test-squat', id, 'low', 'beginner', 'low', 'moderate', 'moderate', 8, 12, 'internal_authoring'
from public.movement_patterns where key = 'squat'
on conflict (slug) do nothing;

insert into public.workouts (id, profile_id, mode, client_generated_id)
values (
  'b0000000-0000-4000-8000-000000000000',
  'a0000000-0000-4000-8000-000000000001',
  'full',
  'b0000000-0000-4000-8000-000000000010'
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id, workout_id, exercise_id, order_index, target_sets, target_rep_range_low,
  target_rep_range_high, client_generated_id
)
select
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000000',
  e.id,
  0,
  3,
  8,
  12,
  'b0000000-0000-4000-8000-000000000011'
from public.exercises e
where e.slug = 'rls-test-squat'
on conflict (id) do nothing;

select ok(
  not has_table_privilege('authenticated', 'public.workouts', 'INSERT'),
  'authenticated clients cannot insert arbitrary workouts'
);

select ok(
  not has_table_privilege('authenticated', 'public.workout_exercises', 'INSERT'),
  'authenticated clients cannot insert arbitrary workout prescriptions'
);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select is(
    (select count(*)::int from public.workouts where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own workouts'
  );

  with updated as (
    update public.workouts set status = 'in_progress'
      where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from updated), 1, 'User A can update own workouts');

  select is(
    (select count(*)::int
     from public.workout_exercises we
     join public.workouts w on w.id = we.workout_id
     where w.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own workout_exercises'
  );

  select lives_ok(
    $$ insert into public.set_logs (workout_exercise_id, set_number, weight_kg, reps, client_generated_id)
       values ('b0000000-0000-4000-8000-000000000001', 1, 60, 10, gen_random_uuid()) $$,
    'User A can insert own set_logs row'
  );

  select is(
    (select count(*)::int
     from public.set_logs sl
     join public.workout_exercises we on we.id = sl.workout_exercise_id
     join public.workouts w on w.id = we.workout_id
     where w.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own set_logs via join policy'
  );

  with updated as (
    update public.set_logs set reps = 11
      where workout_exercise_id = 'b0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from updated), 1, 'User A can update own set_logs');
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int from public.workouts where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s workouts'
  );

  with updated as (
    update public.workouts set status = 'skipped'
      where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from updated), 0, 'User B''s UPDATE targeting User A''s workouts affects 0 rows');

  select is(
    (select count(*)::int
     from public.workout_exercises we
     join public.workouts w on w.id = we.workout_id
     where w.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s workout_exercises via join policy'
  );

  select is(
    (select count(*)::int
     from public.set_logs sl
     join public.workout_exercises we on we.id = sl.workout_exercise_id
     join public.workouts w on w.id = we.workout_id
     where w.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s set_logs via join policy'
  );

  select throws_ok(
    $$ insert into public.set_logs (workout_exercise_id, set_number, reps, client_generated_id)
       values ('b0000000-0000-4000-8000-000000000001', 99, 1, gen_random_uuid()) $$,
    '42501',
    null,
    'User B cannot insert a set_logs row falsely attached to User A''s workout_exercise'
  );
commit;

begin;
  set local role anon;

  select throws_ok($$ select 1 from public.workouts limit 1 $$, '42501', null, 'anon cannot select workouts');
  select throws_ok($$ select 1 from public.workout_exercises limit 1 $$, '42501', null, 'anon cannot select workout_exercises');
  select throws_ok($$ select 1 from public.set_logs limit 1 $$, '42501', null, 'anon cannot select set_logs');
commit;

select * from finish();
