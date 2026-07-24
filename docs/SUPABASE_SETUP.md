# Supabase Setup

Status: describes the repository-side Supabase foundation built in
`IMPLEMENTATION_PLAN.md` Phase 2A. No remote Supabase project is connected
yet — that is Phase 2B, once this PR has been reviewed (see §6 below).

## 1. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
  (`npx supabase --version`, or install globally). This repo was developed
  against CLI `2.109.x`+.
- Docker (Docker Desktop, Colima, or another Docker-API-compatible runtime)
  for `supabase start` and `supabase test db`.
- Node 20+ (see `.github/workflows/ci.yml` for the exact CI version).

## 2. Local development commands

```sh
# Start the local stack (Postgres, Auth, Storage, Studio, Inbucket email testing)
npx supabase start

# Apply every migration to a clean local database, then run seed.sql
npx supabase db reset --local

# Generate a new migration file (name it descriptively; see supabase/migrations/
# for the existing naming convention — one file per logical schema change)
npx supabase migration new <description>

# Run the pgTAP RLS/database test suite (supabase/tests/database)
npx supabase test db --local

# Regenerate the typed database contract (src/types/database.ts) from the
# actual local schema — always prefer this over hand-editing the file
npx supabase gen types typescript --local > src/types/database.ts

# Stop the local stack
npx supabase stop
```

`supabase start` prints local connection details, including the anon/
publishable key and API URL — copy those into your local `.env` (see §3).

## 3. Required client environment variables

Copy `.env.example` to `.env` and fill in:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

For local development against `supabase start`, `EXPO_PUBLIC_SUPABASE_URL`
is `http://127.0.0.1:54321` and the publishable/anon key is printed by
`supabase start` (also visible via `supabase status`).

**Never add to this list, or to any `EXPO_PUBLIC_*` variable:**

- the Supabase **service-role key**
- the database **password** or a direct Postgres connection string
- a Supabase **access token** (personal or CI)
- any other server-only credential

`EXPO_PUBLIC_*` variables are inlined into the client bundle by Expo/Metro
at build time — they are not secrets by definition, so only genuinely
public values belong there. Privileged operations run in Supabase Edge
Functions (server-side), which read privileged secrets from Edge Function
environment variables, never from the client bundle
(`docs/ARCHITECTURE.md` §6-7). `scripts/check-no-secrets.js` (wired into
CI) checks for common accidental-secret patterns in source and in the
exported web bundle.

