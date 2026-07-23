-- docs/DATABASE_SCHEMA.md §4 `health_screenings` — immutable per submission.
create table public.health_screenings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  responses jsonb not null,
  screening_version text not null,
  requires_clearance boolean not null default false,
  restriction_flags text[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.health_screenings is
  'Immutable per submission — a re-screen inserts a new row. `requires_clearance` and '
  '`restriction_flags` are derived fields written by the server-side function that '
  'processes a submission (docs/DATABASE_SCHEMA.md §4), not directly settable by the '
  'client beyond their insert-time default — enforced here by leaving them out of the '
  'client insert path in practice (API_CONTRACTS.md), with the column defaults acting '
  'as the safe fallback if a client insert omits them.';

create index health_screenings_profile_created_idx
  on public.health_screenings (profile_id, created_at desc);

alter table public.health_screenings enable row level security;

create policy "health_screenings: owner select"
  on public.health_screenings for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "health_screenings: owner insert"
  on public.health_screenings for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

-- Insert-only for the authenticated client role: no update/delete grant,
-- matching the immutable/audit-trail requirement.
grant select, insert on table public.health_screenings to authenticated;
