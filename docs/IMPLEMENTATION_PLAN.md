# Implementation Plan

Status: authoritative for this phase. Defines Phases 0–12 per
`MASTER_SPEC.md`'s brief. `CLAUDE.md` requires working **one phase at a
time** — do not begin a phase until the prior phase's acceptance criteria
are met, and do not build later phases early even if convenient.

Each phase lists: dependencies, deliverables, acceptance criteria, tests,
and explicit non-goals. Global quality gates that apply across all phases
are in [`ACCEPTANCE_CRITERIA.md`](ACCEPTANCE_CRITERIA.md).

## Completed

- **Phase 0 — Project foundation:** Expo + React Native + TypeScript (Expo
  Router), strict type-checking, linting/formatting, baseline documentation
  structure. _(Done prior to this phase.)_
- **Architecture & specification phase** (this work): `MASTER_SPEC.md` and
  the full supporting document set replaced from placeholder to
  authoritative content. No product code was written in this phase, per
  its own instructions.

## Phase 0 — Architecture / Foundation Verification

- **Dependencies:** none (this phase).
- **Deliverables:** the document set now in `docs/` (this phase's actual
  output); confirmation the existing Expo/TypeScript/ESLint foundation
  needs no changes to support Phase 1+.
- **Acceptance criteria:** all documents internally consistent (see
  `ACCEPTANCE_CRITERIA.md`); `npm run typecheck`, `npm run lint`, `npm run
format:check` pass on the unmodified codebase.
- **Tests:** none (no product code).
- **Non-goals:** no screens, no business logic, no dependencies installed.

## Phase 1 — Design System / Application Shell

- **Dependencies:** Phase 0.
- **Deliverables:** semantic design tokens implemented in
  `src/constants/theme.ts` per [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)
  (replacing the current placeholder `Colors`); shared `src/components/ui/`
  primitives (Button, Card, form controls per `DESIGN_SYSTEM.md` §7); the
  route-group shell from [`ROUTES.md`](ROUTES.md) (`(auth)`, `(onboarding)`,
  `(tabs)`, `workout/`) with placeholder screens (no real data); a test
  runner introduced (per `CLAUDE.md` — "a test runner will be introduced
  alongside the first real domain logic"; component tests for the new UI
  primitives count as that first domain logic).
- **Acceptance criteria:** app boots to the five-tab shell with placeholder
  content; light/dark/reduced-motion all render correctly; no raw hex
  colours outside `theme.ts`; typecheck/lint/format clean.
- **Tests:** component tests for `src/components/ui/*`; a smoke test that
  the tab shell renders.
- **Non-goals:** no Supabase, no auth, no real onboarding logic, no
  business/domain data.

## Phase 2 — Supabase / Auth / Database / RLS

- **Dependencies:** Phase 1 (shell exists so auth guards have somewhere to
  redirect to/from).
- **Deliverables:** Supabase project wired (env-configured, not hardcoded);
  every P0 table from [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) migrated
  with RLS policies per §16 of that document; Supabase Auth integrated for
  Sign Up/Sign In/Forgot Password/Verify Email; `(auth)` guard logic wired
  to real session state.
- **Acceptance criteria:** a signed-up user can sign in; a second test user
  cannot read/write the first user's rows on any P0 table (verified by
  automated RLS tests, not just manual spot-check); no service-role key
  present in client bundle (verified by a build-artifact grep check).
- **Tests:** RLS test suite (one negative test per user-owned table
  minimum — attempt cross-user read/write, expect denial); auth flow
  integration tests.
- **Non-goals:** no onboarding UI logic beyond auth itself; no exercise
  content seeded yet (Phase 4); no programme generation yet.

## Phase 3 — Onboarding

- **Dependencies:** Phase 2 (needs real auth + `profiles`/`user_goals`/etc.
  tables).
- **Deliverables:** every onboarding screen in
  [`SCREEN_SPECIFICATIONS.md`](SCREEN_SPECIFICATIONS.md) §2, writing real
  data; `(onboarding)` guard wired to `onboarding_completed_at`;
  `completeOnboarding` Edge Function (`API_CONTRACTS.md` §2) — note this
  calls `generateProgramme`, so a minimal/stub version of Phase 5's engine
  (or a hardcoded single-template programme) is required here; the full
  engine lands in Phase 5 and this stub is replaced, not left in parallel.
