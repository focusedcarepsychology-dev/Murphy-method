-- Hosted schema verification — Murphy Method Phase 2B.
--
-- Purpose: after `supabase db push` deploys supabase/migrations/ to a real
-- hosted project, run this script against that project to confirm the
-- deployed schema actually matches what Phase 2A/2B built and tested
-- locally. This is a structural sanity check, not a replacement for the
-- authoritative 146-assertion pgTAP suite (supabase/tests/database/,
-- docs/SUPABASE_SETUP.md §5) — see docs/PHASE_2B_HOSTED_SETUP.md for how
-- to run that suite against the linked hosted project (`supabase test db
-- --linked`) as a separate, additional step.
--
-- Usage (see .github/workflows/deploy-supabase-dev.yml and
-- docs/PHASE_2B_HOSTED_SETUP.md for the exact invocation):
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/verify-hosted-schema.sql
--
-- Never construct $SUPABASE_DB_URL by hand in a place that would print it —
-- it embeds the database password. Build it from secrets inside CI only,
-- and never `echo`/log it.
--
-- Exit behaviour: raises an exception (non-zero exit code) and prints every
-- failing check if anything is wrong; prints a single NOTICE summary and
-- exits 0 if every check passes.

do $verify$
declare
  expected_tables text[] := array[
    'profiles', 'consent_records', 'goals', 'user_goals', 'body_area_goals',
    'body_area_muscle_map', 'equipment', 'user_equipment',
    'health_screenings', 'muscles', 'movement_patterns', 'exercises',
    'exercise_muscles', 'exercise_equipment', 'exercise_substitutions',
    'exercise_restrictions', 'programmes', 'programme_versions',
    'training_blocks', 'programme_decisions', 'decision_evidence',
    'workouts', 'workout_exercises', 'set_logs', 'exercise_feedback',
    'workout_feedback', 'pain_reports', 'body_measurements',
    'performance_metrics', 'personal_records', 'body_scans',
    'body_scan_images', 'personal_response_models', 'preference_signals',
    'coach_threads', 'coach_messages', 'notification_preferences',
    'notifications', 'notification_responses', 'subscriptions',
    'audit_logs', 'readiness_entries', 'scan_quality', 'motivation_profiles'
  ];
  expected_functions text[] := array[
    'set_updated_at', 'handle_new_user', 'handle_new_profile'
  ];
  failures text[] := array[]::text[];
  missing_tables text[];
  unexpected_tables text[];
  no_rls_tables text[];
  missing_functions text[];
  no_service_role_tables text[];
  unexpected_anon_grants text;
  bucket_public boolean;
  bucket_found boolean;
  table_count int;
begin
  -- 1. Every expected table exists.
  select array_agg(t) into missing_tables
  from unnest(expected_tables) as t
  where not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = t and table_type = 'BASE TABLE'
  );
  if missing_tables is not null then
    failures := failures || format('missing tables: %s', missing_tables);
  end if;

  -- 2. No unexpected extra tables in public (catches an unreviewed migration).
  select array_agg(table_name) into unexpected_tables
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
    and table_name <> all (expected_tables);
  if unexpected_tables is not null then
    failures := failures || format('unexpected tables not in the approved 44: %s', unexpected_tables);
  end if;

  select count(*) into table_count
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE';
  if table_count <> 44 then
    failures := failures || format('expected exactly 44 public tables, found %s', table_count);
  end if;

  -- 3. RLS enabled on every one of the expected tables, no exceptions.
  select array_agg(t) into no_rls_tables
  from unnest(expected_tables) as t
  join pg_tables pt on pt.schemaname = 'public' and pt.tablename = t
  where pt.rowsecurity = false;
  if no_rls_tables is not null then
    failures := failures || format('RLS not enabled on: %s', no_rls_tables);
  end if;

  -- 4. Required PostgreSQL functions exist.
  select array_agg(f) into missing_functions
  from unnest(expected_functions) as f
  where not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f
  );
  if missing_functions is not null then
    failures := failures || format('missing functions: %s', missing_functions);
  end if;

  -- 5. service_role has table privileges (Phase 2A correction pass —
  -- bypassrls alone is not enough; 20260723091900_service_role_grants.sql
  -- must have deployed).
  select array_agg(t) into no_service_role_tables
  from unnest(expected_tables) as t
  where not has_table_privilege('service_role', format('public.%I', t), 'SELECT');
  if no_service_role_tables is not null then
    failures := failures || format('service_role missing SELECT privilege on: %s', no_service_role_tables);
  end if;

  -- 6. No table grants `anon` any privilege on any public table
  -- (Phase 2A decision: stricter than RLS alone — see docs/DECISIONS.md).
  select string_agg(format('%s.%s: %s', table_schema, table_name, privilege_type), ', ')
    into unexpected_anon_grants
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon';
  if unexpected_anon_grants is not null then
    failures := failures || format('unexpected anon grants found: %s', unexpected_anon_grants);
  end if;

  -- 7. Private BodyScan bucket exists and is not public.
  select exists(select 1 from storage.buckets where id = 'bodyscans') into bucket_found;
  if not bucket_found then
    failures := failures || 'bodyscans storage bucket does not exist';
  else
    select public into bucket_public from storage.buckets where id = 'bodyscans';
    if bucket_public then
      failures := failures || 'bodyscans storage bucket is public (must be private)';
    end if;
  end if;

  -- Report.
  if array_length(failures, 1) > 0 then
    raise exception 'HOSTED SCHEMA VERIFICATION FAILED (% check(s)):
%', array_length(failures, 1), array_to_string(failures, E'\n');
  else
    raise notice 'HOSTED SCHEMA VERIFICATION PASSED: 44/44 tables present with RLS enabled, required functions present, service_role privileged, no anon grants on private tables, bodyscans bucket private.';
  end if;
end;
$verify$;
