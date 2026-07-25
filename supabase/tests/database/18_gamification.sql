-- Ethical gamification: server-derived points, private achievements and opt-in leaderboard.
select plan(18);

create temporary table gamification_fixture as
select
  (min(id::text) filter (where mode = 'minimum'))::uuid as minimum_workout_id,
  (min(id::text) filter (where mode = 'full'))::uuid as full_workout_id,
  (min(id::text) filter (where mode = 'quick'))::uuid as quick_workout_id
from public.workouts
where profile_id = '15000000-0000-4000-8000-000000000001';

-- A partially logged workout must never receive points.
insert into public.set_logs (workout_exercise_id, set_number, reps, client_generated_id)
select we.id, 1, 8, gen_random_uuid()
from public.workout_exercises we
where we.workout_id = (select quick_workout_id from gamification_fixture)
limit 1;

update public.workouts
set status = 'completed', completed_at = now()
where id = (select quick_workout_id from gamification_fixture);

select is(
  (select count(*)::int from public.gamification_point_events
   where source_workout_id = (select quick_workout_id from gamification_fixture)),
  0,
  'a completed status without every prescribed set earns no points'
);

-- Fully log and complete a minimum workout.
insert into public.set_logs (workout_exercise_id, set_number, reps, client_generated_id)
select we.id, set_number, 8, gen_random_uuid()
from public.workout_exercises we
cross join lateral generate_series(1, we.target_sets) as set_number
where we.workout_id = (select minimum_workout_id from gamification_fixture);

update public.workouts
set status = 'completed', completed_at = now()
where id = (select minimum_workout_id from gamification_fixture);

select is(
  (select points from public.gamification_point_events
   where profile_id = '15000000-0000-4000-8000-000000000001'
     and event_type = 'daily_completion'
     and period_start = current_date),
  50,
  'a fully logged minimum session earns 50 Momentum Points'
);

select ok(
  exists(
    select 1 from public.gamification_user_achievements
    where profile_id = '15000000-0000-4000-8000-000000000001'
      and achievement_key = 'minimum_counts'
  ),
  'minimum mode awards the positive Minimum counts achievement'
);

select ok(
  exists(
    select 1 from public.gamification_user_achievements
    where profile_id = '15000000-0000-4000-8000-000000000001'
      and achievement_key = 'first_session'
  ),
  'the first scored day awards the First step achievement'
);

-- A stronger completed mode on the same day upgrades the daily score rather than farming a second event.
insert into public.set_logs (workout_exercise_id, set_number, reps, client_generated_id)
select we.id, set_number, 8, gen_random_uuid()
from public.workout_exercises we
cross join lateral generate_series(1, we.target_sets) as set_number
where we.workout_id = (select full_workout_id from gamification_fixture);

update public.workouts
set status = 'completed', completed_at = now()
where id = (select full_workout_id from gamification_fixture);

select is(
  (select points from public.gamification_point_events
   where profile_id = '15000000-0000-4000-8000-000000000001'
     and event_type = 'daily_completion'
     and period_start = current_date),
  100,
  'the daily score upgrades to the highest completed mode'
);

select is(
  (select count(*)::int from public.gamification_point_events
   where profile_id = '15000000-0000-4000-8000-000000000001'
     and event_type = 'daily_completion'
     and period_start = current_date),
  1,
  'only one competitive completion event exists per day'
);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000001';

  select throws_ok(
    $$ select public.set_gamification_preferences('', true, true) $$,
    'P0001',
    'leaderboard_alias_required',
    'leaderboard participation requires an explicit public alias'
  );

  select lives_ok(
    $$ select public.set_gamification_preferences('Momentum One', true, true) $$,
    'a user can opt in with a valid public alias'
  );

  select is(
    (public.get_gamification_dashboard() ->> 'lifetimePoints')::int,
    100,
    'the dashboard reports only genuine server-scored points'
  );

  select ok(
    jsonb_array_length(public.get_gamification_leaderboard(50) -> 'entries') >= 1,
    'the opted-in user appears in the monthly leaderboard'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int from public.gamification_profiles
     where profile_id = '15000000-0000-4000-8000-000000000001'),
    0,
    'another user cannot read the first user gamification profile directly'
  );

  select is(
    (select count(*)::int from public.gamification_point_events
     where profile_id = '15000000-0000-4000-8000-000000000001'),
    0,
    'another user cannot read the first user point events directly'
  );

  select throws_ok(
    $$ select public.set_gamification_preferences('momentum one', true, true) $$,
    'P0001',
    'leaderboard_alias_taken',
    'public aliases are unique without exposing another member identity'
  );
commit;


-- Cup scoring is normalised to the weekly plan and ignores unsafe extra volume.
update public.profiles
set available_training_days = array['monday', 'thursday']
where id = '15000000-0000-4000-8000-000000000003';

insert into public.gamification_point_events (
  profile_id, event_type, points, period_start, metadata
) values
  (
    '15000000-0000-4000-8000-000000000003',
    'daily_completion',
    100,
    date_trunc('week', current_date::timestamp)::date,
    '{"targetDays": 2}'::jsonb
  ),
  (
    '15000000-0000-4000-8000-000000000003',
    'daily_completion',
    75,
    date_trunc('week', current_date::timestamp)::date + 1,
    '{"targetDays": 2}'::jsonb
  ),
  (
    '15000000-0000-4000-8000-000000000003',
    'daily_completion',
    50,
    date_trunc('week', current_date::timestamp)::date + 2,
    '{"targetDays": 2}'::jsonb
  ),
  (
    '15000000-0000-4000-8000-000000000003',
    'weekly_target',
    75,
    date_trunc('week', current_date::timestamp)::date,
    '{"targetDays": 2, "completedDays": 3}'::jsonb
  );

select is(
  public.gamification_raw_points_for_period(
    '15000000-0000-4000-8000-000000000003',
    date_trunc('week', current_date::timestamp)::date,
    date_trunc('week', current_date::timestamp)::date + 7
  ),
  300,
  'private Momentum Points retain genuine completed-mode values and the weekly bonus'
);

select is(
  public.gamification_score_for_period(
    '15000000-0000-4000-8000-000000000003',
    date_trunc('week', current_date::timestamp)::date,
    date_trunc('week', current_date::timestamp)::date + 7
  ),
  375,
  'Cup score caps completion at the two-day plan and adds only one weekly bonus'
);

select ok(
  not has_table_privilege('authenticated', 'public.gamification_point_events', 'INSERT'),
  'authenticated users cannot insert their own competitive points'
);


select ok(
  not has_table_privilege('authenticated', 'public.workouts', 'INSERT'),
  'authenticated clients cannot create arbitrary workouts to farm tournament points'
);

select ok(
  not has_table_privilege('authenticated', 'public.workout_exercises', 'INSERT'),
  'authenticated clients cannot create arbitrary workout prescriptions'
);

select * from finish();