- **Acceptance criteria:** a new user can complete onboarding end-to-end in
  under ~6 minutes of realistic interaction; every required field blocks
  progression when empty (`SCREEN_SPECIFICATIONS.md` §0); BodyScan and
  baseline measurements are skippable without blocking completion; safety
  screening responses correctly set `requires_clearance`/
  `restriction_flags`.
- **Tests:** end-to-end onboarding flow test; unit tests for screening
  rule derivation; unit tests for goal-priority uniqueness handling.
- **Non-goals:** the full programme-generation algorithm
  (`PROGRAMME_ENGINE.md`) — Phase 3 may use a minimal stand-in as noted
  above; BodyScan comparison/timeline UI (Phase 10).

## Phase 4 — Exercise Ontology / Seed Library

- **Dependencies:** Phase 2 (reference tables exist).
- **Deliverables:** `muscles`, `movement_patterns`, `equipment`,
  `exercises`, `exercise_muscles`, `exercise_equipment`,
  `exercise_substitutions`, `exercise_restrictions`,
  `body_area_muscle_map` seeded with a real, curated exercise library
  sufficient to generate varied programmes across all MVP goals/equipment
  combinations; a content-authoring/import process (script or admin
  tooling) so the library can grow without a code deploy per exercise.
- **Acceptance criteria:** every movement pattern in
  `MASTER_SPEC.md` §9 has multiple eligible exercises across at least
  bodyweight-only and common home/gym-equipment tiers; every seeded
  exercise has complete required fields (no partially-filled ontology
  rows); substitution graph has no dangling/self-referential entries.
  Exact exercise count and content review sign-off is a product decision,
  not fixed here.
- **Tests:** schema/data validation tests (referential integrity, no
  missing required fields, no orphaned substitution edges).
- **Non-goals:** any exercise-selection/scoring logic (Phase 5); no
  instructional video production pipeline (media URLs may be stubbed/absent
  for MVP; Exercise Information handles that empty state per
  `SCREEN_SPECIFICATIONS.md`).

## Phase 5 — Programme Engine

- **Dependencies:** Phase 3 (onboarding produces engine inputs), Phase 4
  (real exercise data to select from).
