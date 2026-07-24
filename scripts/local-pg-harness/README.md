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
