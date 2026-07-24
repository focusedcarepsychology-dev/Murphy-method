-- Structural verification (docs/IMPLEMENTATION_PLAN.md Phase 2B): confirms
-- the deployed schema actually matches what Phase 2A/2B built, independent
-- of the owner/RLS-behaviour assertions in every other file in this
-- directory. Runs as part of the same pgTAP suite everywhere that suite
-- runs locally (`supabase test db --local`, the authoritative CI job,
-- .github/workflows/ci.yml) — so there is exactly one implementation of
-- these checks, not a duplicate SQL script that could drift from it. See
-- docs/DECISIONS.md's Phase 2B correction-pass entries for why this
-- replaced a standalone scripts/verify-hosted-schema.sql run over a
-- manually-constructed direct Postgres connection: `supabase test db`
-- already solves hosted connectivity (including GitHub Actions' lack of
-- default IPv6 egress, which a hand-built `db.<ref>.supabase.co` URL runs
-- straight into) via the Supabase CLI's own supported connection handling,
-- so reusing it here needs no extra secret and no hand-maintained
-- connection string.
--
-- Also invoked standalone, by path, against the hosted development
-- project (`supabase test db supabase/tests/database/12_hosted_structural_verification.sql
-- --linked`, .github/workflows/deploy-supabase-dev.yml) — deliberately
-- NOT the whole `supabase/tests/database` directory there (see
-- docs/DECISIONS.md's Phase 2B hosted-verification-fix entry): the rest of
-- this directory's suite depends on 00_setup.sql's persistent User A/User
-- B fixtures and assumes a database that gets reset before every run
-- (`supabase db reset --local`), neither of which is true, or safe, to do
-- against the shared hosted development project. This file alone is safe
-- to run standalone against a never-reset hosted project because it is
-- non-destructive and free of application-data mutations: nothing below
-- inserts, updates, or deletes an application row, and it does not
-- reference the 00_setup.sql fixture rows or any other file's data. (It
-- is not literally read-only end to end — `create extension if not
-- exists pgtap` and the `create temporary table` calls below do write,
-- but only pgTAP's own catalog bookkeeping and a session-local temporary
-- table that is dropped when the session ends, never a persistent
-- application table.) Self-contained: installs pgTAP itself (below)
-- rather than assuming 00_setup.sql already ran in this session.
create extension if not exists pgtap with schema extensions;

select plan(271);

-- The one, explicit allowlist of Murphy Method application tables, used by
-- every check below instead of scanning pg_tables directly. This is
-- deliberate: checks 2/4 below need exactly one assertion per expected
-- table regardless of what else might exist in the real `public` schema
-- (a legitimate Supabase/extension-managed object, for instance), so the
-- pgTAP plan() count above stays fixed and deterministic — only check 1
-- (tables_are) is responsible for flagging a missing or unexpected table;
-- checks 2/4 assume this exact set and report per-named-table results
-- against it, not against whatever pg_tables happens to contain.
create temporary table expected_tables (name text primary key);
insert into expected_tables (name) values
  ('audit_logs'), ('body_area_goals'), ('body_area_muscle_map'), ('body_measurements'),
  ('body_scan_images'), ('body_scans'), ('coach_messages'), ('coach_threads'),
  ('consent_records'), ('decision_evidence'), ('equipment'), ('exercise_equipment'),
  ('exercise_feedback'), ('exercise_muscles'), ('exercise_restrictions'),
  ('exercise_substitutions'), ('exercises'), ('goals'), ('health_screenings'),
  ('motivation_profiles'), ('movement_patterns'), ('muscles'),
  ('notification_preferences'), ('notification_responses'), ('notifications'),
  ('pain_reports'), ('performance_metrics'), ('personal_records'),
  ('personal_response_models'), ('preference_signals'), ('profiles'), ('programme_decisions'),
  ('programme_versions'), ('programmes'), ('readiness_entries'), ('scan_quality'),
  ('set_logs'), ('subscriptions'), ('training_blocks'), ('user_equipment'),
  ('user_goals'), ('workout_exercises'), ('workout_feedback'), ('workouts');

-- 1. Exactly the 44 approved tables exist in public — no fewer, no
-- unreviewed extras. tables_are() checks the full set in one assertion,
-- catching both "missing" and "unexpected" in either direction. This is
-- the only check in this file allowed to vary with what's actually in
-- pg_tables; every other check below is driven by expected_tables so an
-- unexpected object (legitimate or not) cannot silently change how many
-- assertions the rest of this file emits.
select tables_are(
  'public',
  array(select name from expected_tables order by name),
  'public schema contains exactly the 44 approved P0 + P1-reserved tables'
);

