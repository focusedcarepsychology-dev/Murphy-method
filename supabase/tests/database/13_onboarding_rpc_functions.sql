-- Phase 3 (Onboarding) trusted server-side operations
-- (supabase/migrations/20260724080000_equipment_seed.sql,
-- 20260724080100_onboarding_rpc_functions.sql,
-- 20260724080200_onboarding_grant_tightening.sql).
--
-- Uses its own fixture users (not 00_setup.sql's User A/User B) so this
-- file's assertions never depend on what earlier files in the suite did to
-- A/B's rows — every other file in this directory commits (rather than
-- rolls back) its changes, so A/B accumulate state across the whole suite
-- run in file order; this file's set_user_goal_priorities/
-- complete_onboarding assertions specifically need to know the exact
-- starting state, so it brings its own.
select plan(36);

insert into auth.users (id, email) values
  ('13000000-0000-4000-8000-000000000001', 'user-e@example.com'),
  ('13000000-0000-4000-8000-000000000002', 'user-f@example.com')
on conflict (id) do nothing;

-- ===== equipment seed idempotency =====================================
select is(
  (select count(*)::int from public.equipment where key = 'bodyweight'),
  1,
  'equipment seed created exactly one bodyweight row'
);
select lives_ok(
  $$ insert into public.equipment (key, label, category)
     values ('bodyweight', 'Bodyweight only', 'bodyweight')
     on conflict (key) do nothing $$,
  're-running the equipment seed insert is safe (on conflict do nothing)'
);
select is(
  (select count(*)::int from public.equipment where key = 'bodyweight'),
  1,
  'equipment seed insert did not create a duplicate bodyweight row'
);

-- ===== set_user_goal_priorities ========================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';

  select lives_ok(
    $$ select public.set_user_goal_priorities(array['build_muscle', 'improve_strength', 'consistency']) $$,
    'User E can set an initial ordered goal list'
  );

  select is(
    (select count(*)::int from public.user_goals
       where profile_id = '13000000-0000-4000-8000-000000000001' and active),
    3,
    'User E has exactly 3 active user_goals after the initial call'
  );

  select is(
    (select string_agg(g.key, ',' order by ug.priority)
       from public.user_goals ug join public.goals g on g.id = ug.goal_id
       where ug.profile_id = '13000000-0000-4000-8000-000000000001' and ug.active),
    'build_muscle,improve_strength,consistency',
    'priorities are assigned in call order'
  );

  select lives_ok(
    $$ select public.set_user_goal_priorities(array['consistency', 'build_muscle']) $$,
    'User E can reorder and drop a goal in one call'
  );

  select is(
    (select count(*)::int from public.user_goals
       where profile_id = '13000000-0000-4000-8000-000000000001' and active),
    2,
    'User E has exactly 2 active user_goals after the reorder'
  );

  select is(
    (select string_agg(g.key, ',' order by ug.priority)
       from public.user_goals ug join public.goals g on g.id = ug.goal_id
       where ug.profile_id = '13000000-0000-4000-8000-000000000001' and ug.active),
    'consistency,build_muscle',
    'new priority order is respected'
  );

  select lives_ok(
    $$ select public.set_user_goal_priorities(array['consistency', 'build_muscle']) $$,
    'retrying the same call is safe'
  );

  select is(
    (select count(*)::int from public.user_goals
       where profile_id = '13000000-0000-4000-8000-000000000001' and active),
    2,
    'retry does not create duplicate active priorities'
  );

  select throws_ok(
    $$ select public.set_user_goal_priorities(array['build_muscle', 'build_muscle']) $$,
    'P0001',
    'duplicate_goal_keys',
    'duplicate goal keys in one call are rejected'
  );

  select throws_ok(
    $$ select public.set_user_goal_priorities(array['not_a_real_goal']) $$,
    'P0001',
    'unknown_goal_key',
    'an unknown goal key is rejected'
  );

  select throws_ok(
    $$ select public.set_user_goal_priorities(array[]::text[]) $$,
    'P0001',
    'at_least_one_goal_required',
    'an empty goal list is rejected'
  );
commit;

