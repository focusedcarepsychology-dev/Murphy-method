-- Sandbox-only harness smoke test. Not the authoritative RLS suite (that's
-- supabase/tests/database, run via pgTAP in CI) — this is a fast,
-- already-executed sanity check that the same policies behave correctly
-- against plain PostgreSQL with the auth/storage shim applied.
\set ON_ERROR_STOP on
\pset format unaligned

-- Two fake users, mirroring the pgTAP suite's User A / User B.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@example.com');

-- profiles rows are normally created by the on_auth_user_created trigger;
-- confirm that actually happened.
select 'profiles row auto-created for both users (expect 2):' as check, count(*) as result
from public.profiles
where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

select 'notification_preferences row auto-created for both users (expect 2):' as check, count(*) as result
from public.notification_preferences
where profile_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- User A creates a goal selection, acting as `authenticated` with sub = A.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  insert into public.user_goals (profile_id, goal_id, priority)
  select '11111111-1111-1111-1111-111111111111', id, 1 from public.goals where key = 'build_muscle';

  select 'User A can read own user_goals (expect 1):' as check, count(*) as result from public.user_goals;
commit;

-- User B (authenticated, different sub) must not see or touch A's row.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

  select 'User B selecting user_goals sees none of A''s rows (expect 0):' as check, count(*) as result
  from public.user_goals;
do $$
declare
  _affected int;
begin
  update public.user_goals set priority = 2
  where profile_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics _affected = row_count;
  if _affected > 0 then
    raise exception 'SMOKE TEST FAILED: User B''s UPDATE affected % row(s) of User A''s user_goals', _affected;
  end if;
  raise notice 'User B UPDATE against A''s row affected 0 rows, as expected (RLS USING clause filtered it out).';
end
$$;
commit;

-- Unauthenticated (anon, no jwt claim at all) must not see anything. This
-- app grants no table privileges to `anon` at all on private tables (see
-- docs/DECISIONS.md), so the denial happens at the grant level before RLS
-- is even evaluated — expect `insufficient_privilege`, not an empty result.
begin;
  set local role anon;
  do $$
  begin
    begin
      perform 1 from public.user_goals limit 1;
      raise exception 'SMOKE TEST FAILED: anon was able to select from user_goals';
    exception
      when insufficient_privilege then
        raise notice 'anon select on user_goals correctly denied (insufficient_privilege).';
    end;
  end
  $$;
commit;

-- Reference content (exercises) is service-role/content-pipeline-managed,
-- never authenticated-client-writable (docs/DATABASE_SCHEMA.md §5) — seed
-- the one test exercise as the unrestricted harness superuser, matching
-- how a real content pipeline would write it via the service role, which
-- bypasses RLS and grants entirely.
insert into public.exercises (
  name, slug, movement_pattern_id, skill_requirement, difficulty, stability_requirement,
  loading_potential, fatigue_profile, recommended_rep_range_low, recommended_rep_range_high, source
)
select 'Test Squat', 'test-squat', id, 'low', 'beginner', 'low', 'moderate', 'moderate', 8, 12, 'internal_authoring'
from public.movement_patterns where key = 'squat';

-- Cross-user negative test on a child table reached via a join policy
-- (set_logs -> workout_exercises -> workouts), matching the RLS Policy
-- Pattern reference in docs/DATABASE_SCHEMA.md §16.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  insert into public.workouts (profile_id, mode, client_generated_id)
  values ('11111111-1111-1111-1111-111111111111', 'full', gen_random_uuid());

  insert into public.workout_exercises (
    workout_id, exercise_id, order_index, target_sets, target_rep_range_low,
    target_rep_range_high, client_generated_id
  )
  select w.id, e.id, 0, 3, 8, 12, gen_random_uuid()
  from public.workouts w, public.exercises e
  where w.profile_id = '11111111-1111-1111-1111-111111111111' and e.slug = 'test-squat';

  insert into public.set_logs (workout_exercise_id, set_number, weight_kg, reps, client_generated_id)
  select we.id, 1, 60, 10, gen_random_uuid()
  from public.workout_exercises we
  join public.workouts w on w.id = we.workout_id
  where w.profile_id = '11111111-1111-1111-1111-111111111111';

  select 'User A can read own set_logs via join policy (expect 1):' as check, count(*) as result from public.set_logs;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

  select 'User B selecting set_logs sees none of A''s rows via join policy (expect 0):' as check, count(*) as result
  from public.set_logs;
commit;

-- Reference table: readable by any authenticated user, never by anon.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  select 'authenticated can read goals reference table (expect 8):' as check, count(*) as result from public.goals;
commit;

begin;
  set local role anon;
  do $$
  begin
    begin
      perform 1 from public.goals limit 1;
      raise exception 'SMOKE TEST FAILED: anon was able to select from goals reference table';
    exception
      when insufficient_privilege then
        raise notice 'anon select on goals correctly denied (insufficient_privilege).';
    end;
  end
  $$;
commit;

-- BodyScan storage object policy: cross-user denial on storage.objects.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  insert into storage.objects (bucket_id, name, owner)
  values ('bodyscans', '11111111-1111-1111-1111-111111111111/scan-1/image-1.jpg', '11111111-1111-1111-1111-111111111111');
  select 'User A can read own bodyscan object (expect 1):' as check, count(*) as result
  from storage.objects where bucket_id = 'bodyscans';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  select 'User B selecting A''s bodyscan storage object sees none (expect 0):' as check, count(*) as result
  from storage.objects where bucket_id = 'bodyscans';
commit;

begin;
  set local role anon;
  select 'anon selecting bodyscan storage objects sees none (expect 0, or denied):' as check, count(*) as result
  from storage.objects where bucket_id = 'bodyscans';
commit;

\echo 'RLS smoke test completed.'