-- 2. RLS enabled on every one of the 44 expected tables, no exceptions
-- (docs/DATABASE_SCHEMA.md, docs/ARCHITECTURE.md §8). LEFT JOIN (not an
-- inner join against pg_tables) so a table missing entirely still
-- produces a named, failing assertion here too, on top of check 1 above —
-- and, together with the fixed expected_tables row count, guarantees
-- exactly 44 assertions regardless of what else exists in pg_tables.
select ok(
  coalesce(pt.rowsecurity, false),
  format('RLS enabled on public.%s', et.name)
)
from expected_tables et
left join pg_tables pt on pt.schemaname = 'public' and pt.tablename = et.name
order by et.name;

-- 3. Required PostgreSQL functions exist (docs/SUPABASE_SETUP.md /
-- PR #6 description §7).
select has_function('public', 'set_updated_at', 'set_updated_at() exists');
select has_function('public', 'handle_new_user', 'handle_new_user() exists');
select has_function('public', 'handle_new_profile', 'handle_new_profile() exists');

-- 4. service_role has table privileges on every one of the 44 expected
-- tables (Phase 2A correction pass, docs/DECISIONS.md 2026-07-24 entry —
-- bypassrls alone is not sufficient; 20260723091900_service_role_grants.sql
-- must be deployed). The CASE guard (not "exists(...) and
-- has_table_privilege(...)", whose evaluation order Postgres does not
-- guarantee) avoids calling has_table_privilege() on a name that turns
-- out not to be a real table, which would raise `undefined_table` and
-- abort this whole file instead of failing one named assertion.
select ok(
  case
    when exists (select 1 from pg_tables where schemaname = 'public' and tablename = et.name)
      then has_table_privilege('service_role', format('public.%I', et.name), 'SELECT')
    else false
  end,
  format('service_role has SELECT privilege on public.%s', et.name)
)
from expected_tables et
order by et.name;

-- 5. No table grants `anon` any privilege on any public table (Phase 2A
-- decision: stricter than RLS alone — docs/DECISIONS.md). Deliberately
-- scoped to the whole `public` schema, not just expected_tables — unlike
-- checks 2/4, this is a single aggregate count assertion (not one
-- assertion per row), so it has no plan-count-drift risk, and Murphy
-- Method's own stance is that nothing in `public` should be anon-readable
-- at all, not just its own 44 tables.
select is(
  (
    select count(*)::int
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ),
  0,
  'anon has no privileges on any public-schema table'
);

-- 6. Private BodyScan bucket exists and is not public
-- (docs/SUPABASE_SETUP.md §7).
select ok(
  exists(select 1 from storage.buckets where id = 'bodyscans'),
  'bodyscans storage bucket exists'
);
select is(
  (select public from storage.buckets where id = 'bodyscans'),
  false,
  'bodyscans storage bucket is private'
);

-- 7. `authenticated` has exactly the intended raw SQL privileges on every
-- one of the 44 expected tables — no more, no less (Phase 2B
-- hosted-verification-fix correction pass, docs/DECISIONS.md). This is the
-- gap that let GitHub Actions run 30094254573 fail: every migration
-- already declares its intended `grant ... to authenticated` per table,
-- but on the real hosted platform that declaration is additive on top of
-- an unreviewed, broader platform-provisioning baseline (the
-- `authenticated` counterpart of the `anon` gap check 5 above already
-- guards), so a raw grant a migration never asked for (observed: UPDATE on
-- five immutable/append-only tables) can silently survive deployment. RLS
-- itself was not the failure here (none of those UPDATEs mutated a row —
-- each has no UPDATE policy for `authenticated`), but this repo's stance,
-- consistent with check 5, is that the raw grant must match intent
-- exactly as a defense-in-depth layer independent of RLS, not merely rely
-- on RLS to silently swallow an unintended write.
--
-- The matrix below is not this file inventing new intent — it is a literal
-- transcription of the per-table `grant ... to authenticated` statement
-- already present in that table's own migration (cross-check:
-- supabase/migrations/20260724070000_revoke_authenticated_default_table_grants.sql
-- restates this identical matrix as the corrective revoke+grant). Kept
-- explicit and reviewable here, one row per table, rather than computed
-- from whatever `information_schema.role_table_grants` currently reports —
-- the whole point is to fail when the live grants and this file's stated
-- intent diverge, so the intent side must not be allowed to just mirror
-- reality back at itself.
create temporary table expected_authenticated_privileges (
  name text primary key,
  can_select boolean not null,
  can_insert boolean not null,
  can_update boolean not null,
  can_delete boolean not null
);
insert into expected_authenticated_privileges (name, can_select, can_insert, can_update, can_delete) values
  ('audit_logs',                true,  true,  false, false),
  ('body_area_goals',           true,  true,  true,  true),
  ('body_area_muscle_map',      true,  false, false, false),
  ('body_measurements',         true,  true,  true,  true),
  ('body_scan_images',          true,  true,  false, true),
  ('body_scans',                true,  true,  false, true),
  ('coach_messages',            true,  true,  false, false),
  ('coach_threads',             true,  true,  true,  false),
  ('consent_records',           true,  true,  false, false),
  ('decision_evidence',         true,  true,  false, false),
  ('equipment',                 true,  false, false, false),
  ('exercise_equipment',        true,  false, false, false),
  ('exercise_feedback',         true,  true,  false, false),
  ('exercise_muscles',          true,  false, false, false),
  ('exercise_restrictions',     true,  false, false, false),
  ('exercise_substitutions',    true,  false, false, false),
  ('exercises',                 true,  false, false, false),
  ('goals',                     true,  false, false, false),
  ('health_screenings',         true,  true,  false, false),
  ('motivation_profiles',       true,  false, false, false),
  ('movement_patterns',         true,  false, false, false),
  ('muscles',                   true,  false, false, false),
  ('notification_preferences',  true,  false, true,  false),
  ('notification_responses',    true,  true,  false, false),
  ('notifications',             true,  false, false, false),
  ('pain_reports',               true,  true,  false, false),
  ('performance_metrics',       true,  false, false, false),
  ('personal_records',          true,  true,  false, false),
  ('personal_response_models',  true,  false, false, false),
  ('preference_signals',        true,  true,  false, false),
  ('profiles',                  true,  true,  true,  false),
  ('programme_decisions',       true,  true,  false, false),
  ('programme_versions',        true,  true,  false, false),
  ('programmes',                true,  true,  true,  false),
  ('readiness_entries',         true,  true,  true,  false),
  ('scan_quality',              true,  false, false, false),
  ('set_logs',                  true,  true,  true,  true),
  ('subscriptions',             true,  false, false, false),
  ('training_blocks',           true,  true,  false, false),
  ('user_equipment',            true,  true,  true,  true),
  ('user_goals',                true,  true,  true,  true),
  ('workout_exercises',         true,  true,  true,  false),
  ('workout_feedback',          true,  true,  false, false),
  ('workouts',                  true,  true,  true,  false);

