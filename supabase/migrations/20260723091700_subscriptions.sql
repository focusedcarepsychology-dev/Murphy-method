-- docs/DATABASE_SCHEMA.md §14 Subscriptions.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'premium', 'premium_plus')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'cancelled')),
  provider text,
  provider_reference text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is
  'Read-only to the client; written by a server-side provider-webhook handler '
  '(docs/DATABASE_SCHEMA.md §14) — a client must never be able to set its own tier.';

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "subscriptions: owner select"
  on public.subscriptions for select
  to authenticated
  using (profile_id = (select auth.uid()));

grant select on table public.subscriptions to authenticated;
