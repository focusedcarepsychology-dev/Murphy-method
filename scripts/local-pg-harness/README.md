# Local Postgres harness (sandbox-only, not part of the Supabase project)

Docker is unavailable in the Claude Code cloud sandbox this Phase 2A branch
was developed in, so the real `supabase start` stack (GoTrue, PostgREST,
Storage API, Studio) cannot run here. A bare PostgreSQL 16 server _is_
available in that sandbox, so this directory contains a minimal, honest
stand-in for the two pieces of Supabase-managed schema that the real
migrations under `supabase/migrations/` assume already exist on any real
Supabase project:

**Known limitation — PostgreSQL version mismatch.** `supabase/config.toml`
pins `major_version = 17` (the real local/hosted Supabase stack runs
Postgres 17); this sandbox only has PostgreSQL 16.13 available via `apt`
(no PGDG repository reachable to install 17), so this harness runs on 16.
This was directly responsible for one real CI failure this phase (a
Postgres-17-only Storage safety trigger, `storage.protect_delete`, that
this harness did not reproduce until this correction pass — see the
`storage.protect_delete` function below). Treat any harness result as a
fast, supplementary signal only; `supabase test db --local` against the
real stack (`.github/workflows/ci.yml`'s `database` job) is the
authoritative result, precisely because gaps like this one are only
guaranteed to surface there.

- `auth.users` + `auth.uid()` (Supabase Auth's own schema/session function)
- `storage.buckets` + `storage.objects` + `storage.foldername()` (Supabase
  Storage's own schema)

**This is not a copy of Supabase's implementation** — it is the smallest
set of primitives (a users table for the FK, a `uid()` function reading a
session-local setting, an objects table with the one helper function the
BodyScan storage policies call) needed to let the exact same migration SQL
that ships to a real Supabase project run against plain PostgreSQL and have
its RLS policies actually evaluated, so this phase's RLS claims are
verified by execution, not just by reading the SQL.

**Known limitation — `service_role` grant provisioning.** This harness's
`alter default privileges ... grant ... to service_role` block (below)
reproduces the assumption that the Supabase platform grants `service_role`
full table access automatically at project-provisioning time. That
assumption was wrong for this project's own migrations against the real
local stack (CI run 30052333327 — every `service_role` write in
`supabase/tests/database/11_privileged_service_role.sql` came back
"permission denied"), so `supabase/migrations/20260723091900_service_role_grants.sql`
now grants `service_role` explicitly instead of relying on platform
provisioning. That migration also satisfies this harness's default
privileges, so the harness passing is no longer contingent on this file's
separate (now redundant, but left in place as defence-in-depth for a bare
Postgres target) grant.

**Known limitation — `anon` default table-privilege provisioning (NOT
reproduced here, unlike the two gaps above).** Real CI (run 30079837109,
database job) found that the real Supabase local stack grants `anon` 132
unrevoked table privileges across `public` (44 tables × 3 privilege types
— SELECT/INSERT/UPDATE) that no migration in this repo ever explicitly
granted, so `supabase/tests/database/12_hosted_structural_verification.sql`'s
anon-grants-count assertion failed there while passing here (this harness
never granted `anon` anything beyond `USAGE` on the schema, so it had
zero such grants to begin with — the opposite of the real stack's
problem, not an equivalent one). Unlike the `service_role` and
`protect_delete` gaps above, this one was **not** reproduced in this
harness: an attempt to reproduce it with a blanket
`alter default privileges ... grant ... to anon` was tried and reverted,
because it applied the grant uniformly to every table created afterward
by this harness's single connecting role — including the four reference
tables (`goals`, `exercises`, `equipment`, `movement_patterns`), whose own
`supabase/tests/database/01_reference_tables.sql` assertions
(`anon cannot select from goals`, expecting a genuine `42501`) passed on
the _real_ stack in the same CI run, proving the real mechanism is not a
uniform "every table, every role that creates it" default — something
more selective is happening on the real platform (Supabase's own
role/Data-API provisioning, not anything in `supabase/migrations/`) that
this sandbox cannot inspect directly (no Docker, no hosted project). The
fix for the actual security requirement
(`supabase/migrations/20260724060000_revoke_anon_default_table_grants.sql`,
an unconditional `revoke ... from anon` per table — correct regardless of
which mechanism granted the privilege in the first place) does not depend
on understanding that mechanism precisely, but this harness cannot yet
verify it did so correctly; only `supabase test db --local`/`--linked`
against the real stack can. Documented here rather than silently claiming
false parity.

**Never apply anything in this directory to a real Supabase project.** It
is sandbox/CI-verification tooling only, applied _before_ the real
migrations when standing up the local harness database, and is deliberately
kept outside `supabase/migrations/` so it can never be picked up by
`supabase db push`/`supabase migration up` against a real project (which
already has real `auth`/`storage` schemas and would reject or conflict with
this).

The authoritative, Supabase-supported test path is `supabase/tests/database`
(pgTAP), run via `supabase test db` against the real local stack in CI
(`.github/workflows/ci.yml`), where Docker is available. This harness is a
supplementary, already-executed verification for environments where Docker
is not available — see `docs/SUPABASE_SETUP.md` and the Phase 2A PR
description for exactly what was run where.

## Usage

```sh
sudo service postgresql start
createdb murphy_method_harness
psql -d murphy_method_harness -f scripts/local-pg-harness/00_auth_storage_shim.sql
for f in supabase/migrations/*.sql; do psql -d murphy_method_harness -v ON_ERROR_STOP=1 -f "$f"; done
psql -d murphy_method_harness -f scripts/local-pg-harness/01_rls_smoke_test.sql
```
