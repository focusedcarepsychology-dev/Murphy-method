-- docs/DATABASE_SCHEMA.md §19: Health/safety data — health_screenings,
-- pain_reports, exercise_restrictions (reference-table read path only).
--
-- health_screenings direct-insert coverage updated by Phase 3
-- (supabase/migrations/20260724080200_onboarding_grant_tightening.sql):
-- the authenticated client role no longer has an INSERT grant on this
-- table at all — only the security-definer public.submit_safety_screening()
-- RPC may write it (docs/MASTER_SPEC.md §8.1 — the client must never be
-- able to set requires_clearance/restriction_flags itself). Full RPC
-- rule-derivation coverage lives in 13_onboarding_rpc_functions.sql; this
-- file only needs enough of a row to keep exercising the immutable-select
-- assertions below.
select plan(13);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select throws_ok(
    $$ insert into public.health_screenings (profile_id, responses, screening_version)
       values ('a0000000-0000-4000-8000-000000000001', '{}'::jsonb, 'v1') $$,
    '42501',
    null,
    'User A cannot insert health_screenings directly (RPC-only write path)'
  );

  select lives_ok(
    $$ select public.submit_safety_screening('murphy-safety-v1', jsonb_build_object(
         'heart_condition_supervised_only', false, 'chest_pain_during_activity', false,
         'chest_pain_at_rest', false, 'dizziness_or_balance_loss', false,
         'bone_or_joint_problem', false, 'blood_pressure_or_heart_medication', false,
         'pregnant_or_recent_postpartum', false
       )) $$,
    'User A can submit a safety screening via submit_safety_screening()'
  );

  select is(
    (select count(*)::int from public.health_screenings where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own health_screenings'
  );

  select throws_ok(
    $$ update public.health_screenings set screening_version = 'v2'
       where profile_id = 'a0000000-0000-4000-8000-000000000001' $$,
    '42501',
    null,
    'User A cannot update health_screenings (immutable, no update grant)'
  );

  select lives_ok(
    $$ insert into public.pain_reports (profile_id, body_area, severity, action_taken)
       values ('a0000000-0000-4000-8000-000000000001', 'lower_back', 'moderate', 'paused_progression') $$,
    'User A can insert own pain_reports row'
  );

  select is(
    (select count(*)::int from public.pain_reports where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own pain_reports'
  );

  select throws_ok(
    $$ update public.pain_reports set severity = 'mild'
       where profile_id = 'a0000000-0000-4000-8000-000000000001' $$,
    '42501',
    null,
    'User A cannot update pain_reports (immutable, no update grant)'
  );

  select lives_ok(
    $$ select 1 from public.exercise_restrictions $$,
    'authenticated can select exercise_restrictions'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int from public.health_screenings where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s health_screenings'
  );

  select is(
    (select count(*)::int from public.pain_reports where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s pain_reports'
  );
commit;

begin;
  set local role anon;

  select throws_ok(
    $$ select 1 from public.health_screenings limit 1 $$,
    '42501',
    null,
    'anon cannot select health_screenings'
  );
  select throws_ok(
    $$ select 1 from public.pain_reports limit 1 $$,
    '42501',
    null,
    'anon cannot select pain_reports'
  );
  select throws_ok(
    $$ select 1 from public.exercise_restrictions limit 1 $$,
    '42501',
    null,
    'anon cannot select exercise_restrictions'
  );
commit;

select * from finish();
