-- docs/DATABASE_SCHEMA.md §1 `profiles` — 1:1 extension of auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  date_of_birth date,
  -- Exact constrained enum intentionally not fixed here: the precise field
  -- shape (binary vs. broader set, required vs. optional) is an open
  -- product/clinical decision (docs/OPEN_QUESTIONS.md #1), not one this
  -- migration should resolve by guessing. Left as free-form nullable text
  -- until Phase 3 finalises the constraint alongside the Basic Profile
  -- screen, per docs/DECISIONS.md.
  biological_sex text,
  height_cm numeric(5, 1) check (height_cm is null or height_cm > 0),
  unit_preference text not null default 'metric'
    check (unit_preference in ('metric', 'imperial')),
  training_experience text
    check (training_experience is null or training_experience in ('beginner', 'recreational', 'intermediate')),
  available_training_days text[],
  preferred_session_duration_minutes smallint
    check (preferred_session_duration_minutes is null or preferred_session_duration_minutes > 0),
  coaching_style text
    check (
      coaching_style is null
      or coaching_style in ('supportive', 'direct', 'analytical', 'competitive', 'calm_minimal')
    ),
  onboarding_completed_at timestamptz,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth.users identity. Required onboarding fields are nullable at the '
  'database level because the row is created immediately at signup (handle_new_user) '
  'and filled in progressively during onboarding (Phase 3); completeOnboarding '
  '(API_CONTRACTS.md §2) is what enforces "all required fields present" before '
  'setting onboarding_completed_at, not a NOT NULL constraint here.';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: owner select"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: owner insert"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "profiles: owner update"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy for the authenticated client role: a profile is only
-- ever removed via the `on delete cascade` from `auth.users` (account
-- deletion, docs/DATABASE_SCHEMA.md §20), never a direct client delete.
grant select, insert, update on table public.profiles to authenticated;

-- docs/API_CONTRACTS.md §2 "safe profile creation after auth signup" —
-- security definer so it can insert into public.profiles on behalf of a
-- brand-new auth.users row the calling (anon, pre-session) context has no
-- direct grant on. Fixed, empty search_path + fully qualified identifiers
-- close the standard search-path-hijack hole for security definer
-- functions; this function does the minimum possible (one insert, no
-- dynamic SQL, no broader grants) to avoid becoming a privilege-escalation
-- path itself.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
