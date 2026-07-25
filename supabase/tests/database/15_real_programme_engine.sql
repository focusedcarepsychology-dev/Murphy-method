-- Deterministic initial programme engine v1
-- (supabase/migrations/20260724090300_real_programme_engine_v1.sql).
-- Uses its own fixture users, following 13_onboarding_rpc_functions.sql's
-- convention (this file commits, so later files see its state too).
select plan(15);

insert into auth.users (id, email) values
  ('15000000-0000-4000-8000-000000000001', 'bodyweight-user@example.com'),
  ('15000000-0000-4000-8000-000000000002', 'equipped-user@example.com'),
  ('15000000-0000-4000-8000-000000000003', 'legacy-stub-user@example.com'),
  ('15000000-0000-4000-8000-000000000005', 'balance-restricted-user@example.com')
on conflict (id) do nothing;

-- ===== INVARIANT E: a bodyweight-only user's real programme never =====
-- ===== contains a dumbbell/barbell/cable/machine-required exercise ====
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000001';

  update public.profiles set
    date_of_birth = '1995-01-01', height_cm = 175, training_experience = 'beginner',
    available_training_days = array['mon', 'wed', 'fri'],
    preferred_session_duration_minutes = 30, coaching_style = 'supportive'
  where id = '15000000-0000-4000-8000-000000000001';

  insert into public.body_measurements (profile_id, measured_on, metric, value)
  values ('15000000-0000-4000-8000-000000000001', current_date, 'weight', 70);

  select set_user_goal_priorities(array['build_muscle']);

  select public.set_user_equipment(
    array(select id from public.equipment where key = 'bodyweight')
  );

  select submit_safety_screening('murphy-safety-v1', jsonb_build_object(
    'heart_condition_supervised_only', false, 'chest_pain_during_activity', false,
    'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
    'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
    'pregnant_or_recent_postpartum', false
  ));

  select lives_ok($$ select complete_onboarding() $$, 'complete_onboarding succeeds for a bodyweight-only user');
commit;

select is(
  (
    select count(*)::int
    from public.programme_versions pv
    join public.programmes p on p.id = pv.programme_id,
    jsonb_array_elements(pv.structure -> 'sessions') sess,
    jsonb_array_elements(sess -> 'exercises') ex
    join public.exercise_equipment ee
      on ee.exercise_id = (ex ->> 'exerciseId')::uuid and ee.required
    join public.equipment eq on eq.id = ee.equipment_id
    where p.profile_id = '15000000-0000-4000-8000-000000000001'
      and p.current_version_id = pv.id
      and eq.key <> 'bodyweight'
  ),
  0,
  'INVARIANT E: bodyweight-only user''s generated programme contains zero equipment-required exercises'
);

select ok(
  (
    select jsonb_array_length(pv.structure -> 'sessions') > 0
    from public.programme_versions pv
    join public.programmes p on p.id = pv.programme_id
    where p.profile_id = '15000000-0000-4000-8000-000000000001' and p.current_version_id = pv.id
  ),
  'bodyweight-only user gets at least one real session'
);

select is(
  (
    select pv.engine_version
    from public.programme_versions pv
    join public.programmes p on p.id = pv.programme_id
    where p.profile_id = '15000000-0000-4000-8000-000000000001' and p.current_version_id = pv.id
  ),
  'deterministic-v1',
  'complete_onboarding uses the real deterministic-v1 engine, not the phase3 stub, for new users'
);

-- ===== equipped user gets only exercises compatible with their own ====
-- ===== selected equipment (never an unavailable equipment type) =======
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000002';

  update public.profiles set
    date_of_birth = '1990-01-01', height_cm = 180, training_experience = 'intermediate',
    available_training_days = array['mon', 'tue', 'wed', 'thu'],
    preferred_session_duration_minutes = 45, coaching_style = 'direct'
  where id = '15000000-0000-4000-8000-000000000002';

  insert into public.body_measurements (profile_id, measured_on, metric, value)
  values ('15000000-0000-4000-8000-000000000002', current_date, 'weight', 80);

  select set_user_goal_priorities(array['improve_strength']);

  select public.set_user_equipment(
    array(
      select id from public.equipment
      where key in ('dumbbell', 'barbell', 'bench', 'cable_machine', 'pull_up_bar')
    )
  );

  select submit_safety_screening('murphy-safety-v1', jsonb_build_object(
    'heart_condition_supervised_only', false, 'chest_pain_during_activity', false,
    'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
    'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
    'pregnant_or_recent_postpartum', false
  ));

  select lives_ok($$ select complete_onboarding() $$, 'complete_onboarding succeeds for an equipped user');
