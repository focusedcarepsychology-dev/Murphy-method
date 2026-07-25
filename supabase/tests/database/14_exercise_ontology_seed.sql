-- v1 exercise catalogue content integrity
-- (supabase/migrations/20260724090000_exercise_content_fields.sql,
-- 20260724090100_exercise_seed_v1.sql). Verifies the seeded dataset itself
-- is complete and internally consistent — not RLS (covered by
-- 01_reference_tables.sql).
select plan(11);

select ok(
  (select count(*)::int from public.exercises where source = 'internal_authoring') >= 25,
  'seeded at least 25 v1 exercises'
);

select is(
  (select count(*)::int from public.exercises
     where review_status = 'published' and active
       and (visual_key is null or coaching_cues = '{}' or instructions = '{}'
            or starting_position is null or description is null)),
  0,
  'no published/active exercise is missing presentation content (visual, cues, instructions, starting position, description)'
);

select is(
  (select count(*)::int from public.exercises e
     where not exists (select 1 from public.exercise_equipment ee where ee.exercise_id = e.id)),
  0,
  'every seeded exercise has at least one exercise_equipment row'
);

select is(
  (select count(*)::int from public.exercises e
     where not exists (select 1 from public.exercise_muscles em where em.exercise_id = e.id and em.role = 'primary')),
  0,
  'every seeded exercise has at least one primary muscle'
);

-- Part 6 / INVARIANT E precondition: at least one seeded exercise per major
-- movement pattern category is genuinely equipment-free (its only required
-- equipment link is the 'bodyweight' sentinel).
select ok(
  (select count(*)::int from public.exercises e
     where exists (
       select 1 from public.exercise_equipment ee
       join public.equipment eq on eq.id = ee.equipment_id
       where ee.exercise_id = e.id and ee.required and eq.key = 'bodyweight'
     )
     and not exists (
       select 1 from public.exercise_equipment ee
       join public.equipment eq on eq.id = ee.equipment_id
       where ee.exercise_id = e.id and ee.required and eq.key <> 'bodyweight'
     )) >= 14,
  'at least 14 exercises require only the bodyweight sentinel (no real equipment)'
);

-- Honesty check (Part 6): no bodyweight-only exercise claims to be a
-- horizontal_pull or vertical_pull movement pattern.
select is(
  (select count(*)::int from public.exercises e
     join public.movement_patterns mp on mp.id = e.movement_pattern_id
     where mp.key in ('horizontal_pull', 'vertical_pull')
       and exists (
         select 1 from public.exercise_equipment ee
         join public.equipment eq on eq.id = ee.equipment_id
         where ee.exercise_id = e.id and ee.required and eq.key = 'bodyweight'
       )
       and not exists (
         select 1 from public.exercise_equipment ee
         join public.equipment eq on eq.id = ee.equipment_id
         where ee.exercise_id = e.id and ee.required and eq.key <> 'bodyweight'
       )),
  0,
  'no pulling exercise is claimed as bodyweight-only (no fake loaded-pull equivalence)'
);

select is(
  (select count(*)::int from public.exercise_substitutions es
     where not exists (select 1 from public.exercises where id = es.exercise_id)
        or not exists (select 1 from public.exercises where id = es.substitute_exercise_id)),
  0,
  'no dangling exercise_substitutions edges'
);

select is(
  (select count(*)::int from public.exercise_substitutions where exercise_id = substitute_exercise_id),
  0,
  'no self-referential exercise_substitutions edges'
);

select is(
  (select count(*)::int from public.exercise_substitutions where relation_type not in ('regression', 'progression', 'alternative')),
  0,
  'every exercise_substitutions row has a valid relation_type'
);

select is(
  (select count(*)::int from public.exercise_restrictions er
     where not exists (select 1 from public.exercises where id = er.exercise_id)),
  0,
  'no dangling exercise_restrictions rows'
);

select is(
  (select count(*)::int from public.exercise_restrictions where effect not in ('exclude', 'modify')),
  0,
  'every exercise_restrictions row has a valid effect'
);

select * from finish();
