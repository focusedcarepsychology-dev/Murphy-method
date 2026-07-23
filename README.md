# Murphy Method

Project foundation for an adaptive AI-powered fitness, body-transformation
and behavioural accountability application.

**Status: early technical foundation only.** No product features, screens,
data model, or AI functionality have been built yet. The authoritative
product and technical specification now lives in
[`docs/MASTER_SPEC.md`](docs/MASTER_SPEC.md) and its supporting documents in
[`docs/`](docs) — see that folder for the full architecture, data model,
routes, AI design, and phased implementation plan. Nothing described there
has been implemented yet; implementation proceeds one phase at a time per
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## Stack

- [Expo](https://expo.dev) SDK 57
- React Native 0.86
- React 19
- TypeScript 6 (`strict` mode)
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- ESLint (flat config, `eslint-config-expo`) + Prettier

Targets Android and iOS today, with web supported by the same Expo Router
setup for later use.

## Project structure

```
src/
  app/          Expo Router routes (file-based navigation)
  components/   Shared UI components
  constants/    Shared constants (e.g. theme tokens)
  hooks/        Shared React hooks
assets/         Images, icons, fonts
docs/           Project documentation (spec, architecture, decisions, etc.)
```

## Getting started

Install dependencies:

```bash
npm install
```

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
```

There are no automated tests yet; a test runner will be introduced alongside
the first real domain logic, per `CLAUDE.md`.

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
- [`DECISIONS.md`](docs/DECISIONS.md) — architecture decision records
- [`DEFERRED.md`](docs/DEFERRED.md) — everything explicitly out of MVP
- [`RISKS.md`](docs/RISKS.md) — risk register
- [`ACCEPTANCE_CRITERIA.md`](docs/ACCEPTANCE_CRITERIA.md) — global quality gates
- [`OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) — unresolved product decisions

See [`CLAUDE.md`](CLAUDE.md) for the permanent working rules for this
repository.
