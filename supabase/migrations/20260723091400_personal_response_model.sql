-- docs/DATABASE_SCHEMA.md §11 Personal Response Model.
create table public.personal_response_models (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  domain text not null check (domain in ('physical', 'training', 'preference', 'behavioural', 'motivation')),
  attribute_key text not null,
  estimate jsonb not null,
  confidence numeric(3, 2) not null check (confidence >= 0 and confidence <= 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  personalisation_rules_version text not null,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (profile_id, attribute_key)
);

comment on table public.personal_response_models is
  'Read-only to the client — written only by server-side Personalisation Engine jobs '
  '(docs/DATABASE_SCHEMA.md §11). The authenticated client role gets select only.';

create index personal_response_models_profile_domain_idx
  on public.personal_response_models (profile_id, domain);

create table public.preference_signals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  signal_type text not null,
  subject_id uuid,
  value jsonb not null,
  source_table text not null,
  source_id uuid,
  created_at timestamptz not null default now()
);

comment on table public.preference_signals is
  'Immutable, insert-only. The evidentiary input the Personalisation Engine aggregates '
  'into personal_response_models rows (docs/DATABASE_SCHEMA.md §11).';

create index preference_signals_profile_type_created_idx
  on public.preference_signals (profile_id, signal_type, created_at desc);

-- P1, schema reserved now (docs/DATABASE_SCHEMA.md §11); not populated
-- until the Motivation Profile feature ships.
create table public.motivation_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  numerical_target_responsiveness numeric(3, 2),
  encouragement_responsiveness numeric(3, 2),
  pr_responsiveness numeric(3, 2),
  time_minimisation_responsiveness numeric(3, 2),
  competitive_framing_responsiveness numeric(3, 2),
  preferred_notification_time time,
  streak_pressure_averse boolean,
  notification_fatigue_score numeric(3, 2),
  updated_at timestamptz not null default now()
);

create trigger set_motivation_profiles_updated_at
  before update on public.motivation_profiles
  for each row execute function public.set_updated_at();

-- RLS ---------------------------------------------------------------------

alter table public.personal_response_models enable row level security;

create policy "personal_response_models: owner select"
  on public.personal_response_models for select
  to authenticated
  using (profile_id = (select auth.uid()));

grant select on table public.personal_response_models to authenticated;

alter table public.preference_signals enable row level security;

create policy "preference_signals: owner select"
  on public.preference_signals for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "preference_signals: owner insert"
  on public.preference_signals for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

grant select, insert on table public.preference_signals to authenticated;

alter table public.motivation_profiles enable row level security;

create policy "motivation_profiles: owner select"
  on public.motivation_profiles for select
  to authenticated
  using (profile_id = (select auth.uid()));

grant select on table public.motivation_profiles to authenticated;
