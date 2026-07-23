# Decisions

A running log of significant, auditable technical decisions. Each entry
should record what was decided, why, and what alternatives were considered.

## 2026-07-23 — Project foundation

- **Framework**: Expo (SDK 57) + React Native + TypeScript, using Expo
  Router for file-based navigation. Chosen for a single codebase targeting
  Android and iOS now, with web support available later via the same
  router/config.
- **Language strictness**: TypeScript `strict` mode enabled from the start
  (via `expo/tsconfig.base` plus explicit `strict: true`).
- **Linting**: ESLint flat config (`eslint-config-expo` + `eslint-config-prettier`)
  on ESLint 9, chosen because `eslint-config-expo`'s current dependency tree
  (eslint-plugin-import, eslint-plugin-react, eslint-plugin-react-hooks) is
  not yet compatible with ESLint 10.
- **Import resolution**: `eslint-import-resolver-typescript` pinned to `^4.4.5`
  via an `overrides` entry — the version pulled in transitively by
  `eslint-config-expo` (`^3.6.3`) is incompatible with TypeScript 6.
- **Formatting**: Prettier, run independently of ESLint (`eslint-config-prettier`
  disables stylistic ESLint rules that would conflict with it).

## 2026-07-23 — Architecture & specification phase

Full context: [`MASTER_SPEC.md`](MASTER_SPEC.md) and the accompanying
documents in `docs/`. This entry records the significant _architectural_
decisions made while turning the product brief into that specification —
not the product decisions themselves, which live in `MASTER_SPEC.md`.

- **Backend platform**: Supabase (Postgres + Auth + Storage + Edge
  Functions), continuing the direction specified in the product brief.
  Alternatives (a custom Node/Nest backend, Firebase) were not pursued —
  Supabase's RLS model maps directly onto the "no user can access another
  user's private data" requirement without a separate authorization layer
  to maintain, and Postgres gives the relational rigour the exercise
  ontology and programme-versioning model need.
- **Six-layer AI architecture with a hard non-override boundary**
  (`AI_ARCHITECTURE.md`): safety rules, the programme engine, and the
  evidence/confidence engine are deterministic and must work with zero LLM
  calls; the LLM (Layer 6) can only produce text and invoke already-gated
  tool operations. Alternative considered: a single LLM-orchestrated
  pipeline with safety instructions in the system prompt. Rejected —
  prompt-only safety is not a hard guarantee, and the brief explicitly
  requires "safety rules must override AI-generated recommendations"
  and "programme generation does not depend upon an LLM," which a
  prompt-only approach cannot satisfy verifiably.
- **Local-first offline workout architecture** (`ARCHITECTURE.md` §5): set
  logging writes to durable local storage before any network attempt, with
  an idempotent write-behind sync queue keyed on client-generated UUIDs.
  Alternative considered: optimistic online-first writes with a retry
  queue only on failure. Rejected — that approach still risks data loss on
  a hard app kill during the network attempt window; local-first-then-sync
  has no such window.
- **Immutable programme versioning + decision/evidence tables**
  (`DATABASE_SCHEMA.md` §6): `programme_versions` and `programme_decisions`
  are insert-only at the database-grant level, not just by application
  convention. This directly implements "significant programme changes must
  be auditable" (`CLAUDE.md`) as a structural guarantee rather than a
  behavioural one.
- **Denormalised `structure` jsonb on `programme_versions`, alongside a
  relational current-state model**: chosen so a historic programme version
  remains exactly reconstructable even after the exercise library changes
  underneath it, while day-to-day queries against the _current_ programme
  still get relational query performance. Pure-relational versioning (e.g.
  effective-dated rows on every prescription table) was considered and
  rejected as materially more complex for the same guarantee.
- **BodyScan computer vision deferred, but the storage/metadata model
  built to support it without a later migration** (`ARCHITECTURE.md` §9,
  `DATABASE_SCHEMA.md` §10): `body_scan_images.capture_metadata` and a
  reserved (unpopulated in P0) `scan_quality` table exist from Phase 2 so
  P1 alignment/reliability work is additive, not a breaking schema change.
- **AIProvider abstraction with a required `MockAIProvider`**
  (`AI_ARCHITECTURE.md` §3): every AI-adjacent behaviour must be testable
  with zero network calls and zero API cost. This was treated as a hard
  requirement, not an optimisation, because `MASTER_SPEC.md` explicitly
  requires programme logic to be "highly testable without requiring an
  LLM," and the same discipline is applied to the Coach layer's supporting
  infrastructure (context assembly, tool-calling) even though the Coach's
  actual conversational output necessarily depends on a real provider for
  final evaluation.
