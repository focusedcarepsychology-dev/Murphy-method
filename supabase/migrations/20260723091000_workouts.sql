-- docs/DATABASE_SCHEMA.md §7 Workouts.
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  programme_version_id uuid references public.programme_versions (id),
  training_block_id uuid references public.training_blocks (id),
  mode text not null check (mode in ('full', 'quick', 'minimum')),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  scheduled_for date,
  started_at timestamptz,
  completed_at timestamptz,
  estimated_duration_minutes integer check (estimated_duration_minutes is null or estimated_duration_minutes > 0),
  client_generated_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.workouts.client_generated_id is
  'Offline-sync idempotency key, set by the client at workout-start time '
  '(docs/ARCHITECTURE.md §5). The server-side write is an upsert keyed on this '
  'column, so replaying a queued mutation any number of times produces the row once.';

create index workouts_profile_scheduled_idx on public.workouts (profile_id, scheduled_for);
create index workouts_profile_status_idx on public.workouts (profile_id, status);

create trigger set_workouts_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  order_index smallint not null check (order_index >= 0),
  target_sets smallint not null check (target_sets > 0),
  target_rep_range_low smallint not null check (target_rep_range_low > 0),
  target_rep_range_high smallint not null check (target_rep_range_high >= target_rep_range_low),
  suggested_load_kg numeric(6, 2) check (suggested_load_kg is null or suggested_load_kg >= 0),
  substituted_from_exercise_id uuid references public.exercises (id),
  client_generated_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_exercises_workout_order_idx on public.workout_exercises (workout_id, order_index);

create trigger set_workout_exercises_updated_at
  before update on public.workout_exercises
  for each row execute function public.set_updated_at();

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number smallint not null check (set_number > 0),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg >= 0),
  reps smallint not null check (reps >= 0),
  effort_response smallint check (effort_response is null or effort_response between 0 and 3),
  completed_at timestamptz not null default now(),
  client_generated_id uuid not null unique,
  created_at timestamptz not null default now()
);

comment on table public.set_logs is
  'Highest-write-volume table during a workout. The idempotent '
  'client_generated_id is what makes the offline sync queue safe to retry '
  '(docs/ARCHITECTURE.md §5).';

create index set_logs_workout_exercise_set_idx on public.set_logs (workout_exercise_id, set_number);

-- RLS ---------------------------------------------------------------------

alter table public.workouts enable row level security;

create policy "workouts: owner select"
  on public.workouts for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "workouts: owner insert"
  on public.workouts for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "workouts: owner update"
  on public.workouts for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

grant select, insert, update on table public.workouts to authenticated;

alter table public.workout_exercises enable row level security;

create policy "workout_exercises: owner select"
  on public.workout_exercises for select
  to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.profile_id = (select auth.uid())
    )
  );

create policy "workout_exercises: owner insert"
  on public.workout_exercises for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.profile_id = (select auth.uid())
    )
  );

create policy "workout_exercises: owner update"
  on public.workout_exercises for update
  to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.profile_id = (select auth.uid())
    )
  );

grant select, insert, update on table public.workout_exercises to authenticated;

alter table public.set_logs enable row level security;

create policy "set_logs: owner select"
  on public.set_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id
        and w.profile_id = (select auth.uid())
    )
  );

create policy "set_logs: owner insert"
  on public.set_logs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id
        and w.profile_id = (select auth.uid())
    )
  );

create policy "set_logs: owner update"
  on public.set_logs for update
  to authenticated
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id
        and w.profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id
        and w.profile_id = (select auth.uid())
    )
  );

create policy "set_logs: owner delete"
  on public.set_logs for delete
  to authenticated
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id
        and w.profile_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.set_logs to authenticated;
