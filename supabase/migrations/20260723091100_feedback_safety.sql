-- docs/DATABASE_SCHEMA.md §8 Feedback & Safety Events.
create table public.exercise_feedback (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  enjoyment smallint check (enjoyment is null or enjoyment between 1 and 5),
  difficulty text check (difficulty is null or difficulty in ('too_easy', 'appropriate', 'very_hard', 'too_hard')),
  signal_type text check (
    signal_type is null
    or signal_type in ('dislike', 'excessive_difficulty', 'pain', 'technical_insecurity', 'boredom')
  ),
  created_at timestamptz not null default now()
);

comment on table public.exercise_feedback is
  'signal_type = ''pain'' here is a cross-reference marker only — actual pain reports '
  'always additionally use the dedicated pain_reports table below (docs/DATABASE_SCHEMA.md §8).';

create index exercise_feedback_workout_exercise_idx on public.exercise_feedback (workout_exercise_id);

create table public.workout_feedback (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null unique references public.workouts (id) on delete cascade,
  enjoyment smallint check (enjoyment is null or enjoyment between 1 and 5),
  overall_difficulty smallint check (overall_difficulty is null or overall_difficulty between 1 and 5),
  energy_afterwards text check (energy_afterwards is null or energy_afterwards in ('better', 'same', 'worse')),
  would_repeat text check (would_repeat is null or would_repeat in ('yes', 'maybe', 'no')),
  created_at timestamptz not null default now()
);

create table public.pain_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises (id),
  exercise_id uuid references public.exercises (id),
  body_area text not null,
  severity text not null check (severity in ('mild', 'moderate', 'significant')),
  description text,
  action_taken text not null check (
    action_taken in ('paused_progression', 'exercise_modified', 'exercise_stopped', 'escalation_shown')
  ),
  created_at timestamptz not null default now()
);

comment on table public.pain_reports is
  'Immutable, insert-only. The dedicated pain/discomfort flow '
  '(docs/MASTER_SPEC.md §8.2) — never merged into exercise_feedback.';

create index pain_reports_profile_created_idx on public.pain_reports (profile_id, created_at desc);

-- P1, schema reserved now (docs/DATABASE_SCHEMA.md §8) so Phase 8's Daily
-- Readiness feature does not require a migration touching workout
-- generation; not read/written by any Phase 2 code path.
create table public.readiness_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  readiness text not null check (readiness in ('very_low', 'low', 'normal', 'good', 'excellent')),
  sleep_quality smallint check (sleep_quality is null or sleep_quality between 1 and 5),
  soreness smallint check (soreness is null or soreness between 1 and 5),
  available_minutes integer check (available_minutes is null or available_minutes > 0),
  created_at timestamptz not null default now(),
  unique (profile_id, entry_date)
);

-- RLS ---------------------------------------------------------------------

alter table public.exercise_feedback enable row level security;

create policy "exercise_feedback: owner select"
  on public.exercise_feedback for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = exercise_feedback.workout_exercise_id
        and w.profile_id = (select auth.uid())
    )
  );

create policy "exercise_feedback: owner insert"
  on public.exercise_feedback for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = exercise_feedback.workout_exercise_id
        and w.profile_id = (select auth.uid())
    )
  );

grant select, insert on table public.exercise_feedback to authenticated;

alter table public.workout_feedback enable row level security;

create policy "workout_feedback: owner select"
  on public.workout_feedback for select
  to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_feedback.workout_id
        and w.profile_id = (select auth.uid())
    )
  );

create policy "workout_feedback: owner insert"
  on public.workout_feedback for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_feedback.workout_id
        and w.profile_id = (select auth.uid())
    )
  );

grant select, insert on table public.workout_feedback to authenticated;

alter table public.pain_reports enable row level security;

create policy "pain_reports: owner select"
  on public.pain_reports for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "pain_reports: owner insert"
  on public.pain_reports for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

-- Insert-only for the authenticated client role.
grant select, insert on table public.pain_reports to authenticated;

alter table public.readiness_entries enable row level security;

create policy "readiness_entries: owner select"
  on public.readiness_entries for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "readiness_entries: owner insert"
  on public.readiness_entries for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "readiness_entries: owner update"
  on public.readiness_entries for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

grant select, insert, update on table public.readiness_entries to authenticated;
