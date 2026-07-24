-- docs/DATABASE_SCHEMA.md §6 Programme.
-- `programmes` and `programme_versions` reference each other
-- (`programmes.current_version_id` -> a specific version; `programme_versions.programme_id`
-- -> its container), so the circular FK is created in two steps: the
-- column first, the constraint once both tables exist.

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index programmes_profile_status_idx on public.programmes (profile_id, status);

create trigger set_programmes_updated_at
  before update on public.programmes
  for each row execute function public.set_updated_at();

-- `programme_decisions` — immutable, created before `programme_versions`
-- so the latter can reference it directly (docs/DATABASE_SCHEMA.md §6).
create table public.programme_decisions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  change_level smallint not null check (change_level between 0 and 4),
  decision_type text not null check (
    decision_type in (
      'load_progression', 'exercise_substitution', 'deload', 'programme_restructure',
      'user_requested_change'
    )
  ),
  summary text not null,
  confidence numeric(3, 2) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  triggered_by text not null check (triggered_by in ('system', 'user')),
  outcome text not null check (outcome in ('applied', 'abstained')),
  engine_version text not null,
  safety_rules_version text not null,
  personalisation_rules_version text,
  evidence_engine_version text,
  llm_model_version text,
  created_at timestamptz not null default now()
);

comment on table public.programme_decisions is
  'Immutable, insert-only. One row per adaptation decision the system makes or the '
  'user explicitly requests (docs/DATABASE_SCHEMA.md §6), independent of whether it '
  'produced a new programme_versions row.';

create index programme_decisions_profile_created_idx
  on public.programme_decisions (profile_id, created_at desc);

create table public.programme_versions (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  previous_version_id uuid references public.programme_versions (id),
  version_number integer not null check (version_number > 0),
  structure jsonb not null,
  change_level smallint not null check (change_level between 0 and 4),
  change_reason text not null,
  decision_id uuid references public.programme_decisions (id),
  engine_version text not null,
  exercise_dataset_version text not null,
  created_at timestamptz not null default now(),
  unique (programme_id, version_number)
);

comment on table public.programme_versions is
  'Immutable, insert-only — the auditable core of the product '
  '(docs/DATABASE_SCHEMA.md §6, docs/MASTER_SPEC.md §16). Never updated in place.';

create index programme_versions_programme_version_idx
  on public.programme_versions (programme_id, version_number desc);

alter table public.programmes
  add constraint programmes_current_version_id_fkey
  foreign key (current_version_id) references public.programme_versions (id);

create table public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  programme_version_id uuid not null references public.programme_versions (id) on delete cascade,
  block_number smallint not null check (block_number > 0),
  starts_on date not null,
  ends_on date,
  focus_summary text,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create index training_blocks_version_block_idx
  on public.training_blocks (programme_version_id, block_number);

create table public.decision_evidence (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.programme_decisions (id) on delete cascade,
  evidence_type text not null check (
    evidence_type in (
      'exercise_feedback', 'workout_feedback', 'pain_report', 'adherence_pattern',
      'performance_trend', 'readiness_trend'
    )
  ),
  source_table text not null,
  source_id uuid,
  weight numeric(3, 2) not null check (weight >= 0 and weight <= 1),
  created_at timestamptz not null default now()
);

comment on table public.decision_evidence is
  'Immutable, insert-only. Line items of evidence supporting a programme_decisions row '
  '(docs/MASTER_SPEC.md §15).';

create index decision_evidence_decision_idx on public.decision_evidence (decision_id);

-- RLS ---------------------------------------------------------------------

alter table public.programmes enable row level security;

create policy "programmes: owner select"
  on public.programmes for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "programmes: owner insert"
  on public.programmes for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "programmes: owner update"
  on public.programmes for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

grant select, insert, update on table public.programmes to authenticated;

alter table public.programme_versions enable row level security;

create policy "programme_versions: owner select"
  on public.programme_versions for select
  to authenticated
  using (
    exists (
      select 1 from public.programmes p
      where p.id = programme_versions.programme_id
        and p.profile_id = (select auth.uid())
    )
  );

create policy "programme_versions: owner insert"
  on public.programme_versions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.programmes p
      where p.id = programme_versions.programme_id
        and p.profile_id = (select auth.uid())
    )
  );

-- Insert-only for the authenticated client role: no update/delete grant.
grant select, insert on table public.programme_versions to authenticated;

alter table public.training_blocks enable row level security;

create policy "training_blocks: owner select"
  on public.training_blocks for select
  to authenticated
  using (
    exists (
      select 1 from public.programme_versions pv
      join public.programmes p on p.id = pv.programme_id
      where pv.id = training_blocks.programme_version_id
        and p.profile_id = (select auth.uid())
    )
  );

create policy "training_blocks: owner insert"
  on public.training_blocks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.programme_versions pv
      join public.programmes p on p.id = pv.programme_id
      where pv.id = training_blocks.programme_version_id
        and p.profile_id = (select auth.uid())
    )
  );

grant select, insert on table public.training_blocks to authenticated;

alter table public.programme_decisions enable row level security;

create policy "programme_decisions: owner select"
  on public.programme_decisions for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "programme_decisions: owner insert"
  on public.programme_decisions for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

-- Insert-only for the authenticated client role.
grant select, insert on table public.programme_decisions to authenticated;

alter table public.decision_evidence enable row level security;

create policy "decision_evidence: owner select"
  on public.decision_evidence for select
  to authenticated
  using (
    exists (
      select 1 from public.programme_decisions pd
      where pd.id = decision_evidence.decision_id
        and pd.profile_id = (select auth.uid())
    )
  );

create policy "decision_evidence: owner insert"
  on public.decision_evidence for insert
  to authenticated
  with check (
    exists (
      select 1 from public.programme_decisions pd
      where pd.id = decision_evidence.decision_id
        and pd.profile_id = (select auth.uid())
    )
  );

grant select, insert on table public.decision_evidence to authenticated;
