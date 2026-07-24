-- docs/DATABASE_SCHEMA.md §3 `equipment` (reference) + `user_equipment`.
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  category text not null check (category in ('free_weight', 'machine', 'bodyweight', 'accessory'))
);

comment on table public.equipment is
  'Reference table. Content-governed: rows are not seeded by this migration '
  '(docs/CLAUDE.md "do not build later phases early" — equipment cataloguing is '
  'content-authoring work, docs/IMPLEMENTATION_PLAN.md Phase 4). Readable by any '
  'authenticated user, writable only by the service role.';

alter table public.equipment enable row level security;

create policy "equipment: authenticated read"
  on public.equipment for select
  to authenticated
  using (true);

grant select on table public.equipment to authenticated;

create table public.user_equipment (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, equipment_id)
);

create trigger set_user_equipment_updated_at
  before update on public.user_equipment
  for each row execute function public.set_updated_at();

alter table public.user_equipment enable row level security;

create policy "user_equipment: owner select"
  on public.user_equipment for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "user_equipment: owner insert"
  on public.user_equipment for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "user_equipment: owner update"
  on public.user_equipment for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "user_equipment: owner delete"
  on public.user_equipment for delete
  to authenticated
  using (profile_id = (select auth.uid()));

grant select, insert, update, delete on table public.user_equipment to authenticated;
