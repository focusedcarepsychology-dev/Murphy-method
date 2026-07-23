# Murphy Method

Project foundation for an adaptive AI-powered fitness, body-transformation
and behavioural accountability application.

**Status: early technical foundation only.** No product features, screens,
data model, or AI functionality have been built yet. The authoritative
product specification (once written) lives in
[`docs/MASTER_SPEC.md`](docs/MASTER_SPEC.md); it is currently a placeholder.

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

See [`docs/`](docs) for the master specification, architecture notes,
database schema, routes, implementation plan, decision log, and deferred
requirements. See [`CLAUDE.md`](CLAUDE.md) for the permanent working rules
for this repository.
