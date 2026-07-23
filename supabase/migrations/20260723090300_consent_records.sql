-- docs/DATABASE_SCHEMA.md §1 `consent_records` — immutable, append-only.
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  consent_type text not null
    check (consent_type in ('bodyscan_capture', 'bodyscan_ai_processing', 'data_processing', 'marketing')),
  granted boolean not null,
  version text not null,
  created_at timestamptz not null default now()
);

comment on table public.consent_records is
  'Immutable, append-only. A withdrawn consent is a new row (granted = false), never an update.';

create index consent_records_profile_type_created_idx
  on public.consent_records (profile_id, consent_type, created_at desc);

alter table public.consent_records enable row level security;

create policy "consent_records: owner select"
  on public.consent_records for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "consent_records: owner insert"
  on public.consent_records for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

-- Insert-only: no update/delete grant for the authenticated client role,
-- enforced at the grant level, not just by omitting policies.
grant select, insert on table public.consent_records to authenticated;
