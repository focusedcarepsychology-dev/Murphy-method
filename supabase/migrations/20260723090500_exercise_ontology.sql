-- docs/DATABASE_SCHEMA.md §5 Exercise Ontology (reference data, P0).
-- All tables here are reference data: readable by any authenticated user,
-- writable only by the service role / content pipeline. Bulk content
-- (actual muscle/exercise rows) is Phase 4 scope
-- (docs/IMPLEMENTATION_PLAN.md Phase 4) and is deliberately not seeded by
-- this migration — see docs/DECISIONS.md's Phase 2A entry for exactly
-- which reference values this phase does vs. does not seed.

create table public.muscles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  muscle_group text not null
);

create table public.movement_patterns (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null
);

comment on table public.movement_patterns is
  'Fixed, closed enumeration per docs/MASTER_SPEC.md §9 — seeded by this migration '
  '(structural taxonomy, not authored exercise content).';

insert into public.movement_patterns (key, label) values
  ('horizontal_push', 'Horizontal push'),
  ('vertical_push', 'Vertical push'),
  ('horizontal_pull', 'Horizontal pull'),
  ('vertical_pull', 'Vertical pull'),
  ('squat', 'Squat'),
  ('hip_hinge', 'Hip hinge'),
  ('lunge_single_leg', 'Lunge / single-leg'),
  ('knee_flexion', 'Knee flexion'),
  ('hip_extension', 'Hip extension'),
  ('hip_abduction', 'Hip abduction'),
  ('elbow_flexion', 'Elbow flexion'),
  ('elbow_extension', 'Elbow extension'),
  ('calf', 'Calf'),
  ('core_anti_extension', 'Core anti-extension'),
  ('core_anti_rotation', 'Core anti-rotation'),
  ('loaded_carry', 'Loaded carry'),
  ('conditioning', 'Conditioning');

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  aliases text[] not null default '{}',
  description text,
  movement_pattern_id uuid not null references public.movement_patterns (id),
  skill_requirement text not null check (skill_requirement in ('low', 'moderate', 'high')),
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  stability_requirement text not null check (stability_requirement in ('low', 'moderate', 'high')),
  loading_potential text not null check (loading_potential in ('low', 'moderate', 'high')),
  fatigue_profile text not null check (fatigue_profile in ('low', 'moderate', 'high')),
  recommended_rep_range_low smallint not null check (recommended_rep_range_low > 0),
  recommended_rep_range_high smallint not null check (recommended_rep_range_high >= recommended_rep_range_low),
  setup_time_seconds integer check (setup_time_seconds is null or setup_time_seconds >= 0),
  media_url text,
  content_version text not null default '1',
  dataset_version text not null default '0',
  source text not null check (source in ('internal_authoring', 'licensed_dataset_import', 'content_partner')),
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed', 'published')),
  reviewed_at timestamptz,
  contraindication_metadata_version text not null default '0',
  locale_ready boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_movement_pattern_idx on public.exercises (movement_pattern_id);
create index exercises_active_idx on public.exercises (active);
create index exercises_review_status_idx on public.exercises (review_status);

create trigger set_exercises_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

create table public.exercise_muscles (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle_id uuid not null references public.muscles (id) on delete cascade,
  role text not null check (role in ('primary', 'secondary')),
  unique (exercise_id, muscle_id)
);

create index exercise_muscles_exercise_idx on public.exercise_muscles (exercise_id);
create index exercise_muscles_muscle_role_idx on public.exercise_muscles (muscle_id, role);

create table public.exercise_equipment (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  required boolean not null,
  unique (exercise_id, equipment_id)
);

create index exercise_equipment_equipment_idx on public.exercise_equipment (equipment_id);

create table public.exercise_substitutions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  substitute_exercise_id uuid not null references public.exercises (id) on delete cascade,
  similarity_score numeric(3, 2) not null check (similarity_score >= 0 and similarity_score <= 1),
  unique (exercise_id, substitute_exercise_id),
  check (exercise_id <> substitute_exercise_id)
);

create index exercise_substitutions_exercise_score_idx
  on public.exercise_substitutions (exercise_id, similarity_score desc);

create table public.exercise_restrictions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  restriction_code text not null,
  effect text not null check (effect in ('exclude', 'modify')),
  notes text
);

create index exercise_restrictions_code_idx on public.exercise_restrictions (restriction_code);

-- RLS: every table in this file is reference data (docs/DATABASE_SCHEMA.md
-- §16) — select for any authenticated user, no client write path at all.
alter table public.muscles enable row level security;
alter table public.movement_patterns enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.exercise_equipment enable row level security;
alter table public.exercise_substitutions enable row level security;
alter table public.exercise_restrictions enable row level security;

create policy "muscles: authenticated read" on public.muscles for select to authenticated using (true);
create policy "movement_patterns: authenticated read" on public.movement_patterns for select to authenticated using (true);
create policy "exercises: authenticated read" on public.exercises for select to authenticated using (true);
create policy "exercise_muscles: authenticated read" on public.exercise_muscles for select to authenticated using (true);
create policy "exercise_equipment: authenticated read" on public.exercise_equipment for select to authenticated using (true);
create policy "exercise_substitutions: authenticated read" on public.exercise_substitutions for select to authenticated using (true);
create policy "exercise_restrictions: authenticated read" on public.exercise_restrictions for select to authenticated using (true);

grant select on table public.muscles to authenticated;
grant select on table public.movement_patterns to authenticated;
grant select on table public.exercises to authenticated;
grant select on table public.exercise_muscles to authenticated;
grant select on table public.exercise_equipment to authenticated;
grant select on table public.exercise_substitutions to authenticated;
grant select on table public.exercise_restrictions to authenticated;
