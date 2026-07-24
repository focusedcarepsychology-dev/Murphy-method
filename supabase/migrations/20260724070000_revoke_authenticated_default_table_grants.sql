-- Phase 2B hosted-verification correction pass (GitHub Actions run
-- 30094254573, job 89485692741, `supabase test db --linked` against the
-- real hosted **development** project). Result: FAIL, Files=13, Tests=241,
-- 5 failed assertions across 4 files — every one a `throws_ok(..., '42501')`
-- expecting an UPDATE by `authenticated` to be rejected at the raw-grant
-- level ("insufficient_privilege") that instead reported "caught: no
-- exception":
--   02_profiles_and_consent.sql #5   consent_records    (immutable)
--   04_health_safety.sql        #3   health_screenings  (immutable)
--   04_health_safety.sql        #6   pain_reports        (immutable)
--   07_measurements.sql         #6   personal_records    (append-only)
--   10_notifications_..._audit.sql #11 audit_logs        (immutable)
--
-- This is the `authenticated`-role counterpart of the gap already fixed
-- for `anon` in 20260724060000_revoke_anon_default_table_grants.sql: the
-- real Supabase platform's project-provisioning step sets `public`-schema
-- default privileges that hand every new table broader baseline access
-- than this project ever asked for (confirmed by the `anon` case; the
-- exact provisioning mechanism is Supabase's own, not anything in this
-- repo's migrations — see that migration's comment and
-- scripts/local-pg-harness/README.md's "anon default table-privilege
-- provisioning" note for what was and wasn't established there). Every
-- migration in this repo already declares the intended narrow grant per
-- table (e.g. `grant select, insert on table public.audit_logs to
-- authenticated;`), but `GRANT` is additive — it can only add privileges,
-- never remove ones a broader platform default already conferred, so
-- those narrow declarations were never actually narrowing anything on the
-- real hosted project. RLS itself was already correctly blocking the
-- underlying row access in every one of these cases (each failing UPDATE
-- affected zero rows — none of these five tables has an UPDATE policy for
-- `authenticated`), so no data was ever mutated; what was missing is the
-- raw-grant-level guarantee the design calls for (a client UPDATE should
-- fail loudly with `insufficient_privilege`, not silently no-op), the same
-- defense-in-depth-beyond-RLS stance already taken for `anon`.
--
-- Fix, mirroring the `anon` migration's shape: revoke the unknown
-- platform-granted baseline from `authenticated` on every table (a REVOKE
-- is a safe no-op wherever the platform default didn't apply), then
-- explicitly re-grant, table by table, exactly the privileges every other
-- migration in this repo already declared as intended for `authenticated`
-- — this is not a new privilege decision, it is the existing 44-table
-- contract (docs/DATABASE_SCHEMA.md §19 RLS Test Matrix) restated so it
-- actually holds at the Postgres grant level on a real hosted project, not
-- only on the sandbox harness that never had the broader baseline to
-- begin with (scripts/local-pg-harness/00_auth_storage_shim.sql grants
-- `authenticated` nothing beyond schema `USAGE`, which is why this gap was
-- invisible there and in the harness-only signal, and was only caught by
-- `supabase test db --linked` against the real project as intended).
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;

-- profiles (docs/DATABASE_SCHEMA.md §1) — no delete: removed only via
-- auth.users cascade, never a direct client delete.
grant select, insert, update on table public.profiles to authenticated;

-- consent_records (§1) — immutable, append-only.
grant select, insert on table public.consent_records to authenticated;

-- goals (§2) — reference table, read-only to the client.
grant select on table public.goals to authenticated;
-- user_goals (§2) — user-writable.
grant select, insert, update, delete on table public.user_goals to authenticated;
-- body_area_muscle_map (§2) — reference table, read-only to the client.
grant select on table public.body_area_muscle_map to authenticated;
-- body_area_goals (§2) — user-writable.
grant select, insert, update, delete on table public.body_area_goals to authenticated;

-- equipment (§3) — reference table, read-only to the client.
grant select on table public.equipment to authenticated;
-- user_equipment (§3) — user-writable.
grant select, insert, update, delete on table public.user_equipment to authenticated;

-- health_screenings (§4) — immutable per submission.
grant select, insert on table public.health_screenings to authenticated;

-- exercise_ontology (§5) — reference tables, read-only to the client.
grant select on table public.muscles to authenticated;
grant select on table public.movement_patterns to authenticated;
grant select on table public.exercises to authenticated;
grant select on table public.exercise_muscles to authenticated;
grant select on table public.exercise_equipment to authenticated;
grant select on table public.exercise_substitutions to authenticated;
grant select on table public.exercise_restrictions to authenticated;

-- programme (§6) — programmes/programme_versions get a bounded amend path,
-- the decision trail is append-only.
grant select, insert, update on table public.programmes to authenticated;
grant select, insert on table public.programme_versions to authenticated;
grant select, insert on table public.training_blocks to authenticated;
grant select, insert on table public.programme_decisions to authenticated;
grant select, insert on table public.decision_evidence to authenticated;

-- workouts (§7) — session logging, edited in-session; set_logs fully
-- user-writable including delete (correcting a logged set).
grant select, insert, update on table public.workouts to authenticated;
grant select, insert, update on table public.workout_exercises to authenticated;
grant select, insert, update, delete on table public.set_logs to authenticated;

-- feedback & safety events (§8) — feedback/pain reports are append-only;
-- readiness_entries allow same-day amendment.
grant select, insert on table public.exercise_feedback to authenticated;
grant select, insert on table public.workout_feedback to authenticated;
grant select, insert on table public.pain_reports to authenticated;
grant select, insert, update on table public.readiness_entries to authenticated;

-- measurements_performance (§9) — body_measurements fully user-writable;
-- performance_metrics is server-job-only (select only); personal_records
-- is append-only (no update/delete once achieved).
grant select, insert, update, delete on table public.body_measurements to authenticated;
grant select on table public.performance_metrics to authenticated;
grant select, insert on table public.personal_records to authenticated;

-- bodyscan (§10) — scans/images are client-deletable but not editable
-- once captured; scan_quality is derived/server-written (select only).
grant select, insert, delete on table public.body_scans to authenticated;
grant select, insert, delete on table public.body_scan_images to authenticated;
grant select on table public.scan_quality to authenticated;

-- personal response model (§11) — models/profiles are server-derived
-- (select only); preference_signals is client-append-only.
grant select on table public.personal_response_models to authenticated;
grant select, insert on table public.preference_signals to authenticated;
grant select on table public.motivation_profiles to authenticated;

-- coach (§12) — threads can be renamed/archived by their owner; messages
-- are append-only once sent.
grant select, insert, update on table public.coach_threads to authenticated;
grant select, insert on table public.coach_messages to authenticated;

-- notifications (§13) — preferences are user-editable but only ever
-- trigger-inserted (no client insert); notifications/responses are
-- server-written and client-append-only respectively.
grant select, update on table public.notification_preferences to authenticated;
grant select on table public.notifications to authenticated;
grant select, insert on table public.notification_responses to authenticated;

-- subscriptions (§14) — server/webhook-written, read-only to the client.
grant select on table public.subscriptions to authenticated;

-- audit_logs (§15) — immutable, insert-only.
grant select, insert on table public.audit_logs to authenticated;

-- Defense-in-depth for any future migration that creates a new table
-- without its own explicit `authenticated`-facing grant: leaves
-- `authenticated` with zero default access to it (an explicit grant is
-- always required, mirroring the `anon` migration's equivalent pairing)
-- rather than silently inheriting whatever the platform's own baseline
-- happens to be.
alter default privileges in schema public revoke all on tables from authenticated;
alter default privileges in schema public revoke all on sequences from authenticated;
