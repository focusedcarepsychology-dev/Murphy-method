-- Real-device remediation Part 6/8: seeds docs/DATABASE_SCHEMA.md §2
-- `body_area_muscle_map`, previously deliberately left empty pending Phase 4
-- content authoring (20260723090700_body_area_goals.sql). This is what lets
-- the deterministic programme engine (20260724090300_real_programme_engine_v1.sql)
-- turn a body-area goal into muscle-level emphasis
-- (docs/PROGRAMME_ENGINE.md §2) instead of ignoring body-area goals
-- entirely. Weights are a simple, honest apportionment — not a claim of
-- precise scientific measurement.

with staged (body_area_key, muscle_key, weight) as (
  values
  ('shoulders', 'anterior_deltoid', 0.4),
  ('shoulders', 'lateral_deltoid', 0.4),
  ('shoulders', 'posterior_deltoid', 0.2),
  ('chest', 'chest', 1.0),
  ('biceps', 'biceps', 1.0),
  ('triceps', 'triceps', 1.0),
  ('forearms', 'forearms', 1.0),
  ('upper_back', 'upper_back', 0.6),
  ('upper_back', 'lats', 0.4),
  ('lats', 'lats', 1.0),
  ('core', 'abs', 0.6),
  ('core', 'obliques', 0.4),
  -- Spot-reduction constraint (docs/PROGRAMME_ENGINE.md §2, MASTER_SPEC.md
  -- §7.2): waist appearance routes to core/postural muscle development
  -- only, never to a fat-loss exercise-selection strategy.
  ('waist_appearance', 'abs', 0.5),
  ('waist_appearance', 'obliques', 0.5),
  ('glutes', 'glutes', 1.0),
  ('quadriceps', 'quadriceps', 1.0),
  ('hamstrings', 'hamstrings', 1.0),
  ('calves', 'calves', 1.0)
)
insert into public.body_area_muscle_map (body_area_key, muscle_id, weight)
select s.body_area_key, m.id, s.weight
from staged s
join public.muscles m on m.key = s.muscle_key;