If `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are
absent or malformed, the app renders a dedicated "Configuration required"
screen instead of pretending authentication works
(`src/config/env.ts`, `src/components/dev/configuration-error-screen.tsx`).

## 4. Migrations

`supabase/migrations/*.sql` are applied in filename (timestamp) order and
must rebuild the full schema from an empty database — verified for this
phase both by CI (`supabase db reset` against the real local stack) and,
during development in an environment without Docker, by a supplementary
local Postgres harness (`scripts/local-pg-harness/`, see its `README.md`
for exactly what it is and is not).

Every P0 table from `docs/DATABASE_SCHEMA.md` is created with:

- Row Level Security enabled, with no exceptions.
- Owner-scoped policies (`auth.uid() = <owner column>`, or an `exists (...)`
  join for child tables) per `docs/DATABASE_SCHEMA.md` §16.
- Explicit `GRANT`s scoped to exactly the operations the `authenticated`
  role needs — immutable/insert-only tables have no `UPDATE`/`DELETE`
  grant at all, and reference tables have no write grant at all, enforced
  at the Postgres privilege level, not just by omitting a policy.
- No table grants `anon` access to any private table (deliberately
  stricter than relying on RLS alone — see `docs/DECISIONS.md`'s Phase 2A
  entry).

Reference/lookup table **content**: `goals` and `movement_patterns` are
seeded by migration (fixed, closed enumerations directly from
`docs/MASTER_SPEC.md`). `equipment`, `muscles`, `exercises`, and
`body_area_muscle_map` are created empty — populating them is Phase 4
content-authoring work, not a fixed enumeration this phase can seed safely
(see `docs/DECISIONS.md`).

## 5. Database tests

`supabase/tests/database/*.sql` is a pgTAP suite covering the RLS Test
Matrix in `docs/DATABASE_SCHEMA.md` §19 — for every user-owned P0 table:
owner can perform its allowed operations; another authenticated user is
denied read/write; an unauthenticated request is denied; and, for
reference tables, only the service role can write. `supabase/tests/database/11_privileged_service_role.sql`
specifically exercises the "privileged server operation" column of that
matrix.

Run them with `npx supabase test db --local`. This is the authoritative,
Supabase-supported test path and is what CI runs
(`.github/workflows/ci.yml`, `database` job) against the real local stack.

### What ran where for this PR

Docker is unavailable in the Claude Code cloud sandbox this PR was
developed in, so `supabase start`/`supabase test db` could not run
directly in that sandbox. Instead:

- A bare PostgreSQL 16 instance **was** available in that sandbox.
  `scripts/local-pg-harness/` adds the minimal `auth`/`storage` schema
  primitives (`auth.users`, `auth.uid()`, `storage.buckets`,
  `storage.objects`, `storage.foldername()`) that a real Supabase project
  already provides, so the exact migration SQL in `supabase/migrations/`
  could be applied to a clean database and its RLS policies genuinely
  exercised — see that directory's `README.md` for exactly what it is (and
  is not).
- Every migration was applied to a clean database this way and confirmed
  to rebuild the schema with zero errors, with all 44 tables showing RLS
  enabled.
- The full pgTAP suite (`supabase/tests/database/`, 146 assertions across
  12 files) was run against that harness database with `pg_prove` (pgtap
  installed via `apt-get install postgresql-16-pgtap`) and passed
  completely.
- `.github/workflows/ci.yml`'s `database` job runs the same suite against
  the real `supabase start` stack on GitHub-hosted runners (where Docker
  is available) as the independent, authoritative source of truth —
  inspect that job's result on this PR before treating the database layer
  as verified end-to-end. **This harness passing is not proof the real
  stack will pass** — the Phase 2A correction pass (`docs/DECISIONS.md`,
  2026-07-24 entry) found two real-stack-only failures (missing
  `service_role` grants; a Storage safety trigger the harness didn't
  reproduce at the time) that this harness's own simplifications had
  masked. Both are now fixed and the harness updated to catch the second
  class of gap going forward, but the real CI job remains the only
  authoritative signal.

## 6. Phase 2B — connecting a remote project

The repository-side infrastructure for this (deploy workflow, hosted
schema verification, redirect-URL documentation, setup checklist) was
built in Phase 2B — see `docs/PHASE_2B_HOSTED_SETUP.md` (non-developer
setup checklist), `docs/PHASE_2B_HOSTED_VERIFICATION.md` (post-deploy test
plan), and `.github/workflows/deploy-supabase-dev.yml` (the manual-only
deploy workflow). No remote project was created and no credentials were
supplied or committed during that work — this section's original plan
(below) is still accurate for what actually connecting one involves; the
two documents above give the exact, current step-by-step version of it.

When Phase 2B's hosted project is actually created and connected:

1. Create (or select) a Supabase project in the dashboard.
2. `npx supabase link --project-ref <ref>`.
3. `npx supabase db push` to apply `supabase/migrations/` to the remote
   project.
4. Set `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in
   the app's real deployment environment (EAS secrets, `.env` for local
   dev against the remote project, etc.) — still only ever the public
   URL/publishable key, never a service-role key or access token.
5. **Password recovery redirect URL** (Phase 2A correction pass): the
   client already builds and sends `redirectTo` on every
   `resetPasswordForEmail` call (`src/state/auth/auth-context.tsx`,
   `Linking.createURL('reset-password')` — resolves to
   `murphymethod://reset-password` in a built/standalone app), and
   `src/app/(auth)/reset-password.tsx` + the `PASSWORD_RECOVERY` handling
   in `onAuthStateChange` already implement the full completion flow. The
   remote project's dashboard (Authentication → URL Configuration →
   Redirect URLs) must allow `murphymethod://**` — mirroring
   `supabase/config.toml`'s local `additional_redirect_urls` — or Supabase
   will reject `redirectTo` and silently fall back to `site_url`, which
   breaks the flow for a mobile user. Nothing else in this flow depends on
   the remote project; only this dashboard allow-list entry is deferred.
6. Re-run `supabase test db --linked` (or `--local` against a pulled copy)
   to confirm RLS holds on the real project.
7. Regenerate `src/types/database.ts` from the linked project if its
   schema has diverged from `supabase/migrations/` for any reason (it
   shouldn't have, if `db push` was used consistently).

## 7. Storage

The private `bodyscans` bucket (`supabase/migrations/20260723091300_bodyscan.sql`)
is created with `public = false`, a 15 MiB per-object size limit, and
`image/jpeg`/`image/png`/`image/heic` as the only allowed MIME types.
Object paths follow `{user_id}/{scan_id}/{image_id}.jpg`; owner-only
storage policies mirror the table-level RLS pattern. No capture/upload UI
exists yet (Phase 10) — this phase establishes and tests the security
boundary only.
