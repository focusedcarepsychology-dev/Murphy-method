# Architecture

Status: authoritative for this phase. Derived from
[`MASTER_SPEC.md`](MASTER_SPEC.md); do not introduce architecture here that
contradicts it.

This document covers client architecture, domain architecture, the data
layer, offline strategy, Supabase architecture, Edge Functions, AI
architecture (summary — full detail in
[`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md)), security boundaries, BodyScan
architecture, analytics, observability, and the recommended folder
structure. Nothing described here has been implemented yet unless the repo
inspection below says otherwise.

## 1. Current foundation (as of this phase)

- Expo SDK 57, React Native 0.86, React 19, TypeScript 6 (`strict`), Expo
  Router (typed routes + React Compiler experiments enabled).
- ESLint 9 (`eslint-config-expo` flat config) + Prettier.
- No backend, no state management library, no navigation beyond two
  placeholder routes (`src/app/index.tsx`, `src/app/explore.tsx`), no test
  runner, no Supabase, no AI integration. This phase does not add any of
  these — see [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).

## 2. System overview

```
┌─────────────────────────────┐
│  Expo / React Native client │
│  (iOS, Android, later Web)  │
└───────────────┬──────────────┘
                │  HTTPS (Supabase client libs)
┌───────────────▼──────────────────────────────────────────┐
│  Supabase project                                         │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ Postgres + RLS │  │ Supabase Auth  │  │  Storage     │ │
│  └───────┬────────┘  └────────────────┘  │ (BodyScan,   │ │
│          │                                │  private)    │ │
│  ┌───────▼────────────────────────────┐  └──────────────┘ │
│  │ Edge Functions (privileged domain   │                  │
│  │ logic + AI provider calls)          │                  │
│  └───────┬─────────────────────────────┘                  │
└──────────┼──────────────────────────────────────────────────┘
           │  server-side only
┌──────────▼───────────┐
│  AIProvider           │
│  (Claude, mock, ...)  │
└────────────────────────┘
```

The client never talks to Postgres with elevated privilege and never holds
an LLM API key. All privileged domain logic — programme generation/
adaptation, evidence writes, AI provider calls — runs in Edge Functions,
callable only by an authenticated user acting on their own data (enforced by
RLS plus function-level checks).

## 3. Client architecture

### 3.1 Navigation

Expo Router, file-based, with typed routes. Route groups map directly to
the five tabs plus non-tab flows (auth, onboarding, workout, modals). Full
route table: [`ROUTES.md`](ROUTES.md).

### 3.2 State management

Three distinct categories of client state, each with a distinct tool,
chosen when Phase 1/2 begins (recorded as an ADR at that time — not decided
here beyond the shape of the decision):

- **Server-derived state** (profile, programme, progress, coach threads):
  fetched via a data-fetching/cache layer (e.g. TanStack Query) backed by
  the Supabase client. Cache-first, revalidate-on-focus.
- **Local-first durable state** (in-progress workout, offline queue): not a
  cache of server state — it is the source of truth until synced. See §5.
- **Ephemeral UI state** (form fields, modal visibility, animation state):
  local component state / lightweight global store as needed.

A single global "god store" holding all three is explicitly rejected — it
would make the offline/local-first boundary (§5) impossible to reason
about.

### 3.3 Domain layer (client-side)

The client does not re-implement domain logic that belongs on the server
(programme generation, adaptation, evidence scoring). It does own:

- **Presentation-only derivations**: formatting, unit conversion (kg/lb,
  cm/in), display-only aggregation of already-fetched data.
- **Offline workout engine**: local set logging, rest-timer state, and the
  sync queue (§5) — this is domain logic that must run client-side by
  requirement (offline resilience), and is treated as a first-class domain
  module, not UI glue.
- **Client-side validation** mirroring (not replacing) server-side
  validation, for immediate UX feedback.

### 3.4 Component layering

```
src/
  app/            route files only — thin, compose screens from src/screens
  screens/        one module per screen, orchestrates hooks + components
  components/     shared, reusable UI primitives and composed components
  domain/         client-side domain modules (offline workout engine, sync
                  queue, unit conversion, PRM display helpers)
  services/       typed clients for each domain service boundary (see
                  API_CONTRACTS.md) — wraps Supabase client + Edge Function
                  calls, no UI concerns
  state/          query hooks / global stores, one module per bounded
                  context (auth, profile, programme, workout, progress,
                  coach)
  constants/      design tokens, static config
  hooks/          cross-cutting React hooks (theme, color scheme, network
                  status, etc.)
  types/          shared TypeScript types, generated Supabase types
```

Full detail and rationale: §10.

## 4. Domain architecture (server-side)

Domain logic is organised as services matching the boundaries in
[`API_CONTRACTS.md`](API_CONTRACTS.md), each implemented as one or more
Supabase Edge Functions plus supporting SQL (views/functions) where
set-based logic belongs in the database rather than in application code
(e.g. RLS-protected aggregate queries for Progress).

Layering mirrors the AI layer model in
[`MASTER_SPEC.md`](MASTER_SPEC.md) §21 / [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md):
deterministic safety rules and the programme engine are plain TypeScript
(or SQL) with no AI dependency and are unit-testable in isolation; the LLM
is called only from the Coach service and only after deterministic layers
have already produced/validated their output.

## 5. Offline strategy

**Requirement (non-negotiable):** a user must never lose a workout because
of a dropped connection or interrupted app session (`MASTER_SPEC.md` §13,
§22).

### 5.1 Design

- **Local-first workout state.** When a workout starts, an `ActiveWorkout`
  record and its `SetLog` entries are written to on-device durable storage
  (e.g. SQLite via `expo-sqlite`, or MMKV/AsyncStorage for the MVP volume of
  data — final choice recorded as an ADR when Phase 6 begins) _before_ any
  network call is attempted. The UI reads from local state, not from a
  network round-trip, during an active workout.
- **Write-behind sync queue.** Each local mutation (set logged, exercise
  swapped, workout completed, feedback submitted) is appended to a durable
  outbox. A background sync process drains the outbox against Supabase
  whenever connectivity is available, in order, per workout.
- **Idempotent writes.** Every queued mutation carries a client-generated
  UUID; server-side upserts key on that UUID so retried/duplicated sync
  attempts cannot double-write a set.
- **Conflict handling.** Workout logging is single-writer per workout (one
  device actively logging at a time in MVP — multi-device concurrent
  logging is out of scope, see [`DEFERRED.md`](DEFERRED.md)). Conflicts
  therefore reduce to "did this mutation already reach the server?", which
  idempotent UUIDs answer directly; no merge algorithm is required for MVP.
  If a device is reinstalled or storage is cleared mid-sync, unsynced local
  data is unrecoverable — this is an accepted MVP limitation, recorded in
  [`RISKS.md`](RISKS.md).
- **Sync status is visible**, not silent: the Active Workout / Workout
  Summary screens show a lightweight "saved on this device" vs. "synced"
  indicator so the user is never misled about durability.

### 5.2 What is explicitly not offline-first

Programme generation/adaptation, coach conversation, and BodyScan upload
require connectivity — these are read/compose-online experiences with
ordinary loading/error states, not part of the offline guarantee. Only
**workout execution and logging** carries the hard offline guarantee.

## 6. Supabase architecture

- **Auth:** Supabase Auth (email/password at minimum for MVP; provider
  choice for social auth is an open question — see
  [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md)). `profiles.id` is a 1:1 FK to
  `auth.users.id`.
- **Database:** PostgreSQL, normalised schema per
  [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md). Row Level Security is enabled
  on every user-owned table with no exceptions; policies key off `auth.uid()`
  matching the row's owning `user_id`/`profile_id`.
- **Storage:** private buckets, one for BodyScan images and one for any
  other user-uploaded media, both with RLS-equivalent storage policies
  scoping objects to their owner's path prefix (e.g.
  `bodyscans/{user_id}/{scan_id}/{image_id}.jpg`). No bucket is public.
- **Edge Functions:** used for (a) anything requiring the service-role key
  or cross-user aggregate work the client must not run directly, (b) all AI
  provider calls, (c) all domain logic classified Level 2+ in the adaptation
  model (`MASTER_SPEC.md` §16) so that evidence-writing and versioning
  happen atomically and cannot be spoofed by a compromised client, (d)
  server-side validation of anything safety-relevant (Layer 1 rules are
  re-validated server-side even though the client also runs them for UX).
- **Realtime:** not required for MVP; coach conversation and programme
  updates are pull-based. Left open for P1 if live coach streaming is
  desired (see [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md)).

Simple, low-risk reads/writes (e.g. logging a set once a workout already
exists, reading the exercise library, reading one's own profile) go direct
client → Postgres through RLS-protected tables via the Supabase client —
there is no architectural requirement to proxy every read through an Edge
Function. The rule is: **privilege escalation or cross-cutting domain logic
goes through an Edge Function; simple owner-scoped CRUD does not.**

## 7. AI architecture (summary)

Full design: [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md). Architecturally
relevant here: all LLM calls originate from Edge Functions, never from the
client, so provider API keys are never present client-side (`MASTER_SPEC.md`
§21.1, §24). The `AIProvider` interface is defined once and implemented per
provider (`MockAIProvider`, `ClaudeAIProvider`, ...), so provider choice is
a server-side dependency-injection concern with no client impact.

## 8. Security boundaries

| Boundary                                     | Enforcement                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User A cannot read/write User B's data       | Postgres RLS on every user-owned table, keyed on `auth.uid()`                                                                                                       |
| No privileged key in the client              | Service-role key and AI provider keys exist only in Edge Function runtime env vars                                                                                  |
| Safety rules cannot be bypassed by AI output | Layer 1 checks run as deterministic server-side code that gates what an Edge Function is allowed to persist/return, independent of any LLM call in the same request |
| BodyScan images are private                  | Storage bucket policies scope objects to owner; no public bucket, no public URL generation without a short-lived signed URL scoped to the requesting owner          |
| Audit trail cannot be edited after the fact  | `audit_logs` and `programme_versions`/`programme_decisions` are insert-only from application code (no UPDATE/DELETE grants for the client role)                     |

Full table-level RLS concept: [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

## 9. BodyScan architecture

MVP: capture → client-side guided framing (front/side/back/optional
45°) → upload to the private `bodyscans` bucket → `body_scans` +
`body_scan_images` rows created via an Edge Function (so a signed upload
can be verified and metadata written atomically) → comparison UI reads
scans back via short-lived signed URLs, never a public URL.

The architecture is deliberately layered so that P1/P2 computer-vision work
(ghost overlay, pose matching, Scan Reliability Score, calibration
marker/mat support) can be added as **additional processing on the same
stored images and metadata**, without changing the capture flow, storage
model, or privacy boundary:

- `body_scan_images` already carries capture metadata (angle, capture
  timestamp, device info) sufficient to support future alignment work.
- A separate `scan_quality` table (see `DATABASE_SCHEMA.md`) is reserved
  from MVP so a future reliability score does not require a schema
  migration that touches `body_scans` itself.
- Computer-vision processing (Layer 5, future) is designed as an
  asynchronous Edge Function / job triggered on upload, writing into
  `scan_quality`, independent of the synchronous capture path — so it can
  ship later without changing MVP capture latency or UX.

## 10. Recommended folder structure

```
src/
  app/                        # Expo Router routes — thin route files only
    (auth)/
    (onboarding)/
    (tabs)/
      today/
      plan/
      progress/
      coach/
      profile/
    workout/                  # modal/stack routes over the active workout
  screens/                    # one folder per screen, matches ROUTES.md
  components/
    ui/                       # design-system primitives (Button, Card, ...)
    workout/                  # workout-mode specific composed components
    progress/                 # charts, comparison views
  domain/
    workout/                  # offline workout engine, sync queue
    units/                    # kg/lb, cm/in conversion
  services/                   # one module per API_CONTRACTS.md boundary
  state/                      # query hooks / stores per bounded context
  constants/                  # design tokens (see DESIGN_SYSTEM.md)
  hooks/
  types/
supabase/
  migrations/                 # SQL migrations, one per DATABASE_SCHEMA.md change
  functions/                  # Edge Functions, one folder per API_CONTRACTS.md operation group
docs/
assets/
scripts/
```

This extends, rather than replaces, the existing `src/app`, `src/components`,
`src/constants`, `src/hooks` structure already in the repo.

## 11. Analytics

Analytics events are defined per domain (onboarding funnel, workout
completion, Quick/Minimum usage, coach engagement, notification response)
and mapped directly to the metrics in `MASTER_SPEC.md` §31. Event
collection goes through a single typed `trackEvent` client wrapper so the
underlying provider can change without touching call sites. No analytics
provider is selected in this phase — see
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md). PII/health-sensitive fields (exact
measurements, BodyScan-derived data) are never sent to a third-party
analytics provider; only categorical/derived events are (e.g. "workout
completed", not "user weighs 68kg").

## 12. Observability

- **Error tracking:** a single crash/error-reporting SDK (choice deferred —
  `OPEN_QUESTIONS.md`) wired at the app root and in every Edge Function,
  scrubbing health-sensitive payload fields before reporting.
- **Structured logging:** Edge Functions log structured events for every
  Level 2+ programme decision and every AI provider call (model, token
  counts, latency, cost — no raw health data in logs beyond IDs), feeding
  both debugging and the AI cost-control tracking in
  [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) § Cost Control.
- **Rate limiting:** applied at the Edge Function layer per user per
  operation class (especially AI-calling operations and BodyScan upload),
  to bound both abuse and AI cost.

## 13. Non-functional requirements, mapped to architecture

| Requirement (`MASTER_SPEC.md` §35)     | Architectural approach                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Fast app startup                       | Expo Router lazy route loading; defer non-critical data fetches past first paint                              |
| Mobile-first, Android + iOS, web later | Single Expo Router codebase; web output already configured (`app.json`)                                       |
| Graceful offline workout               | §5 local-first workout engine                                                                                 |
| Secure storage                         | RLS + private Storage buckets (§6, §8)                                                                        |
| Scalable image storage                 | Supabase Storage, signed URLs, no client-side full-resolution hoarding beyond what's needed for comparison UI |
| Observability                          | §12                                                                                                           |
| Error tracking                         | §12                                                                                                           |
| Rate limiting                          | §12, per-user per-operation at the Edge Function layer                                                        |
| AI cost monitoring                     | `AI_ARCHITECTURE.md` § Cost Control                                                                           |
| Predictable sync                       | §5 idempotent, ordered, per-workout outbox                                                                    |