- **No literal REST API layer; domain contracts implemented as a mix of
  direct RLS-protected table access and Edge Functions**
  (`API_CONTRACTS.md`, `ARCHITECTURE.md` §6): chosen over a uniform
  "everything through a custom API" approach to avoid an unnecessary proxy
  layer for simple owner-scoped CRUD, while still guaranteeing privileged/
  cross-cutting logic (AI calls, Level 2+ adaptation, safety checks) cannot
  be bypassed by a client calling Postgres directly. The rule ("privilege
  escalation or cross-cutting domain logic → Edge Function; simple
  owner-scoped CRUD → direct table access") is the durable decision; which
  specific operations fall on which side may be refined during
  implementation without revisiting the rule itself.
- **`npm run typecheck` deterministically generates `expo-env.d.ts` via a
  `pretypecheck` script** (`scripts/ensure-expo-env-types.js`): `expo-env.d.ts`
  carries `/// <reference types="expo/types" />`, which is what makes
  Expo's ambient CSS/CSS-module type declarations (`declare module
'*.css'`, `declare module '*.module.css'`) visible to `tsc`. Expo's own
  tooling writes this file the first time `expo start` runs, and it is
  intentionally git-ignored per Expo convention (see `.gitignore`) — it is
  meant to be regenerated locally, never committed. A fresh checkout that
  runs `tsc --noEmit` without ever having started the dev server does not
  have it, so `src/components/animated-icon.web.tsx`'s
  `./animated-icon.module.css` import and `src/constants/theme.ts`'s
  `@/global.css` side-effect import fail with `TS2307`/`TS2882` — not
  because the source is wrong, but because the ambient declarations that
  make those imports valid TypeScript were never loaded into the compiler
  run. This is the root cause of the "typecheck passes locally but reports
  errors elsewhere" contradiction seen between sessions: whichever session
  had run `expo start` at least once had the file present and passed;
  whichever session did a fresh `npm install` + `tsc` without ever starting
  Expo did not. The fix reproduces Expo's own generated file content
  verbatim (not a workaround, not a suppression) so `npm run typecheck` is
  self-sufficient and deterministic on a bare checkout. `@ts-ignore`/rule
  suppression was deliberately not used, since the underlying types are
  genuinely available — they just weren't being loaded.
- **Design token seed values retained from the brief without
  modification** (`DESIGN_SYSTEM.md` §3): the light-theme palette in
  `MASTER_SPEC.md` §33 was adopted as-is for this phase. No technical
  blocker was found to justify deviating from it; dark-theme values and the
  full derived semantic scale are intentionally left for actual design
  work rather than invented here, to avoid this document asserting visual
  decisions with no design review behind them.

## 2026-07-23 — Architecture quality-gate review

A pre-merge review of the specification set above, checking for internal
contradictions, missing safety/audit concepts, and over-engineering, before
Phase 1 is allowed to begin. No product code was written; this entry
records what the review changed and, per its own brief, what it
deliberately did **not** change.

- **Complexity review finding: no material over-engineering found.** The
  one recurring pattern worth naming is **P1 schema reservation**
  (`readiness_entries`, `scan_quality`, `motivation_profiles` — reserved in
  `DATABASE_SCHEMA.md` §8/§10/§11 but not populated until their phase). This
  is deliberately kept rather than removed: each reservation exists
  specifically to avoid a breaking migration on tables MVP already writes
  to (`body_scan_images`, `workouts`), the alternative (retrofitting later)
  is materially more disruptive than three small unused-until-P1 tables,
  and `DEFERRED.md` already documents why each is P1 rather than P0. This
  is the intentional exception to "don't build ahead of need," not a
  pattern to generalise — it was not extended to any other speculative
  future table in this review (e.g. no P2 tables were added, per
  `DATABASE_SCHEMA.md` §17's "No P2/Research-scope tables are specified in
  this phase"). Everything else in the specification set was found to be
  scoped to a stated MVP requirement with an explicit test/acceptance
  criterion, not built ahead of validated need.
- **Typecheck contradiction resolved** — see the `expo-env.d.ts` entry
  above; root-caused as a missing generated file, not a code defect, and
  fixed with a deterministic `pretypecheck` script rather than a
  suppression.
- **Versioning, abstention, decision-minimalism, and the
  observation→signal→inference→confidence→decision data hierarchy made
  explicit** across `AI_ARCHITECTURE.md`, `PROGRAMME_ENGINE.md`, and
  `DATABASE_SCHEMA.md` — these were architecturally implied by the existing
  evidence/confidence design but not written down as first-class,
  independently testable concepts; this review closes that gap rather than
  changing the underlying design.
- **What this review deliberately did not do:** invent new product
  requirements, resolve any `OPEN_QUESTIONS.md` item by guessing (each
  is classified A/B/C but left open where genuinely unresolved), select
  infrastructure vendors, or begin Phase 1 implementation — all out of
  scope for a documentation/architecture correction pass per its own
  brief and `CLAUDE.md`'s "work one phase at a time."

## 2026-07-23 — Final pre-merge quality-gate pass

A second, independent verification pass over the same specification set
before this branch was allowed to merge, re-checking (not assuming) the
findings above. Confirmed `npm run typecheck`/`lint`/`format:check` all
pass on a bare `npm install`-only checkout, and reproduced the
`expo-env.d.ts`-missing failure directly (removing the generated file and
re-running `tsc` reliably reproduces the exact `TS2307`/`TS2882` errors the
`pretypecheck` script fixes) — the prior root-cause finding holds under
independent reproduction, not just re-reading.

Found and fixed four genuine cross-document gaps a documentation-only
re-read had not surfaced:

- **Missing data model for two onboarding fields the Programme Engine
  already depended on.** `PROGRAMME_ENGINE.md` §4 read "target weekly
  frequency (from `training_availability`)" and §6 depended on a preferred
  session-duration input, but no such table or `profiles` column existed
  in `DATABASE_SCHEMA.md` — `MASTER_SPEC.md` §6, the Training Availability
  and Preferred Workout Duration onboarding screens
  (`SCREEN_SPECIFICATIONS.md` §2), and their routes (`ROUTES.md`) all
  assumed this data was captured and stored somewhere, and it was not.
  Added `profiles.available_training_days` (`text[]`) and
  `profiles.preferred_session_duration_minutes` (`smallint`), and corrected
  `PROGRAMME_ENGINE.md` §4's reference accordingly.
- **Missing `notification_preferences` table.** `API_CONTRACTS.md` §19's
  `listNotificationPreferences`/`updateNotificationPreferences` and the
  Notifications/Accountability Settings screens referenced a structured
  preferences object (frequency toggles, quiet hours) with no backing
  table. Added `notification_preferences` (P0) to `DATABASE_SCHEMA.md` §13.
- **Two dangling section references.** `DATABASE_SCHEMA.md`'s header cited
  a `MASTER_SPEC.md` "§ Data Model" section that does not exist (the data
  model is distributed across MASTER_SPEC's domain sections, not one
  section) — reworded to say so rather than pointing at a fake anchor.
  `ACCEPTANCE_CRITERIA.md` #36 cited a `MASTER_SPEC.md` "§ Health /
  Regulatory Claim Boundary" that also did not exist as a named section,
  even though the underlying constraints were scattered across §3, §8.2,
  and §23.5. Rather than just fixing the reference, added an explicit
  `MASTER_SPEC.md` §3.1 "Health / Regulatory Claim Boundary" consolidating
  those constraints under one citable heading, per the review brief's
  explicit request for this boundary to be unambiguous.
- **Canonical units/time convention stated explicitly, not just
  per-field.** Individual columns already said "stored canonically in
  metric," but `DATABASE_SCHEMA.md`'s Conventions section never stated the
  policy once, or addressed how `date`-only columns (`workouts.scheduled_for`
  etc.) relate to `profiles.timezone` — added an explicit Conventions
  entry so this is a stated rule, not an inference from scattered examples.

**What this pass confirmed was already correct** (verified, not just
re-read): the observation→signal→inference→confidence→decision hierarchy,
Decision Minimalism/N-of-1 principle and its documented exceptions, the
offline/sync scenario matrix and idempotency strategy, exercise-data
governance fields, versioning columns on `programme_decisions`/
`personal_response_models`, abstention as a first-class outcome across
Layers 2/4/6, the data-minimisation review on `profiles`, the GDPR
deletion-vs-auditability category split, the BodyScan security acceptance
criteria, the RLS test matrix, the AI coach tool-permission classes, the
failure/degradation-mode table, and the `OPEN_QUESTIONS.md` A/B/C
classification (finding upheld: no item blocks Phase 1). No product code
was written or modified; no `OPEN_QUESTIONS.md` item was resolved by
guessing.
