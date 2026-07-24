-- docs/DATABASE_SCHEMA.md §13 Notifications.
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  workout_reminders_enabled boolean not null default true,
  missed_start_nudges_enabled boolean not null default true,
  progress_notifications_enabled boolean not null default true,
  bodyscan_reminders_enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  preferred_reminder_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- docs/API_CONTRACTS.md §2 "safe profile creation after auth signup":
-- notification_preferences gets its default row at profile-creation time
-- (docs/DATABASE_SCHEMA.md §13), chained off the profiles insert rather
-- than duplicating the auth.users trigger, so this table's default-row
-- creation lives with the table it belongs to.
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_preferences (profile_id)
  values (new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_profile() from public, anon, authenticated;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null check (
    notification_type in ('workout_reminder', 'missed_start', 'progress', 'bodyscan_due')
  ),
  payload jsonb not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is
  'Read-only to the client; written by server-side scheduling jobs (docs/DATABASE_SCHEMA.md §13).';

create index notifications_profile_scheduled_idx on public.notifications (profile_id, scheduled_for);

create table public.notification_responses (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  response_type text not null check (
    response_type in ('opened', 'started_workout', 'quick', 'rescheduled', 'skipped', 'dismissed')
  ),
  responded_at timestamptz not null default now()
);

create index notification_responses_notification_idx on public.notification_responses (notification_id);

-- RLS ---------------------------------------------------------------------

alter table public.notification_preferences enable row level security;

create policy "notification_preferences: owner select"
  on public.notification_preferences for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "notification_preferences: owner update"
  on public.notification_preferences for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- No insert grant: the default row is created by the on_profile_created
-- trigger above, not by a direct client insert.
grant select, update on table public.notification_preferences to authenticated;

alter table public.notifications enable row level security;

create policy "notifications: owner select"
  on public.notifications for select
  to authenticated
  using (profile_id = (select auth.uid()));

grant select on table public.notifications to authenticated;

alter table public.notification_responses enable row level security;

create policy "notification_responses: owner select"
  on public.notification_responses for select
  to authenticated
  using (
    exists (
      select 1 from public.notifications n
      where n.id = notification_responses.notification_id
        and n.profile_id = (select auth.uid())
    )
  );

create policy "notification_responses: owner insert"
  on public.notification_responses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.notifications n
      where n.id = notification_responses.notification_id
        and n.profile_id = (select auth.uid())
    )
  );

grant select, insert on table public.notification_responses to authenticated;
