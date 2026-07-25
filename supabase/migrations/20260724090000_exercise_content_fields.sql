-- Real-device remediation Part 6/7: the exercise ontology from
-- 20260723090500_exercise_ontology.sql supports selection (movement
-- pattern, difficulty, equipment) but not the plain-English presentation
-- an inexperienced user needs (docs/SCREEN_SPECIFICATIONS.md's Exercise
-- Information requirements). This extends the existing `exercises` and
-- `exercise_substitutions` tables rather than creating a parallel content
-- system.

alter table public.exercises
  add column coaching_cues text[] not null default '{}',
  add column common_mistakes text[] not null default '{}',
  add column starting_position text,
  add column instructions text[] not null default '{}',
  add column visual_key text;

comment on column public.exercises.coaching_cues is
  '3-5 short, plain-English cues shown in Exercise Detail (docs/SCREEN_SPECIFICATIONS.md).';
comment on column public.exercises.common_mistakes is
  'Short plain-English list of common form errors, shown in Exercise Detail.';
comment on column public.exercises.starting_position is
  'One or two sentences describing the starting position, shown in Exercise Detail.';
comment on column public.exercises.instructions is
  'Ordered, numbered execution steps in plain English.';
comment on column public.exercises.visual_key is
  'Identifier resolved by the app to an original, internally-owned exercise '
  'illustration (src/components/ui/exercise-visual.tsx) — never a scraped or '
  'licensed third-party image. Nullable only for rows that predate content '
  'authoring; every row seeded/published from this remediation has one.';

-- `exercise_substitutions` currently only encodes an undirected-in-spirit
-- similarity edge. Regressions/progressions are directional relationships
-- along the same movement pattern, not just "similar" exercises, so the
-- edge needs a relation type — reusing this table (per the remediation
-- brief's "do not create duplicate parallel exercise systems") rather than
-- adding a second graph table.
alter table public.exercise_substitutions
  add column relation_type text not null default 'alternative'
    check (relation_type in ('regression', 'progression', 'alternative'));

comment on column public.exercise_substitutions.relation_type is
  '''regression'' = substitute_exercise_id is an easier variant of exercise_id; '
  '''progression'' = a harder variant; ''alternative'' = same-difficulty substitute '
  '(the original similarity-graph meaning).';