select ok(
  case
    when exists (select 1 from pg_tables where schemaname = 'public' and tablename = eap.name)
      then has_table_privilege('authenticated', format('public.%I', eap.name), 'SELECT') = eap.can_select
    else false
  end,
  format('authenticated SELECT privilege on public.%s matches intent (expected %s)', eap.name, eap.can_select)
)
from expected_authenticated_privileges eap
order by eap.name;

select ok(
  case
    when exists (select 1 from pg_tables where schemaname = 'public' and tablename = eap.name)
      then has_table_privilege('authenticated', format('public.%I', eap.name), 'INSERT') = eap.can_insert
    else false
  end,
  format('authenticated INSERT privilege on public.%s matches intent (expected %s)', eap.name, eap.can_insert)
)
from expected_authenticated_privileges eap
order by eap.name;

select ok(
  case
    when exists (select 1 from pg_tables where schemaname = 'public' and tablename = eap.name)
      then has_table_privilege('authenticated', format('public.%I', eap.name), 'UPDATE') = eap.can_update
    else false
  end,
  format('authenticated UPDATE privilege on public.%s matches intent (expected %s)', eap.name, eap.can_update)
)
from expected_authenticated_privileges eap
order by eap.name;

select ok(
  case
    when exists (select 1 from pg_tables where schemaname = 'public' and tablename = eap.name)
      then has_table_privilege('authenticated', format('public.%I', eap.name), 'DELETE') = eap.can_delete
    else false
  end,
  format('authenticated DELETE privilege on public.%s matches intent (expected %s)', eap.name, eap.can_delete)
)
from expected_authenticated_privileges eap
order by eap.name;

select * from finish();