- **Deliverables:** the full deterministic pipeline in
  [`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md) — goal translation,
  eligibility/scoring, session assembly, volume/frequency boundaries,
  duration estimation, validation, `ProgrammeVersion` persistence;
  `generateProgramme` Edge Function replacing Phase 3's stub;
  Programme Change History / "Why did my programme change?" screens now
  backed by real `programme_versions`/`programme_decisions` data.
- **Acceptance criteria:** programme generation is fully testable and
  passes with **zero LLM/AI provider calls** (`MASTER_SPEC.md` §10); given
  fixed onboarding inputs, output is deterministic and reproducible;
  generated programmes respect goal priority ordering, equipment
  eligibility, and safety restriction flags in 100% of generated cases
  (verified by property-based/fuzz tests over varied input combinations,
  not just fixed examples); every generated programme's estimated duration
  is within a defined tolerance of the sum of its component estimates.
- **Tests:** unit tests per pipeline stage (§2–§7 of
  `PROGRAMME_ENGINE.md`); property-based tests across randomised valid
  input combinations; explanation-generation tests (every decision produces
  a non-empty, template-sourced explanation).
- **Non-goals:** adaptation/evidence-driven changes (Phase 7); Quick/
  Minimum generation (Phase 8); any LLM involvement.

## Phase 6 — Workout Engine / Offline Persistence

- **Dependencies:** Phase 5 (a real programme exists to generate workouts
  from).
- **Deliverables:** `startWorkout`/`logSet`/`submitWorkout`
  (`API_CONTRACTS.md` §8); the full Active Workout UX
  (`SCREEN_SPECIFICATIONS.md` §3); the local-first offline architecture
  (`ARCHITECTURE.md` §5) — local durable storage, write-behind sync queue,
  idempotent `client_generated_id` writes, visible sync status.
- **Acceptance criteria:** a workout started with no connectivity can be
  fully logged and completed locally, then syncs correctly once
  connectivity returns, with no duplicate or lost sets, verified by an
  automated test that simulates offline start → logging → reconnect; app
  backgrounding/kill mid-workout does not lose logged sets on relaunch.
- **Tests:** offline-simulation integration tests (airplane-mode-equivalent
  test harness); idempotency tests (retry-safe writes); PR-detection unit
  tests.
- **Non-goals:** exercise feedback/pain flows beyond the minimum needed to
  complete a workout (full feedback UX lands with Phase 7, though the
  `set_logs`/`workouts` write path itself is this phase's core); Quick/
  Minimum session generation logic (Phase 8, though the Active Workout UI
  must already be mode-agnostic by design).

## Phase 7 — Feedback / Personal Response Model / Adaptation

- **Dependencies:** Phase 6 (feedback attaches to real workouts).
- **Deliverables:** Exercise Feedback, Workout Feedback, Pain/Discomfort
  flow (`API_CONTRACTS.md` §9–11); `personal_response_models` /
  `preference_signals` and the Personalisation Engine aggregation jobs
  (`AI_ARCHITECTURE.md` §2.3); the Evidence & Confidence Engine
  (`AI_ARCHITECTURE.md` §2.4); `evaluateAdaptation` and Level 1–4 change
  application (`PROGRAMME_ENGINE.md` §8); Exercise Substitution
  (`API_CONTRACTS.md` §13, `PROGRAMME_ENGINE.md` §9) end-to-end.
- **Acceptance criteria:** a single negative data point (one dislike
  rating) provably does not trigger a Level 2+ change (automated test
  reproducing `MASTER_SPEC.md` §15's exact example); a pain report of
  `significant` severity provably pauses progression and applies its
  deterministic action regardless of any concurrent AI/coach state; every
  Level 2+ change has a non-empty `decision_evidence` row set.
  Stability-window enforcement (`PROGRAMME_ENGINE.md` §8) verified for
  system-triggered changes while user-requested/safety-triggered changes
  are verified to bypass it.
- **Tests:** the Evidence & Confidence worked example
  (`AI_ARCHITECTURE.md` §7) as an explicit automated test; stability-window
  tests; substitution-ranking unit tests; pain-flow safety tests (the
  single highest-priority test category in this phase).
- **Non-goals:** the LLM/Coach layer itself (Phase 9) — adaptation and
  substitution are fully deterministic through this phase, consistent with
  `MASTER_SPEC.md` §10's zero-LLM requirement extending to adaptation, not
  just initial generation.

## Phase 8 — Quick / Minimum / Adherence Rescue

- **Dependencies:** Phase 7 (adherence patterns feed the rescue trigger).
- **Deliverables:** `generateQuickWorkout` (`PROGRAMME_ENGINE.md` §10);
  Today's Quick/Minimum options; basic adherence-rescue detection and the
  Reset My Plan flow (`MASTER_SPEC.md` §20.4, basic version — advanced
  rescue is P1); Momentum/Consistency screen and language
  (`MASTER_SPEC.md` §17).
- **Acceptance criteria:** Quick/Minimum sessions are generated as real,
  loggable `workouts` rows (not truncated views) and count identically
  toward adherence metrics; declining-engagement detection triggers the
  Reset My Plan surface using only the approved non-blame language (checked
  against the content filter in `AI_ARCHITECTURE.md` §5's "never" list even
  though this flow is largely deterministic copy, not LLM-generated).
- **Tests:** Quick/Minimum selection-and-duration-envelope tests; adherence-
  detection threshold tests; copy/content-lint test against the banned-word
  list (`MASTER_SPEC.md` §4).
- **Non-goals:** motivational experimentation (P1, §29.2); Motivation
  Profile modelling (P1); wearable-driven readiness input.

## Phase 9 — Coach Architecture

- **Dependencies:** Phase 7 (structured context sources must exist),
  Phase 8 (Quick/Minimum and Reset My Plan are tool-callable targets).
- **Deliverables:** `AIProvider` abstraction with `MockAIProvider` and
  `ClaudeAIProvider` (`AI_ARCHITECTURE.md` §3); Coach Context Builder
  (§4); `sendCoachMessage`/`getDailyInsight`/`getWeeklyInsight`
  (`API_CONTRACTS.md` §18); tool-calling wiring to existing deterministic
  operations (§6); coaching-style prompt templates (§5) with the
  post-generation content filter; cost-control instrumentation (§11);
  the Coach Conversation, Daily/Weekly Insight, and Accountability Settings
  screens.
- **Acceptance criteria:** all automated tests for Coach-adjacent logic run
  against `MockAIProvider` with no network dependency and no real API cost;
  the LLM evaluation set (`AI_ARCHITECTURE.md` §10) passes with zero
  "never"-list violations before this phase is considered complete; every
  coach reply's `structured_context_snapshot` is populated and
  groundedness-checked; provider API key confirmed absent from client
  bundle (same check as Phase 2's service-role-key check, applied to the
  AI key).
- **Tests:** `MockAIProvider`-based unit/integration tests for context
  assembly and tool-calling; the LLM evaluation harness (§10) run against
  `ClaudeAIProvider` in a controlled/manual or scheduled (not per-commit,
  given cost) capacity.
- **Non-goals:** motivational experimentation (P1); Motivation Profile
  (P1); any Layer 5 computer-vision integration.

## Phase 10 — Progress / Measurements / BodyScan MVP

- **Dependencies:** Phase 6 (performance data exists), Phase 7 (PRM
  exists for trajectory estimation).
- **Deliverables:** Measurements, Strength Progress, Personal Records,
  Consistency, Goal Journey, Progress Review, Adaptive Work Pathway
  screens; `generateProgressReview`/`getAdaptiveWorkPathway`
  (`API_CONTRACTS.md` §16); full BodyScan capture/storage/comparison
  (`API_CONTRACTS.md` §17, `ARCHITECTURE.md` §9) including the private-
  storage upload flow and signed-URL comparison viewer.
- **Acceptance criteria:** trajectory is never rendered as a fabricated
  precise percentage (content-lint test against `MASTER_SPEC.md` §26.1's
  language rule); BodyScan images are provably inaccessible via a public
  URL (automated test attempting unauthenticated/cross-user object access,
  expecting denial — mirrors the Phase 2 RLS test pattern applied to
  Storage); the product remains fully navigable and useful for a test user
  who declines BodyScan consent entirely (explicit test scenario).
- **Tests:** BodyScan storage-privacy tests; progress-review content-lint
  tests; empty-state tests for every chart/list screen per
  `SCREEN_SPECIFICATIONS.md` §0.
- **Non-goals:** any Layer 5 computer vision (ghost overlay, pose matching,
  Scan Reliability Score — all P1/P2); BodyScan Mat/calibration.

## Phase 11 — Privacy / Security / Safety Hardening

- **Dependencies:** all prior phases (this is a cross-cutting hardening
  pass, not new product surface).
- **Deliverables:** Data Export, Delete Data, Delete Account, Consent, and
  BodyScan Privacy screens fully wired to
  `API_CONTRACTS.md` §22; a full RLS audit across every table (not just the
  Phase 2 baseline — re-verified after every subsequent phase's schema
  additions); rate limiting confirmed in place on every AI-calling and
  BodyScan-upload operation; audit-log coverage review against
  `ACCEPTANCE_CRITERIA.md`.
- **Acceptance criteria:** every item in
  [`ACCEPTANCE_CRITERIA.md`](ACCEPTANCE_CRITERIA.md) passes; a full data
  export produces a complete, human-readable bundle of a test account's
  data; account deletion (after its grace period) removes/anonymises all
  rows per the retention rules in `DATABASE_SCHEMA.md`, verified by an
  automated post-deletion query sweep.
- **Tests:** full RLS regression suite; data export completeness test;
  account deletion completeness test; rate-limit enforcement tests.
- **Non-goals:** new product features.

## Phase 12 — E2E Testing / Beta Readiness

- **Dependencies:** Phase 11.
- **Deliverables:** end-to-end test coverage of the primary user journeys
  (onboarding → first workout → feedback → progress → coach); accessibility
  audit against `DESIGN_SYSTEM.md` §8; performance pass on app startup and
  Active Workout responsiveness; observability dashboards
  (`ARCHITECTURE.md` §12) confirmed receiving real data; beta rollout plan.
- **Acceptance criteria:** all E2E journeys pass on both iOS and Android;
  no P0 screen missing a loading/empty/error state
  (`SCREEN_SPECIFICATIONS.md` §0 audit); accessibility audit has no
  critical findings; safety metrics (`MASTER_SPEC.md` §31.1) are visibly
  flowing into observability before any external beta user is admitted.
- **Tests:** full E2E suite; accessibility automated + manual audit;
  load/perf smoke test on programme generation and Active Workout.
- **Non-goals:** any P1/P2 feature; public launch/marketing activities.

---

## Cross-phase rules

- No phase begins until the previous phase's acceptance criteria are
  demonstrably met — this is a `CLAUDE.md` requirement, not a suggestion.
- Any requirement discovered to be infeasible as specified must be handled
  per `CLAUDE.md`: preserve intent, document the concern, recommend an
  alternative in `DECISIONS.md`/`RISKS.md` — never silently dropped.
- Test runner and testing-library choices are made at Phase 1 (first real
  domain logic) and recorded in `DECISIONS.md` at that time, not fixed by
  this document.