commit;

select is(
  (
    select count(*)::int
    from public.programme_versions pv
    join public.programmes p on p.id = pv.programme_id,
    jsonb_array_elements(pv.structure -> 'sessions') sess,
    jsonb_array_elements(sess -> 'exercises') ex
    join public.exercise_equipment ee
      on ee.exercise_id = (ex ->> 'exerciseId')::uuid and ee.required
    join public.equipment eq on eq.id = ee.equipment_id
    where p.profile_id = '15000000-0000-4000-8000-000000000002'
      and p.current_version_id = pv.id
      and eq.key not in ('dumbbell', 'barbell', 'bench', 'cable_machine', 'pull_up_bar', 'bodyweight')
  ),
  0,
  'equipped user never receives an exercise requiring equipment they do not have'
);

select ok(
  (
    select count(*)::int
    from public.programme_versions pv
    join public.programmes p on p.id = pv.programme_id,
    jsonb_array_elements(pv.structure -> 'sessions') sess,
    jsonb_array_elements(sess -> 'exercises') ex
    where p.profile_id = '15000000-0000-4000-8000-000000000002' and p.current_version_id = pv.id
      and ex ->> 'movementPattern' in ('horizontal_pull', 'vertical_pull')
  ) > 0,
  'equipped user with real pulling equipment does receive a real pulling exercise'
);

select ok(
  (
    select count(*)::int
    from public.programme_versions pv
    join public.programmes p on p.id = pv.programme_id,
    jsonb_array_elements(pv.structure -> 'sessions') sess,
    jsonb_array_elements(sess -> 'exercises') ex
    where p.profile_id = '15000000-0000-4000-8000-000000000002' and p.current_version_id = pv.id
      and ex ->> 'movementPattern' = 'calf'
  ) > 0,
  'equipped (non-bodyweight-selecting) user still gets bodyweight-only movement patterns like calf work (bodyweight is always available)'
);

-- ===== beginner never receives an advanced/intermediate-only exercise =
select is(
  (
    select count(*)::int
    from public.programme_versions pv
    join public.programmes p on p.id = pv.programme_id,
    jsonb_array_elements(pv.structure -> 'sessions') sess,
    jsonb_array_elements(sess -> 'exercises') ex
    join public.exercises e on e.id = (ex ->> 'exerciseId')::uuid
    where p.profile_id = '15000000-0000-4000-8000-000000000001'
      and p.current_version_id = pv.id
      and e.difficulty <> 'beginner'
  ),
  0,
  'beginner user never receives a non-beginner exercise'
);

-- ===== safety exclusion: a flagged restriction excludes the matching ===
-- ===== exercise (side-plank, dizziness_balance_risk / exclude) ========
update public.profiles set
  date_of_birth = '1992-01-01', height_cm = 168, training_experience = 'recreational',
  available_training_days = array['mon', 'wed', 'fri'],
  preferred_session_duration_minutes = 30, coaching_style = 'analytical'
where id = '15000000-0000-4000-8000-000000000005';

insert into public.body_measurements (profile_id, measured_on, metric, value)
values ('15000000-0000-4000-8000-000000000005', current_date, 'weight', 60);

insert into public.user_equipment (profile_id, equipment_id, available)
select '15000000-0000-4000-8000-000000000005', id, true from public.equipment where key = 'bodyweight';

insert into public.user_goals (profile_id, goal_id, priority, active)
select '15000000-0000-4000-8000-000000000005', id, 1, true from public.goals where key = 'build_muscle';

