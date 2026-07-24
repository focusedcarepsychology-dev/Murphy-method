-- Phase 2B hosted-verification-fix correction pass: narrow cleanup for
-- pgTAP fixture/test data left in the hosted DEVELOPMENT Supabase project
-- by the two `supabase test db --linked` runs
-- (GitHub Actions runs 30094181154 and 30094254573) that executed the
-- FULL `supabase/tests/database/` suite against it before this correction
-- pass restricted hosted post-deploy verification to the read-only
-- 12_hosted_structural_verification.sql file only
-- (.github/workflows/deploy-supabase-dev.yml).
--
-- WHAT HAPPENED AND WHY THIS SCRIPT IS SAFE / NARROW
-- ---------------------------------------------------
-- `supabase/tests/database/00_setup.sql` inserts two fixture identities —
-- User A (a0000000-0000-4000-8000-000000000001) and User B
-- (a0000000-0000-4000-8000-000000000002) — directly into `auth.users`,
-- deliberately NOT wrapped in a rolled-back transaction (see that file's
-- own comment: every later file in the suite needs them to exist). Every
-- other file in the suite (01 through 11) then reads/writes data as those
-- two users inside explicit `begin; ... commit;` blocks used only to
-- scope `set local role` / `set local request.jwt.claim.sub` per test —
-- not to roll anything back. Against the real local stack this is
-- harmless because `.github/workflows/ci.yml`'s `database` job always
-- runs `supabase db reset --local` first, on a throwaway database, before
-- `supabase test db --local`. The hosted development project is never
-- reset (`supabase db reset --linked` is explicitly out of scope for this
-- correction pass — the real project already has real migration history),
-- so those two runs committed real rows there.
--
-- Every application table below reaches `public.profiles` (and from there
-- `auth.users`) through an unbroken chain of `references ... on delete
-- cascade` foreign keys (verified against every migration in
-- supabase/migrations/ during this correction pass — see
-- docs/DECISIONS.md's Phase 2B hosted-verification-fix entry for the full
-- chain), so deleting the two fixture `auth.users` rows is sufficient on
-- its own to remove every row those two identities own, across every
-- table, without this script needing to name each table individually or
-- risk missing one. This script is scoped to exactly those two hardcoded
-- UUIDs — it does not touch any other row, and this is a real, new
-- development project with no other users, so there is no ambiguity about
-- what is and isn't "known test fixture data."
--
-- Two exceptions, handled explicitly below because they are NOT owned by
-- either fixture profile and so do NOT cascade from the auth.users delete:
--
-- 1. `storage.objects` — the BodyScan test in
--    `supabase/tests/database/08_bodyscan.sql` inserts and then explicitly
--    deletes its own storage.objects row within that same file (both the
--    happy-path delete and the orphan-file-safety-net delete), so no
--    residual row is expected there for either fixture user — included
--    below only as a defensive, narrowly-scoped verification/cleanup, not
--    because contamination is expected.
--
-- 2. Reference-table (`public.exercises`) test rows — three files insert
--    a test exercise row that is NOT scoped to a profile_id at all
--    (content-pipeline/reference data), identified by their exact,
--    hardcoded test slugs:
--      - 'rls-test-squat'                 (05_workouts.sql, `on conflict (slug) do nothing`)
--      - 'rls-test-squat-feedback'         (06_feedback.sql, `on conflict (slug) do nothing`)
--      - 'rls-test-service-role-exercise'  (11_privileged_service_role.sql, plain insert)
--    Deleted below by exact slug match only — never a wildcard/pattern
--    match against the real exercise catalog.
--
-- HOW TO RUN
-- ----------
-- This script is NOT executed by Claude and is NOT wired into any
-- workflow — per this correction pass's constraints, nothing is deployed
-- or mutated on the hosted project from this session. A human with access
-- reviews this script and runs it manually against the hosted development
-- project (Supabase Dashboard SQL Editor, or
-- `psql "$(supabase db url --project-ref <ref> --linked)" -f scripts/cleanup-hosted-test-fixtures.sql`),
-- after independently confirming the two fixture identities and three
-- exercise slugs below are still exactly what's expected (the verification
-- queries at the top and bottom of this script are for that purpose — run
-- them, read the output, THEN run the deletes).
--
-- This script is idempotent: every DELETE is already scoped to specific,
-- known keys, so running it again after the data is already gone is a
-- safe no-op (0 rows affected), not an error.

\echo '--- BEFORE: rows currently attributable to the two pgTAP fixture identities ---'

select 'auth.users' as source, count(*) from auth.users
  where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
union all
select 'public.profiles', count(*) from public.profiles
  where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
union all
select 'storage.objects (bodyscans, fixture-owned path)', count(*) from storage.objects
  where bucket_id = 'bodyscans'
    and (storage.foldername(name))[1] in (
      'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'
    )
union all
select 'public.exercises (known test slugs)', count(*) from public.exercises
  where slug in ('rls-test-squat', 'rls-test-squat-feedback', 'rls-test-service-role-exercise');

-- Deleting the two fixture auth.users rows cascades through profiles and
-- every table that ultimately references profiles.id ON DELETE CASCADE
-- (directly or transitively) — this is the one statement that removes the
-- overwhelming majority of fixture data.
delete from auth.users
  where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

-- Defensive/verification only — expected to already be 0 rows (see note
-- above on why 08_bodyscan.sql self-cleans). Requires
-- storage.allow_delete_query, matching the same safety gate the Storage
-- API itself sets before any direct-SQL delete against storage.objects
-- (supabase/scripts/local-pg-harness/00_auth_storage_shim.sql reproduces
-- the same real-stack trigger this respects).
set local storage.allow_delete_query = true;
delete from storage.objects
  where bucket_id = 'bodyscans'
    and (storage.foldername(name))[1] in (
      'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'
    );

-- Known reference-table test rows, matched by exact slug only.
delete from public.exercises
  where slug in ('rls-test-squat', 'rls-test-squat-feedback', 'rls-test-service-role-exercise');

\echo '--- AFTER: should be all zeros ---'

select 'auth.users' as source, count(*) from auth.users
  where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
union all
select 'public.profiles', count(*) from public.profiles
  where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
union all
select 'storage.objects (bodyscans, fixture-owned path)', count(*) from storage.objects
  where bucket_id = 'bodyscans'
    and (storage.foldername(name))[1] in (
      'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'
    )
union all
select 'public.exercises (known test slugs)', count(*) from public.exercises
  where slug in ('rls-test-squat', 'rls-test-squat-feedback', 'rls-test-service-role-exercise');
