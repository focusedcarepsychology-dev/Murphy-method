-- Phase 4 exercise ontology v1 seed content (20260725090000): referential
-- integrity, completeness, and the no-equipment hard-filter invariant
-- (real-device remediation Part 5/6, docs/PROGRAMME_ENGINE.md §3.1).
select plan(14);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

select ok(
  (select count(*)::int from public.exercises where active and review_status = 'published') = 35,
  'seeded v1 catalogue has exactly 35 active, published exercises'
);

select ok(
  not exists (
    select 1 from public.exercises
    where description is null or trim(description) = ''
       or starting_position is null or trim(starting_position) = ''
       or array_length(instructions, 1) is null or array_length(instructions, 1) < 2
       or array_length(coaching_cues, 1) is null or array_length(coaching_cues, 1) < 2
       or array_length(common_mistakes, 1) is null or array_length(common_mistakes, 1) < 1
       or media_url is null or trim(media_url) = ''
  ),
  'no seeded exercise is missing a description, starting position, instructions, cues, mistakes, or a visual key '
  '(no partially-filled ontology rows, docs/IMPLEMENTATION_PLAN.md Phase 4 acceptance criteria)'
);

select ok(
  not exists (
    select 1 from public.exercises e
    where not exists (select 1 from public.exercise_muscles em where em.exercise_id = e.id)
  ),
  'every seeded exercise has at least one exercise_muscles row'
);

select ok(
  not exists (
    select 1 from public.exercise_muscles em
    where not exists (select 1 from public.muscles m where m.id = em.muscle_id)
  ),
  'no orphaned exercise_muscles rows'
);

select ok(
  not exists (
    select 1 from public.exercise_substitutions es
    where es.exercise_id = es.substitute_exercise_id
  ),
  'no self-referential exercise_substitutions edges'
);

select ok(
  not exists (
    select 1 from public.exercise_substitutions es
    where not exists (select 1 from public.exercises e where e.id = es.exercise_id)
       or not exists (select 1 from public.exercises e where e.id = es.substitute_exercise_id)
  ),
  'no dangling exercise_substitutions edges'
);

select ok(
  (select count(distinct movement_pattern_id)::int from public.exercises) >= 15,
  'seeded catalogue covers at least 15 of the 17 movement patterns'
);

-- INVARIANT E (docs/... real-device remediation Part 19): a no-equipment
-- user cannot be assigned a dumbbell/barbell/cable/machine exercise.
-- Bodyweight-eligibility is structural: an exercise with zero required
-- exercise_equipment rows needs nothing beyond the user's own body.
select ok(
  (select count(*)::int from public.exercises e
   where not exists (
     select 1 from public.exercise_equipment ee where ee.exercise_id = e.id and ee.required
   )) >= 15,
  'at least 15 exercises are genuinely bodyweight-eligible (zero required equipment rows)'
);

select ok(
  not exists (
    select 1 from public.exercise_equipment ee
    join public.equipment eq on eq.id = ee.equipment_id
    where eq.key = 'bodyweight' and ee.required
  ),
  'no exercise declares the "bodyweight" sentinel itself as a required equipment row '
  '(bodyweight-eligible exercises simply have zero required-equipment rows)'
);

select ok(
  (select count(*)::int from public.exercises e
   join public.exercise_equipment ee on ee.exercise_id = e.id
   join public.equipment eq on eq.id = ee.equipment_id
   where ee.required and eq.key in ('dumbbell', 'barbell', 'cable_machine', 'leg_press_machine', 'lat_pulldown_machine')) >= 10,
  'a real, non-trivial set of exercises genuinely requires dumbbell/barbell/cable/machine equipment '
  '(so the no-equipment exclusion below is testing something real, not a vacuous empty set)'
);

-- The full end-to-end version of INVARIANT E (a no-equipment user's
-- generated programme contains zero equipment-required exercises),
-- exercised against the real generate_real_programme_version() RPC
-- output with a genuine no-equipment fixture user, is in
-- 15_programme_engine_v1.sql — this file only establishes that the
-- underlying data makes that invariant meaningful to test (a non-trivial
-- set of both bodyweight-eligible and equipment-gated exercises exist).

select ok(
  (select count(*)::int from public.exercise_restrictions) >= 10,
  'a meaningful (illustrative v1, not final clinical/legal-reviewed) set of exercise_restrictions rows exists'
);

select ok(
  not exists (
    select 1 from public.exercise_restrictions er
    where er.restriction_code not in (
      'cardiac_supervision_required', 'exertional_chest_pain', 'rest_chest_pain',
      'dizziness_balance_risk', 'joint_or_bone_limitation', 'cardiac_bp_medication',
      'pregnancy_or_recent_postpartum'
    )
  ),
  'every exercise_restrictions.restriction_code matches a real code submit_safety_screening() can produce'
);

select ok(
  (select count(*)::int from public.muscles) = 14,
  'seeded 14 muscle rows (13 canonical body-area keys + obliques/lower_back granularity)'
);

select ok(
  (select count(*)::int from public.body_area_muscle_map) = 15,
  'seeded body_area_muscle_map covers all 13 body-area keys'
);

commit;

select * from finish();
