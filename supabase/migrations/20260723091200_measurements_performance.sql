-- docs/DATABASE_SCHEMA.md §9 Measurements & Performance.
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  measured_on date not null,
  metric text not null check (metric in ('weight', 'waist', 'chest', 'hips', 'arm', 'thigh', 'calf')),
  value numeric(6, 2) not null check (value > 0),
  source text not null default 'manual' check (source in ('manual', 'bodyscan_derived')),
  created_at timestamptz not null default now()
);

comment on table public.body_measurements is
  'Multiple same-day entries for the same metric are all retained by design '
  '(docs/DATABASE_SCHEMA.md §9 "Note on conflicting measurements") — no automatic '
  'reconciliation happens at the database layer.';

create index body_measurements_profile_metric_measured_idx
  on public.body_measurements (profile_id, metric, measured_on desc);

create table public.performance_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid references public.exercises (id),
  metric_type text not null,
  period_start date not null,
  period_end date not null,
  value numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

comment on table public.performance_metrics is
  'Written by server-side jobs, not directly by the client (docs/DATABASE_SCHEMA.md §9) '
  '— the authenticated client role gets select only; there is no client-callable write '
  'path, so no insert/update/delete grant is issued for it.';

create index performance_metrics_profile_exercise_metric_idx
  on public.performance_metrics (profile_id, exercise_id, metric_type, period_end desc);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  record_type text not null check (record_type in ('max_weight', 'max_reps_at_weight', 'estimated_1rm')),
  value numeric(10, 2) not null,
  set_log_id uuid references public.set_logs (id),
  achieved_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.personal_records is
  'Append-only from the client''s perspective: the client role gets select + insert '
  '(submitWorkout, API_CONTRACTS.md §8, writes these under the user''s own session) but '
  'no update/delete grant, so an achieved record cannot be quietly edited after the '
  'fact once written — a deliberate integrity tightening beyond the schema doc''s literal '
  '"profile_id = auth.uid()" ownership line, recorded in docs/DECISIONS.md.';

create index personal_records_profile_exercise_type_achieved_idx
  on public.personal_records (profile_id, exercise_id, record_type, achieved_at desc);

-- RLS ---------------------------------------------------------------------

alter table public.body_measurements enable row level security;

create policy "body_measurements: owner select"
  on public.body_measurements for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "body_measurements: owner insert"
  on public.body_measurements for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "body_measurements: owner update"
  on public.body_measurements for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "body_measurements: owner delete"
  on public.body_measurements for delete
  to authenticated
  using (profile_id = (select auth.uid()));

grant select, insert, update, delete on table public.body_measurements to authenticated;

alter table public.performance_metrics enable row level security;

create policy "performance_metrics: owner select"
  on public.performance_metrics for select
  to authenticated
  using (profile_id = (select auth.uid()));

grant select on table public.performance_metrics to authenticated;

alter table public.personal_records enable row level security;

create policy "personal_records: owner select"
  on public.personal_records for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "personal_records: owner insert"
  on public.personal_records for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

grant select, insert on table public.personal_records to authenticated;
