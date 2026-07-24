-- docs/DATABASE_SCHEMA.md §2 `goals` (reference) + `user_goals`.
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text
);

comment on table public.goals is
  'Fixed, closed enumeration per docs/MASTER_SPEC.md §7 — seeded by this migration.';

insert into public.goals (key, label, description) values
  ('build_muscle', 'Build muscle', 'Increase muscle size and definition.'),
  ('improve_strength', 'Improve strength', 'Get stronger on key lifts and movement patterns.'),
  ('lose_fat', 'Lose body fat', 'Reduce body fat while preserving strength and muscle.'),
  ('recomposition', 'Body recomposition', 'Build muscle and lose fat at the same time.'),
  ('improve_fitness', 'Improve general fitness', 'Build overall conditioning and work capacity.'),
  ('improve_mobility', 'Improve mobility', 'Improve joint range of motion and movement quality.'),
  ('consistency', 'Become more consistent', 'Build a sustainable, regular training habit.'),
  ('body_area', 'Improve specific body areas', 'Focus development on selected body areas.');

alter table public.goals enable row level security;

create policy "goals: authenticated read"
  on public.goals for select
  to authenticated
  using (true);

grant select on table public.goals to authenticated;

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  goal_id uuid not null references public.goals (id),
  priority smallint not null check (priority > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforces a strict per-profile priority ranking among currently active
-- goals (docs/MASTER_SPEC.md §7); a partial unique index is used because
-- Postgres `unique (...) where ...` table constraints aren't supported —
-- a partial unique index is the standard equivalent.
create unique index user_goals_profile_priority_active_idx
  on public.user_goals (profile_id, priority)
  where active;

create index user_goals_profile_active_priority_idx
  on public.user_goals (profile_id, active, priority);

create trigger set_user_goals_updated_at
  before update on public.user_goals
  for each row execute function public.set_updated_at();

alter table public.user_goals enable row level security;

create policy "user_goals: owner select"
  on public.user_goals for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "user_goals: owner insert"
  on public.user_goals for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "user_goals: owner update"
  on public.user_goals for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "user_goals: owner delete"
  on public.user_goals for delete
  to authenticated
  using (profile_id = (select auth.uid()));

grant select, insert, update, delete on table public.user_goals to authenticated;
