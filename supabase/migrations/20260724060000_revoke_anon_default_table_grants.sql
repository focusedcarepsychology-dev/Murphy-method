-- Phase 2B correction pass (real CI run 30079837109, database job
-- 89438662438, supabase/tests/database/12_hosted_structural_verification.sql
-- assertion 93): the real Supabase local/hosted stack's own project
-- provisioning grants `anon` unrevoked privileges on every public-schema
-- table (132 grants found across the 44 tables this project's own
-- migrations create — 44 tables × 3 privilege types) that no migration in
-- this repository ever explicitly granted. `docs/DECISIONS.md`'s Phase 2A
-- entry already states the intended design — "no table grants anon any
-- privilege at all on a private table," enforced at the Postgres
-- privilege-check level, not just by RLS — but that claim was never
-- actually verified at the raw-GRANT level against the real stack until
-- this correction pass added that check; RLS itself was already correctly
-- blocking anon's actual data access (which is why this went unnoticed:
-- no data was ever exposed), but the additional privilege-level guarantee
-- the design calls for was not in place.
--
-- This revoke is unconditional and covers every one of this project's
-- tables regardless of which of them happened to receive the platform's
-- default grant (the exact mechanism was not fully determined — see
-- scripts/local-pg-harness/README.md's "anon default table-privilege
-- provisioning" entry for what was and wasn't established) — a REVOKE is
-- a safe no-op on any table that never had the grant in the first place,
-- so this does not need to depend on knowing the precise cause.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Defense-in-depth for any future migration that creates a new table
-- under this same connecting role without its own explicit anon-facing
-- grants — mirrors the equivalent `alter default privileges` pairing
-- `20260723091900_service_role_grants.sql` already uses for service_role.
-- (Whether this specific statement is what's needed to counter the real
-- platform's own default-privilege mechanism is not established — see the
-- harness README note above — but it is harmless to include regardless.)
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
