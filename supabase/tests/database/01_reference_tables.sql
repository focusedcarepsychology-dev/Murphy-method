-- Reference tables (docs/DATABASE_SCHEMA.md §19): readable by any
-- authenticated user, never by anon, never client-writable.
select plan(12);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select ok(
    (select count(*)::int from public.goals) = 8,
    'authenticated can read all 8 seeded goals'
  );
  select ok(
    (select count(*)::int from public.movement_patterns) = 17,
    'authenticated can read all 17 seeded movement patterns'
  );
  select ok(
    (select count(*)::int from public.equipment) = 10,
    'authenticated can read all 10 seeded equipment rows (Phase 3 onboarding-minimum taxonomy)'
  );
  select lives_ok(
    $$ select 1 from public.muscles $$,
    'authenticated can select from muscles'
  );
  select lives_ok(
    $$ select 1 from public.exercises $$,
    'authenticated can select from exercises'
  );
  select lives_ok(
    $$ select 1 from public.body_area_muscle_map $$,
    'authenticated can select from body_area_muscle_map'
  );

  select throws_ok(
    $$ insert into public.goals (key, label) values ('hack', 'Hack') $$,
    '42501',
    null,
    'authenticated cannot insert into goals (reference table, service-role only)'
  );
  select throws_ok(
    $$ insert into public.exercises (
         name, slug, movement_pattern_id, skill_requirement, difficulty, stability_requirement,
         loading_potential, fatigue_profile, recommended_rep_range_low, recommended_rep_range_high, source
       )
       select 'x', 'x-hack', id, 'low', 'beginner', 'low', 'low', 'low', 1, 2, 'internal_authoring'
       from public.movement_patterns limit 1
    $$,
    '42501',
    null,
    'authenticated cannot insert into exercises (reference table, service-role only)'
  );
commit;

begin;
  set local role anon;

  select throws_ok(
    $$ select 1 from public.goals limit 1 $$,
    '42501',
    null,
    'anon cannot select from goals'
  );
  select throws_ok(
    $$ select 1 from public.exercises limit 1 $$,
    '42501',
    null,
    'anon cannot select from exercises'
  );
  select throws_ok(
    $$ select 1 from public.equipment limit 1 $$,
    '42501',
    null,
    'anon cannot select from equipment'
  );
  select throws_ok(
    $$ select 1 from public.movement_patterns limit 1 $$,
    '42501',
    null,
    'anon cannot select from movement_patterns'
  );
commit;

select * from finish();