insert into public.health_screenings (profile_id, responses, screening_version, requires_clearance, restriction_flags)
values (
  '15000000-0000-4000-8000-000000000005', '{"dizziness_or_balance_loss": true}'::jsonb,
  'murphy-safety-v1', true, array['dizziness_balance_risk']
);

select is(
  (
    select count(*)::int
    from jsonb_array_elements(
      public.build_real_programme_structure('15000000-0000-4000-8000-000000000005') -> 'sessions'
    ) sess,
    jsonb_array_elements(sess -> 'exercises') ex
    where ex ->> 'exerciseId' = (select id::text from public.exercises where slug = 'side-plank')
  ),
  0,
  'SAFETY HARD FILTER: a user flagged dizziness_balance_risk never receives side-plank (exercise_restrictions exclude)'
);

-- ===== idempotent upgrade path for a legacy phase3-stub-1 user =========
update public.profiles set
  date_of_birth = '1988-01-01', height_cm = 170, training_experience = 'beginner',
  available_training_days = array['sat'], preferred_session_duration_minutes = 20,
  coaching_style = 'calm_minimal', onboarding_completed_at = now()
where id = '15000000-0000-4000-8000-000000000003';

insert into public.body_measurements (profile_id, measured_on, metric, value)
values ('15000000-0000-4000-8000-000000000003', current_date, 'weight', 65);

insert into public.user_equipment (profile_id, equipment_id, available)
select '15000000-0000-4000-8000-000000000003', id, true from public.equipment where key = 'bodyweight';

insert into public.health_screenings (profile_id, responses, screening_version, requires_clearance, restriction_flags)
values ('15000000-0000-4000-8000-000000000003', '{}'::jsonb, 'murphy-safety-v1', false, '{}');

insert into public.user_goals (profile_id, goal_id, priority, active)
select '15000000-0000-4000-8000-000000000003', id, 1, true from public.goals where key = 'consistency';

insert into public.programmes (id, profile_id, status)
values ('15000000-0000-4000-8000-00000000aaaa', '15000000-0000-4000-8000-000000000003', 'active');
insert into public.programme_versions (id, programme_id, version_number, structure, change_level, change_reason, engine_version, exercise_dataset_version)
values (
  '15000000-0000-4000-8000-00000000bbbb', '15000000-0000-4000-8000-00000000aaaa', 1,
  '{"standInVersion": "phase3-stub-1"}'::jsonb, 0,
  'Initial programme created from your onboarding responses.', 'phase3-stub-1', '0'
);
update public.programmes set current_version_id = '15000000-0000-4000-8000-00000000bbbb'
where id = '15000000-0000-4000-8000-00000000aaaa';

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000003';

  select is(
    (upgrade_programme_to_real_v1() ->> 'upgraded')::boolean,
    true,
    'upgrade_programme_to_real_v1 upgrades a legacy phase3-stub-1 user'
  );
  select is(
    (upgrade_programme_to_real_v1() ->> 'upgraded')::boolean,
    false,
    'upgrade_programme_to_real_v1 is idempotent: a second call is a no-op'
  );
commit;

select is(
  (select count(*)::int from public.programme_versions where programme_id = '15000000-0000-4000-8000-00000000aaaa'),
  2,
  'exactly one new version was created by the upgrade, not a duplicate per call'
);

select is(
  (
    select engine_version from public.programme_versions
    where programme_id = '15000000-0000-4000-8000-00000000aaaa' and version_number = 1
  ),
  'phase3-stub-1',
  'the original phase3-stub-1 version is preserved as history (INVARIANT G precondition), not rewritten'
);

select is(
  (
    select engine_version from public.programme_versions
    where programme_id = '15000000-0000-4000-8000-00000000aaaa' and version_number = 2
  ),
  'deterministic-v1',
  'the new version uses the real deterministic engine'
);

select throws_ok(
  $$ select public.build_real_programme_structure('15000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'build_real_programme_structure is not directly callable by authenticated clients'
);

select * from finish();
