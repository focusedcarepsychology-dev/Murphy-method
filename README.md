# Murphy Method

An adaptive AI-powered fitness, body-transformation and behavioural
accountability application.

**Status: Phase 2A of `docs/IMPLEMENTATION_PLAN.md` — Supabase / Auth /
Database / RLS.** The authoritative product and technical specification
lives in [`docs/MASTER_SPEC.md`](docs/MASTER_SPEC.md) and its supporting
documents in [`docs/`](docs). Implementation proceeds one phase at a time.

What exists today:

- **Phase 1 — design system / application shell:** semantic design tokens,
  shared UI primitives, the full route-group shell from
  [`docs/ROUTES.md`](docs/ROUTES.md), placeholder screens for anything not
  yet wired to real data.
- **Phase 2A — Supabase / Auth / Database / RLS (this phase):** a real
  Supabase client foundation; real Sign Up / Sign In / Forgot Password /
  Verify Email screens backed by Supabase Auth; a real sign-out flow;
  session/auth-state architecture (`src/state/auth/`) with route guards
  enforcing unauthenticated → onboarding → tab-shell routing
  (`docs/ROUTES.md` §3); every P0 database table from
  [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md), migrated with Row
  Level Security on every table and an automated pgTAP test suite; a
  private BodyScan storage bucket with owner-only access policies (no
  capture/upload UI yet — that's Phase 10).

**Not yet built:** onboarding data submission (Phase 3), the exercise
library (Phase 4), programme generation (Phase 5), workout logging (Phase
6), feedback/adaptation (Phase 7), the AI coach (Phase 9), BodyScan
capture (Phase 10). See [`docs/DEFERRED.md`](docs/DEFERRED.md) for the full
list of what's intentionally not built yet and why.

## Stack

- [Expo](https://expo.dev) SDK 57
- React Native 0.86
- React 19
- TypeScript 6 (`strict` mode)
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- [Supabase](https://supabase.com) (Postgres + Auth + Storage), via
  `@supabase/supabase-js`, with `@react-native-async-storage/async-storage`
  for session persistence
- Jest + `@testing-library/react-native` for tests
- ESLint (flat config, `eslint-config-expo`) + Prettier

Targets Android and iOS today, with web supported by the same Expo Router
setup.

## Project structure

```
src/
  app/            Expo Router routes (file-based navigation)
  components/     Shared UI components
  config/         Typed, validated environment configuration
  constants/      Shared constants (e.g. theme tokens)
  domain/         Client-side domain logic (e.g. auth form validation)
  hooks/          Shared React hooks, incl. the route guard
  services/       Typed clients for external services (Supabase)
  state/          App-wide state (e.g. AuthProvider)
  test-utils/     Shared test helpers (e.g. mock Supabase client)
  types/          Generated/shared TypeScript types (e.g. database schema)
assets/           Images, icons, fonts
docs/             Project documentation (spec, architecture, decisions, etc.)
supabase/         Supabase project config, SQL migrations, pgTAP tests
scripts/          Repo tooling (env-type generation, secret-leak checks, ...)
```

## Getting started

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your Supabase project's URL and
publishable key (see [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) for
local Supabase CLI setup). Without this, the app shows a "Configuration
required" screen rather than pretending authentication works.

Start the development server:

```bash
npm start
```

From the Expo CLI output you can open the app in a development build, an
Android emulator, an iOS simulator, or Expo Go.

Run on a specific platform:

```bash
npm run android
npm run ios
npm run web
```

## Quality checks

```bash
npm run typecheck     # TypeScript, strict mode, no emit
npm run lint           # ESLint
npm run format:check   # Prettier check (use `npm run format` to write)
npm test               # Jest
npm run check:secrets  # No privileged Supabase credentials in source/client bundle
```

Database migrations and the RLS test suite are run via the Supabase CLI —
see [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

## Documentation

See [`docs/`](docs) for the full specification set:

- [`MASTER_SPEC.md`](docs/MASTER_SPEC.md) — authoritative product spec
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — client/server/data architecture
- [`DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — data model
- [`ROUTES.md`](docs/ROUTES.md) — navigation and route contracts
- [`API_CONTRACTS.md`](docs/API_CONTRACTS.md) — domain service contracts
- [`AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md) — AI layer design
- [`PROGRAMME_ENGINE.md`](docs/PROGRAMME_ENGINE.md) — programme generation/adaptation algorithm
- [`DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — visual design tokens and components
- [`SCREEN_SPECIFICATIONS.md`](docs/SCREEN_SPECIFICATIONS.md) — per-screen behaviour
- [`IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — phased build plan
- [`SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) — local Supabase CLI workflow, migrations, tests, type generation
- [`DECISIONS.md`](docs/DECISIONS.md) — architecture decision records
- [`DEFERRED.md`](docs/DEFERRED.md) — everything explicitly out of MVP
- [`RISKS.md`](docs/RISKS.md) — risk register
- [`ACCEPTANCE_CRITERIA.md`](docs/ACCEPTANCE_CRITERIA.md) — global quality gates
- [`OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) — unresolved product decisions

See [`CLAUDE.md`](CLAUDE.md) for the permanent working rules for this
repository.
