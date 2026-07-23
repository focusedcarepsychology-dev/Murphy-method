# Local Postgres harness (sandbox-only, not part of the Supabase project)

Docker is unavailable in the Claude Code cloud sandbox this Phase 2A branch
was developed in, so the real `supabase start` stack (GoTrue, PostgREST,
Storage API, Studio) cannot run here. A bare PostgreSQL 16 server _is_
available in that sandbox, so this directory contains a minimal, honest
stand-in for the two pieces of Supabase-managed schema that the real
migrations under `supabase/migrations/` assume already exist on any real
Supabase project:

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