-- ===== submit_safety_screening rule-derivation matrix ===================
-- One flag true at a time, isolating each rule; every "yes" answer sets
-- requires_clearance (conservative routing, docs/MASTER_SPEC.md §8.1).
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';

  select is(
    (select requires_clearance from public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
       'heart_condition_supervised_only', false, 'chest_pain_during_activity', false,
       'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
       'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
       'pregnant_or_recent_postpartum', false
     ))),
    false,
    'all-clear answers produce requires_clearance = false'
  );

  select is(
    (select restriction_flags from public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
       'heart_condition_supervised_only', true, 'chest_pain_during_activity', false,
       'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
       'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
       'pregnant_or_recent_postpartum', false
     ))),
    array['cardiac_supervision_required'],
    'heart_condition_supervised_only=true yields cardiac_supervision_required'
  );

  select is(
    (select restriction_flags from public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
       'heart_condition_supervised_only', false, 'chest_pain_during_activity', true,
       'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
       'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
       'pregnant_or_recent_postpartum', false
     ))),
    array['exertional_chest_pain'],
    'chest_pain_during_activity=true yields exertional_chest_pain'
  );

  select is(
    (select restriction_flags from public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
       'heart_condition_supervised_only', false, 'chest_pain_during_activity', false,
       'chest_pain_at_rest', true, 'dizziness_or_balance_loss', false,
       'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
       'pregnant_or_recent_postpartum', false
     ))),
    array['rest_chest_pain'],
    'chest_pain_at_rest=true yields rest_chest_pain'
  );

  select is(
    (select restriction_flags from public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
       'heart_condition_supervised_only', false, 'chest_pain_during_activity', false,
       'chest_pain_at_rest', false, 'dizziness_or_balance_loss', true,
       'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
       'pregnant_or_recent_postpartum', false
     ))),
    array['dizziness_balance_risk'],
    'dizziness_or_balance_loss=true yields dizziness_balance_risk'
  );

  select is(
    (select restriction_flags from public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
       'heart_condition_supervised_only', false, 'chest_pain_during_activity', false,
       'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
       'bone_or_joint_problem', true, 'blood_pressure_or_heart_medication', false,
       'pregnant_or_recent_postpartum', false
     ))),
    array['joint_or_bone_limitation'],
    'bone_or_joint_problem=true yields joint_or_bone_limitation'
  );

  select is(
    (select restriction_flags from public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
       'heart_condition_supervised_only', false, 'chest_pain_during_activity', false,
       'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
       'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', true,
       'pregnant_or_recent_postpartum', false
     ))),
    array['cardiac_bp_medication'],
    'blood_pressure_or_heart_medication=true yields cardiac_bp_medication'
  );

  select is(
    (select restriction_flags from public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
       'heart_condition_supervised_only', false, 'chest_pain_during_activity', false,
       'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
       'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
       'pregnant_or_recent_postpartum', true
     ))),
    array['pregnancy_or_recent_postpartum'],
    'pregnant_or_recent_postpartum=true yields pregnancy_or_recent_postpartum'
  );

  select is(
    (select requires_clearance from public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
       'heart_condition_supervised_only', true, 'chest_pain_during_activity', false,
       'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
       'bone_or_joint_problem', true, 'blood_pressure_or_heart_medication', false,
       'pregnant_or_recent_postpartum', false
     ))),
    true,
    'any true answer sets requires_clearance = true'
  );

  select throws_ok(
    $$ select public.submit_safety_screening('murphy-safety-v1',
         jsonb_build_object('heart_condition_supervised_only', true)) $$,
    'P0001',
    'incomplete_screening_responses',
    'a partial response set is rejected'
  );

  select throws_ok(
    $$ select public.submit_safety_screening('not-a-real-version', '{}'::jsonb) $$,
    'P0001',
    'unsupported_screening_version',
    'an unrecognised screening version is rejected'
  );

  select is(
    (select count(*)::int from public.health_screenings
       where profile_id = '13000000-0000-4000-8000-000000000001'),
    9,
    'every successful submission created a new immutable row (9 in this block)'
  );
commit;

-- ===== complete_onboarding ==============================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000002';

  select throws_ok(
    $$ select public.complete_onboarding() $$,
    'P0001',
    'incomplete_onboarding',
    'complete_onboarding rejects a profile with no onboarding data at all'
  );

  update public.profiles set
    date_of_birth = '1990-06-15',
    height_cm = 175,
    training_experience = 'recreational',
    available_training_days = array['tue', 'thu', 'sat'],
    preferred_session_duration_minutes = 45,
    coaching_style = 'direct'
  where id = '13000000-0000-4000-8000-000000000002';

  insert into public.body_measurements (profile_id, measured_on, metric, value)
  values ('13000000-0000-4000-8000-000000000002', current_date, 'weight', 68);

  select public.set_user_goal_priorities(array['improve_fitness']);

  insert into public.user_equipment (profile_id, equipment_id, available)
  select '13000000-0000-4000-8000-000000000002', id, true
  from public.equipment where key = 'dumbbell';

  -- Requires-clearance path: the programme stand-in must still be created,
  -- but must honestly reflect the restriction rather than implying
  -- ordinary unrestricted clearance (docs/IMPLEMENTATION_PLAN.md Phase 3 §21).
  select public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
    'heart_condition_supervised_only', true, 'chest_pain_during_activity', false,
    'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
    'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
    'pregnant_or_recent_postpartum', false
  ));

  select lives_ok(
    $$ select public.complete_onboarding() $$,
    'complete_onboarding succeeds once every required step has data'
  );

  select is(
    (select onboarding_completed_at is not null from public.profiles
       where id = '13000000-0000-4000-8000-000000000002'),
    true,
    'onboarding_completed_at is set after successful completion'
  );

  select is(
    (select count(*)::int from public.programmes
       where profile_id = '13000000-0000-4000-8000-000000000002'),
    1,
    'completion created exactly one programme'
  );

  select is(
    (select (pv.structure ->> 'requiresClearance')::boolean
       from public.programme_versions pv
       join public.programmes p on p.id = pv.programme_id
       where p.profile_id = '13000000-0000-4000-8000-000000000002'),
    true,
    'the generated programme structure honestly reflects requires_clearance'
  );

  select lives_ok(
    $$ select public.complete_onboarding() $$,
    'calling complete_onboarding again after completion does not error'
  );

  select is(
    (select count(*)::int from public.programmes
       where profile_id = '13000000-0000-4000-8000-000000000002'),
    1,
    'the retried call did not create a second programme'
  );

  select is(
    (select count(*)::int from public.programme_versions pv
       join public.programmes p on p.id = pv.programme_id
       where p.profile_id = '13000000-0000-4000-8000-000000000002'),
    1,
    'the retried call did not create a second programme version'
  );
commit;

-- ===== cross-user isolation =============================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';

  select is(
    (select count(*)::int from public.programmes
       where profile_id = '13000000-0000-4000-8000-000000000002'),
    0,
    'User E cannot see User F''s programme (RLS)'
  );

  select is(
    (select count(*)::int from public.health_screenings
       where profile_id = '13000000-0000-4000-8000-000000000002'),
    0,
    'User E cannot see User F''s health_screenings (RLS)'
  );
commit;

select * from finish();
