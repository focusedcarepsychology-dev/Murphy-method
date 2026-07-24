-- Phase 3 (Onboarding): the Equipment screen (docs/SCREEN_SPECIFICATIONS.md
-- §2 "Available Equipment") needs real `equipment` reference rows to render
-- and write real `user_equipment` selections against — the reference table
-- was created empty in Phase 2A (supabase/migrations/20260723090400_equipment.sql
-- comment: "content-authoring work, deliberately not seeded"). This is the
-- narrow, stable, Phase-3-minimum taxonomy called for by
-- docs/IMPLEMENTATION_PLAN.md Phase 3 §12 — not the full exercise-library
-- equipment ontology (that remains Phase 4 content-authoring scope, and
-- Phase 4 can freely add more `equipment` rows later without touching or
-- replacing any key/id seeded here).
--
-- Idempotent: `on conflict (key) do nothing` so re-running this migration
-- (or a future migration inserting overlapping keys) is always safe.
insert into public.equipment (key, label, category) values
  ('bodyweight', 'Bodyweight only', 'bodyweight'),
  ('dumbbell', 'Dumbbells', 'free_weight'),
  ('barbell', 'Barbell', 'free_weight'),
  ('kettlebell', 'Kettlebell', 'free_weight'),
  ('bench', 'Bench', 'accessory'),
  ('pull_up_bar', 'Pull-up bar', 'accessory'),
  ('resistance_band', 'Resistance bands', 'accessory'),
  ('cable_machine', 'Cable machine', 'machine'),
  ('leg_press_machine', 'Leg press machine', 'machine'),
  ('lat_pulldown_machine', 'Lat pulldown machine', 'machine')
on conflict (key) do nothing;
