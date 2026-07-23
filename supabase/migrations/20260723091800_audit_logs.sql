-- docs/DATABASE_SCHEMA.md §15 Audit.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  event_type text not null,
  actor text not null check (actor in ('user', 'system', 'admin')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Immutable, insert-only. profile_id is nullable to allow system-level events '
  '(docs/DATABASE_SCHEMA.md §15). No update/delete grant for the authenticated '
  'client role — full-table access beyond a user''s own rows is reserved to the '
  'service role for support/compliance.';

create index audit_logs_profile_created_idx on public.audit_logs (profile_id, created_at desc);
create index audit_logs_event_created_idx on public.audit_logs (event_type, created_at desc);

alter table public.audit_logs enable row level security;

create policy "audit_logs: owner select"
  on public.audit_logs for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "audit_logs: owner insert"
  on public.audit_logs for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

grant select, insert on table public.audit_logs to authenticated;
