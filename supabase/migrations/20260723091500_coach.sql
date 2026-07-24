-- docs/DATABASE_SCHEMA.md §12 Coach.
create table public.coach_threads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_coach_threads_updated_at
  before update on public.coach_threads
  for each row execute function public.set_updated_at();

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.coach_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system_context')),
  content text not null,
  structured_context_snapshot jsonb,
  model_version text,
  created_at timestamptz not null default now(),
  check (role = 'assistant' or model_version is null)
);

comment on table public.coach_messages is
  'Conversational history only — never the source of truth for user state '
  '(docs/MASTER_SPEC.md §20). model_version is only ever set on assistant rows.';

create index coach_messages_thread_created_idx on public.coach_messages (thread_id, created_at);

-- RLS ---------------------------------------------------------------------

alter table public.coach_threads enable row level security;

create policy "coach_threads: owner select"
  on public.coach_threads for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "coach_threads: owner insert"
  on public.coach_threads for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "coach_threads: owner update"
  on public.coach_threads for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

grant select, insert, update on table public.coach_threads to authenticated;

alter table public.coach_messages enable row level security;

create policy "coach_messages: owner select"
  on public.coach_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_threads ct
      where ct.id = coach_messages.thread_id
        and ct.profile_id = (select auth.uid())
    )
  );

create policy "coach_messages: owner insert"
  on public.coach_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.coach_threads ct
      where ct.id = coach_messages.thread_id
        and ct.profile_id = (select auth.uid())
    )
  );

grant select, insert on table public.coach_messages to authenticated;
