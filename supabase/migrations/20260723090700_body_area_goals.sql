-- docs/DATABASE_SCHEMA.md §2 `body_area_muscle_map` (reference) + `body_area_goals`.
create table public.body_area_muscle_map (
  id uuid primary key default gen_random_uuid(),
  body_area_key text not null,
  muscle_id uuid not null references public.muscles (id) on delete cascade,
  weight numeric(3, 2) not null check (weight >= 0 and weight <= 1)
);

comment on table public.body_area_muscle_map is
  'Reference table. Not seeded by this migration: the body-area-to-muscle weighting '
  '(docs/MASTER_SPEC.md §7.1) requires exercise-science content judgement, the same '
  'category of content-authoring work as the exercise library (Phase 4), not a fixed '
  'enumeration this migration can seed safely.';

alter table public.body_area_muscle_map enable row level security;

create policy "body_area_muscle_map: authenticated read"
  on public.body_area_muscle_map for select
  to authenticated
  using (true);

grant select on table public.body_area_muscle_map to authenticated;

create table public.body_area_goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- Fixed region list per docs/MASTER_SPEC.md §7.1; validated against a
  -- literal set rather than a foreign key since regions are a stable,
  -- small taxonomy directly named in the spec rather than a growing
  -- content table.
  body_area_key text not null check (
    body_area_key in (
      'shoulders', 'chest', 'biceps', 'triceps', 'forearms', 'upper_back', 'lats',
      'core', 'waist_appearance', 'glutes', 'quadriceps', 'hamstrings', 'calves'
    )
  ),
  priority smallint check (priority is null or priority > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index body_area_goals_profile_active_idx on public.body_area_goals (profile_id, active);

create trigger set_body_area_goals_updated_at
  before update on public.body_area_goals
  for each row execute function public.set_updated_at();

alter table public.body_area_goals enable row level security;

create policy "body_area_goals: owner select"
  on public.body_area_goals for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "body_area_goals: owner insert"
  on public.body_area_goals for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "body_area_goals: owner update"
  on public.body_area_goals for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "body_area_goals: owner delete"
  on public.body_area_goals for delete
  to authenticated
  using (profile_id = (select auth.uid()));

grant select, insert, update, delete on table public.body_area_goals to authenticated;
