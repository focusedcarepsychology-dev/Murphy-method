-- docs/DATABASE_SCHEMA.md §19: Feedback — exercise_feedback, workout_feedback.
select plan(8);

insert into public.exercises (
  name, slug, movement_pattern_id, skill_requirement, difficulty, stability_requirement,
  loading_potential, fatigue_profile, recommended_rep_range_low, recommended_rep_range_high, source
)
select 'Test Squat (feedback)', 'rls-test-squat-feedback', id, 'low', 'beginner', 'low', 'moderate', 'moderate', 8, 12, 'internal_authoring'
from public.movement_patterns where key = 'squat'
on conflict (slug) do nothing;

insert into public.workouts (id, profile_id, mode, client_generated_id)
values (
  'b0000000-0000-4000-8000-000000000020',
  'a0000000-0000-4000-8000-000000000001',
  'full',
  'b0000000-0000-4000-8000-000000000021'
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id, workout_id, exercise_id, order_index, target_sets, target_rep_range_low,
  target_rep_range_high, client_generated_id
)
select
  'b0000000-0000-4000-8000-000000000022',
  'b0000000-0000-4000-8000-000000000020',
  e.id,
  0,
  3,
  8,
  12,
  'b0000000-0000-4000-8000-000000000023'
from public.exercises e
where e.slug = 'rls-test-squat-feedback'
on conflict (id) do nothing;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select lives_ok(
    $$ insert into public.exercise_feedback (workout_exercise_id, enjoyment, difficulty)
       select we.id, 4, 'appropriate'
       from public.workout_exercises we
       join public.workouts w on w.id = we.workout_id
       where w.profile_id = 'a0000000-0000-4000-8000-000000000001'
       order by we.created_at desc limit 1 $$,
    'User A can insert own exercise_feedback row'
  );

  select is(
    (select count(*)::int
     from public.exercise_feedback ef
     join public.workout_exercises we on we.id = ef.workout_exercise_id
     join public.workouts w on w.id = we.workout_id
     where w.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own exercise_feedback'
  );

  select lives_ok(
    $$ insert into public.workout_feedback (workout_id, enjoyment, overall_difficulty, would_repeat)
       select w.id, 4, 3, 'yes'
       from public.workouts w
       where w.profile_id = 'a0000000-0000-4000-8000-000000000001'
       order by w.created_at desc limit 1 $$,
    'User A can insert own workout_feedback row'
  );

  select is(
    (select count(*)::int
     from public.workout_feedback wf
     join public.workouts w on w.id = wf.workout_id
     where w.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own workout_feedback'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int
     from public.exercise_feedback ef
     join public.workout_exercises we on we.id = ef.workout_exercise_id
     join public.workouts w on w.id = we.workout_id
     where w.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s exercise_feedback'
  );

  select is(
    (select count(*)::int
     from public.workout_feedback wf
     join public.workouts w on w.id = wf.workout_id
     where w.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s workout_feedback'
  );
commit;

begin;
  set local role anon;
  select throws_ok($$ select 1 from public.exercise_feedback limit 1 $$, '42501', null, 'anon cannot select exercise_feedback');
  select throws_ok($$ select 1 from public.workout_feedback limit 1 $$, '42501', null, 'anon cannot select workout_feedback');
commit;

select * from finish();
