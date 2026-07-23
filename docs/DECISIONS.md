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
- **Design token seed values retained from the brief without
  modification** (`DESIGN_SYSTEM.md` §3): the light-theme palette in
  `MASTER_SPEC.md` §33 was adopted as-is for this phase. No technical
  blocker was found to justify deviating from it; dark-theme values and the
  full derived semantic scale are intentionally left for actual design
  work rather than invented here, to avoid this document asserting visual
  decisions with no design review behind them.
