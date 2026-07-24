-- Sandbox-only harness. See README.md in this directory — never apply this
-- to a real Supabase project. Run BEFORE supabase/migrations/*.sql against
-- a scratch local database.

-- Roles Supabase provisions on every real project. `service_role` gets
-- `bypassrls` for real, matching Supabase's actual role setup (this is
-- what lets a privileged Edge Function ignore RLS without needing its own
-- policy on every table).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant usage on sequences to anon, authenticated, service_role;

-- On a real Supabase project, `service_role` gets full table access via
-- platform-level default privileges set up at project provisioning time
-- (never written into application migrations). `bypassrls` above only
-- bypasses row-level security policies, not ordinary GRANT-based
-- permission checks, so without this the harness would (incorrectly) deny
-- service_role table access entirely — this reproduces the missing
-- platform-provisioning step, scoped to objects this harness role (the
-- one running the migrations) creates from here on.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

-- Supabase provisions this schema (and enables extensions into it, e.g.
-- pgcrypto) on every real project before any application migration runs;
-- the harness reproduces just the empty schema so the extensions
-- migration's `create extension ... with schema extensions` succeeds here.
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

-- Every real Supabase project puts `extensions` on the default
-- `search_path` (alongside `public`) precisely so `create extension x with
-- schema extensions` (as this project's own migrations and
-- `supabase/tests/database/00_setup.sql`'s pgtap install do) still resolves
-- unqualified calls like `plan(2)`/`auth.uid()`'s pgcrypto dependencies.
-- Without this, pgtap's own functions are only reachable as
-- `extensions.plan(...)`, which is not what any real Supabase project or
-- this repo's own test files assume.
do $$
begin
  execute format('alter database %I set search_path = public, extensions', current_database());
end
$$;

-- Minimal auth schema: only what the migrations' FKs and RLS policies
-- actually reference (auth.users.id, auth.uid()). Not a copy of Supabase
-- Auth's real schema.
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now()
);

-- Mirrors Supabase's real auth.uid(): reads the `sub` claim off the
-- request-local setting a real PostgREST request would populate from the
-- verified JWT. The RLS smoke test below sets this per-session via
-- `set local request.jwt.claim.sub = '<uuid>'` to simulate "signed in as
-- this user", and clears it (or opens a fresh session) to simulate
-- unauthenticated.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Minimal storage schema: only what the BodyScan bucket/policies
-- reference (storage.buckets, storage.objects, storage.foldername()).
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

-- Matches the real `storage.foldername`'s contract: the path segments
-- before the filename, e.g. 'user-id/scan-id/image-id.jpg' -> {user-id,scan-id}.
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  _parts text[];
begin
  _parts := string_to_array(name, '/');
  return _parts[1 : greatest(array_length(_parts, 1) - 1, 0)];
end;
$$;

grant select, insert, update, delete on all tables in schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema auth to anon, authenticated, service_role;

-- CI correction (Phase 2A, GitHub Actions run 30052333327): the real
-- Supabase Storage schema rejects any direct SQL DELETE on
-- `storage.objects` ("Direct deletion from storage tables is not allowed.
-- Use the Storage API instead.") unless the session-local
-- `storage.allow_delete_query` setting is true — a safety net against
-- orphaned files that the harness previously did not reproduce, which let
-- `supabase/tests/database/08_bodyscan.sql`'s direct
-- `delete from storage.objects` statements pass here while failing against
-- the real stack. Reproduced as a statement-level trigger so the harness
-- now catches this class of shim/real divergence itself instead of only
-- discovering it in CI.
create or replace function storage.protect_delete()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('storage.allow_delete_query', true), 'false') <> 'true' then
    raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
      using hint = 'This prevents accidental data loss from orphaned objects.';
  end if;
  return null;
end;
$$;

drop trigger if exists protect_delete on storage.objects;
create trigger protect_delete
  before delete on storage.objects
  for each statement execute function storage.protect_delete();
