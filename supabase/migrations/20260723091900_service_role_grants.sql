-- CI correction (Phase 2A): `supabase test db --local` against the real
-- local Supabase stack failed every `service_role` assertion in
-- `supabase/tests/database/11_privileged_service_role.sql` with
-- "permission denied for table ..." — GitHub Actions run 30052333327, job
-- 89356840526. `service_role` has `bypassrls` (it ignores RLS *policies*),
-- but that is a separate mechanism from ordinary GRANT-based table
-- privileges, and this project's migrations up to this point only ever
-- `grant ... to authenticated`, never `service_role`. Every prior migration
-- assumed the Supabase platform's project-provisioning step grants
-- `service_role` full table access automatically (as documented in
-- `scripts/local-pg-harness/00_auth_storage_shim.sql`, which reproduces
-- that assumption) — the real local CI stack does not extend that
-- provisioning to tables created by this project's own migrations, so the
-- assumption was wrong and the grant must be explicit here instead.
--
-- `service_role` is the Supabase secret/service-role key: used only
-- inside Edge Functions on the server, never shipped to a client, and
-- never reachable via `anon`/`authenticated`. Granting it full access to
-- every table in `public` is therefore not a client-facing privilege
-- escalation — it is the intended shape of the role (RLS Test Matrix,
-- `docs/DATABASE_SCHEMA.md` §19, "privileged server function") and matches
-- what the Supabase platform itself grants by default on a real project.
-- `anon`/`authenticated` grants remain exactly as narrowly scoped as each
-- table's own migration already declared; this migration does not touch
-- them.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Applies the same grant to any table/sequence a later migration creates
-- in this schema, so this fix does not have to be repeated per-migration.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
