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

## 2026-07-23 — Phase 1: Design system / application shell

Full context: `docs/IMPLEMENTATION_PLAN.md` Phase 1. First product-code
phase — implements the semantic design tokens, shared UI primitives, and
the full `docs/ROUTES.md` route-group shell as placeholder/visual screens.

- **Test runner: Jest via `jest-expo`, with `@testing-library/react-native`
  for component tests and `expo-router/testing-library` for the tab-shell
  smoke test.** This is the "first real domain logic" test-runner decision
  `CLAUDE.md`/`IMPLEMENTATION_PLAN.md` call for. Chosen because it's Expo's
  own supported preset (correct RN/Metro transform handling out of the box)
  and pairs with `expo-router`'s own testing helpers for route-level tests,
  avoiding a second, differently-configured test runner later.
  **Pinned to `@testing-library/react-native@^14.0.1`** (not the newer
  default) deliberately — that version still matches this project's
  `expo-router@~57.0.8`, whose bundled `renderRouter` helper calls the
  library's `render()` without awaiting it. Testing-library v14 made
  `render()`/`fireEvent` asynchronous (supporting React 19 concurrent
  rendering); an un-awaited `renderRouter()` call under v14 leaves the
  `screen` singleton unbound and every query fails with "render function
  has not been called". Fixed by explicitly `await`-ing `renderRouter(...)`
  in the smoke test (the extra `getPathname`/`getSegments` helpers
  `renderRouter` attaches to its return value are lost once awaited, since
  they're assigned onto the pending Promise object rather than its resolved
  value — not needed for this phase's tests, so not worked around further).
  A same-version downgrade to `^13.x` (the version range `expo-router`
  actually declares as its peer/dev dependency) was considered and rejected
  — it collides with this project's exact-pinned `react@19.2.3` via
  `react-test-renderer`'s peer requirements and would need a broader
  dependency change outside this phase's scope for a problem the `await`
  fix already solves cleanly.
- **`jest`'s own `transformIgnorePatterns` left unset, deferring entirely to
  `jest-expo`'s default.** An initial attempt hand-rolled a narrower
  pattern, which silently dropped `standard-navigation` (an `expo-router`
  dependency) from the transform allowlist and broke every route-level
  test with an ESM parse error. `jest-expo`'s own default pattern already
  covers every Expo/React Navigation package this project depends on, so
  overriding it was unnecessary risk for no benefit.
- **CSS imports (`src/global.css`, via `src/constants/theme.ts`) mapped to
  an empty stub (`jest/cssMock.js`) under Jest**, since Jest's transform
  pipeline (unlike Metro/webpack) has no built-in CSS loader and the import
  exists only for web-platform CSS custom properties consumed by the
  `Fonts.web` token, which the token module still needs to import
  unconditionally for a single source of truth across platforms.
- **Theme/manual-override state is in-memory only for this phase**
  (`src/hooks/use-theme-preference.tsx`) — there is no persistence layer
  until Phase 2, so a manual light/dark override in Profile → Units resets
  on relaunch rather than being backed by a fake persisted preference.
- **Icon vocabulary implemented via `expo-symbols`** (SF Symbols on iOS,
  Material Symbols on Android/web) rather than adding an icon font
  dependency — it was already a project dependency, and every icon name
  used in this phase's registry (`src/components/ui/icon.tsx`) was verified
  to exist in both platforms' underlying symbol sets before use, rather
  than assumed.
- **Route-group shell built to match `docs/ROUTES.md` exactly, including
  every P1/P2-adjacent route** (e.g. `coach/motivation-profile`,
  `progress/bodyscan/*`), per `IMPLEMENTATION_PLAN.md` Phase 1's "placeholder
  screens (no real data)" deliverable — not just the screens this phase's
  task brief calls out for full visual polish (Welcome, Today, Plan,
  Progress, Coach, Profile, Workout Overview/Active/Summary, Goal
  Selection, Body Goal Map). Screens outside that explicit list render a
  themed `PlaceholderScreen` naming which later phase wires them up, so the
  full navigation graph is real and inspectable without any dead links,
  while effort concentrates on the screens actually specified in detail.
- **No auth/onboarding route guards wired yet.** `docs/ROUTES.md` §3's
  three guard conditions all depend on session/profile state that doesn't
  exist until Phase 2 (Supabase Auth) and Phase 3 (onboarding writes).
  Building guard logic against fake/hardcoded session state was rejected as
  exactly the kind of hack `docs/IMPLEMENTATION_PLAN.md`'s task brief warns
  against ("do not fake logged-in state architecture with hacks that will
  need rewriting"). Instead, the root route (`src/app/index.tsx`) redirects
  unconditionally to Welcome, and Welcome carries a `__DEV__`-only shortcut
  straight into the tab shell — satisfying the brief's explicit ask for "an
  appropriate development-preview entry strategy" without pretending
  authentication exists.

### Bugs found and fixed during visual verification (`npx expo export --platform web` + headless-Chromium screenshots)

- **`Link asChild`-wrapped buttons silently lost all background styling** —
  the Welcome screen's "Get Started" button rendered as invisible white
  text on the page background, with no button chrome at all. Root cause:
  every `PrimaryButton`/`SecondaryButton`/`TertiaryButton`/`IconButton`/
  `InteractiveCard` spread `{...pressableProps}` _after_ their own
  `style`/`accessibilityRole`/`disabled` props on the inner `Pressable`.
  `expo-router`'s `Link asChild` clones its child and injects its own
  (often-`undefined`) `style`/`onPress`; spread order in JSX means the
  later prop wins, so the injected `style: undefined` silently overwrote
  the button's own computed style function. Fixed by moving
  `{...pressableProps}` to spread _first_ in all five components, so the
  component's own props always win — verified by re-screenshotting Welcome
  before/after. This is a general risk for any custom component intended
  to work under `asChild`, not just these five; the ordering is called out
  in a comment at the top of `button.tsx` so it isn't silently reintroduced.
- **Today screen's Quick/Minimum buttons overflowed their card** on a
  360–390px-wide viewport — two `fullWidth` `SecondaryButton`s in a row
  size to content, not to available space, so their combined width exceeded
  the card. Fixed by wrapping each in a `flex: 1` `View`.
- **Active Workout's weight/reps steppers overlapped** on the same
  viewport width — two large-touch-target (56px) steppers side by side
  need more width than a phone screen provides once card/screen padding is
  subtracted. Fixed by stacking the two steppers vertically, each spanning
  full width with its +/- controls pushed to the row's edges
  (`justifyContent: 'space-between'`) — arguably better one-handed
  ergonomics than the side-by-side layout it replaced, not just a narrower
  fit.
- **Active Workout's Exercise Info / Swap / Report Discomfort row**
  overflowed similarly (`justifyContent: 'space-around'` with no wrap).
  Fixed with `flexWrap: 'wrap'` and a `rowGap`.
- **A render-time `new Date()` call** (Today's time-of-day greeting) and a
  **raw `useColorScheme` import from `'react-native'`** in the root layout
  (bypassing this project's existing hydration-safe wrapper in
  `use-color-scheme.web.ts`) were both replaced with hydration-safe
  equivalents (`src/hooks/use-greeting.ts`; the root layout now imports
  `useColorScheme` from `@/hooks/use-color-scheme`). Both are genuine
  hydration-unsafe patterns on static web export (server-prerendered output
  can disagree with the client's first render).

### Root-causing the "Minified React error #418" console warning (Phase 1 correction pass)

The note above originally flagged a non-fatal, self-healing "Minified React
error #418" (hydration mismatch) that appeared in the browser console on
every route under `npx expo export --platform web`, without a confirmed root
cause. This pass root-caused it rather than re-flagging it:

- **Reproduction attempts, systematically widened:** `expo export --platform
web` (minified, matching the original report) and `--no-minify` /
  `--no-minify --dev` (to get an unminified React warning with a full
  message instead of a numeric code); headless-Chromium (Playwright) console
  and `pageerror`/`window.error` capture installed via `addInitScript` so
  nothing could be missed by timing; every screen named in this phase's
  scope (Welcome, Today, Plan, Progress, Coach, Profile, Body Goal Map,
  Active Workout, Overview) plus `/`; both light and dark
  (`colorScheme` emulation); 3 repeated attempts per route; CPU throttling
  (6×) and network throttling (500 kbps / 200 ms latency) to expose any
  timing-dependent hydration race. **Zero hydration warnings, errors, or
  `#418` reproductions across all of the above** — 30+ route/attempt
  combinations, all clean.
- **Conclusion:** the two hydration-unsafe patterns fixed immediately above
  (raw `useColorScheme` bypassing the hydration-safe wrapper; render-time
  `new Date()`) were the actual root cause. Both are textbook triggers for
  error #418 (a value that differs between the server-prerendered pass and
  the client's first render before hydration completes) and both are now
  fixed at the source, not papered over — no `suppressHydrationWarning`, no
  timing hacks, no console suppression anywhere in the codebase.
  The original note's claim that the warning "persists" after those fixes
  could not be reproduced under any tested condition on this branch's
  current code; it's superseded by this verification.
- **Outcome: zero hydration errors**, matching this phase's bar for
  merge-readiness.
- **What to monitor going forward:** any future code that reads
  `useColorScheme` directly (bypassing `@/hooks/use-color-scheme`), computes
  time/date/locale/random values at render time instead of behind a
  post-mount effect, or renders conditionally on a browser-only global
  (`window`, `document`) without an effect-gated check, reintroduces exactly
  this class of bug. If a hydration warning resurfaces on a future Expo SDK
  upgrade, check that upgrade's changelog for SSG/static-rendering changes
  first, since the two fixes above are the only known-necessary guards this
  codebase relies on.

## 2026-07-23 — Phase 1 correction pass

A pre-merge correction pass on PR #5, addressing four issues found on
review before merge. Strictly within Phase 1 scope — no Supabase, auth
backend, database, AI, programme generation, BodyScan storage,
notifications, or payments were touched.

- **Theme source-of-truth unified.** The root layout previously derived the
  Expo Router / React Navigation theme directly from `useColorScheme`,
  independently of `ThemePreferenceProvider`/`useTheme` (which Murphy UI
  components already used and which supports a manual system/light/dark
  override). A manual override could therefore update app content without
  updating navigation chrome. Fixed by adding `useNavigationTheme`
  (`src/hooks/use-navigation-theme.ts`), which derives the React Navigation
  `Theme` from the same resolved `useTheme()` every component already
  consumes, and restructuring the root layout
  (`AppNavigation` inner component, still inside `ThemePreferenceProvider`)
  to consume it. One resolution path now feeds both; verified visually
  (Profile → Units & Appearance, System/Light/Dark/System, screenshots in
  both) that screen surfaces, text, tab bar, and navigation chrome move
  together, and confirmed with `src/hooks/__tests__/use-theme.test.tsx` and
  `use-navigation-theme.test.tsx`.
- **Active tab no longer relies on colour alone.** `TabBarIcon`
  (`src/components/ui/tab-bar-icon.tsx`) adds a filled pill behind the
  active tab's icon, and the tab label switches to a bolder weight when
  focused — both driven by React Navigation's `focused` state, independent
  of the active/inactive tint colours. Deliberately restrained (one pill,
  one weight step) rather than multiple simultaneous cues.
- **Body Goal Map upgraded from stacked rectangles to a silhouette.**
  `src/components/onboarding/body-silhouette.tsx` is an original flat-vector
  human silhouette (head/neck/torso/arms/legs as overlapping same-fill,
  no-stroke shapes, so there are no seams) built with `react-native-svg`
  (added at `~15.15.4`, the version this Expo SDK 57 project already
  bundles-compatible-with — no other graphics dependency was introduced).
  It is deliberately neutral (no skin tone, no facial features, no gendered
  markers) and shared between front and back views; only the selectable
  region overlays differ per view. `body-map.tsx` renders soft rounded
  region overlays on top (matching the existing app-wide "selection card"
  visual language) with fill _and_ a stroke outline _and_ a checkmark badge
  when selected — selection is legible without colour. The accessible
  `Pressable` hit-areas (`accessibilityRole="checkbox"`,
  `accessibilityState`, `accessibilityLabel`) are unchanged in contract from
  the previous implementation and share the exact same `onToggle`/
  `selectedIds` state as the list-based fallback below it, so tapping either
  produces identical state. No new selectable regions were invented beyond
  what `src/dev/previewData.ts` already defined.
- **React error #418 root-caused, not re-flagged.** See the dedicated
  "Root-causing…" entry above. Conclusion: the two hydration-unsafe patterns
  already fixed earlier in Phase 1 (raw `useColorScheme` import; render-time
  `new Date()`) were the actual cause. With both fixed, extensive
  re-verification (light/dark, throttled CPU/network, unminified builds,
  repeated attempts, every named screen) reproduces **zero** hydration
  warnings under `expo export --platform web`.
- **Visual review:** re-inspected Welcome, Today, Plan, Progress, Coach,
  Profile, Goal Selection, Body Goal Map, and Active Workout/Overview in
  light and dark at phone width (375–390px). No further genuine defects
  found — no overflow, no clipped text, consistent spacing/contrast/touch
  targets. Nothing was redesigned beyond the four fixes above.
- **Route-shell duplication:** reviewed all 18 placeholder routes and
  confirmed each already delegates to the shared `PlaceholderScreen`
  component with only `icon`/`title`/`description` props — no duplicated
  layout code to centralise, so nothing was changed here.
- **Tests added:** `use-theme.test.tsx` (3), `use-navigation-theme.test.tsx`
  (2), `tab-bar-icon.test.tsx` (2), `body-map.test.tsx` (3) — 10 new tests.
  Full suite: `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npx jest` (11 suites / 26 tests), `npx expo export --platform web` all
  pass clean.

## 2026-07-23 — Phase 2A: Supabase / Auth / Database / RLS

Full context: `docs/IMPLEMENTATION_PLAN.md` Phase 2. First phase to touch a
real backend — Supabase client foundation, real Supabase Auth screens,
every P0 migration + RLS policy from `docs/DATABASE_SCHEMA.md`, and an
automated RLS test suite. No remote Supabase project was connected (no
credentials were supplied this phase, per its own brief) — see
`docs/SUPABASE_SETUP.md` §6 for the Phase 2B plan.

- **Session storage architecture: `@react-native-async-storage/async-storage`
  as the Supabase Auth `storage` adapter**, with `autoRefreshToken: true`,
  `persistSession: true`, `detectSessionInUrl: false`, and an `AppState`
  listener calling `auth.startAutoRefresh()`/`stopAutoRefresh()` on
  foreground/background — the current official Supabase Expo/React Native
  guidance. Chosen over `expo-secure-store` because Supabase's session
  payload (access + refresh token, user metadata) can exceed SecureStore's
  ~2KB per-item limit on some platforms, and AsyncStorage already has a
  working web implementation (`localStorage`), giving one storage strategy
  across iOS/Android/web rather than a platform-specific split. The
  Supabase client itself is a lazily-created module-level singleton
  (`src/services/supabase/client.ts`) — created once, never per-render —
  with the `AppState` listener attached exactly once via a module-level
  guard.
- **`AuthProvider` accepts an injectable `client` prop** (defaulting to the
  real singleton), and a parallel `src/test-utils/mock-supabase-client.ts`
  factory — the test/mocking boundary the phase brief requires. Every
  auth-adjacent Jest test (AuthProvider state machine, route guards, the
  tab-shell smoke test) runs against this mock, never real Supabase
  configuration or a network call.
- **Central route guard, not one per route-group.** `src/hooks/use-protected-route.ts`
  is the single place that decides where a session should be routed
  (`docs/ROUTES.md` §3), wired once at `src/app/_layout.tsx`. Considered
  duplicating guard logic into each of `(auth)`/`(onboarding)`/`(tabs)`/
  `workout`'s own `_layout.tsx` (matching their existing stub comments from
  Phase 1) and rejected it — four independent guards checking the same
  state is exactly how redirect loops and disagreements get introduced;
  one `useEffect` keyed on `(status, segments)` cannot loop against itself.
  Blocking states (initial session load, a boot-time auth error, a
  profile-loading failure) render as an opaque overlay on top of the
  `Stack` rather than replacing it, so `useSegments()`/`useRouter()` always
  have a real navigator to operate against.
- **`profileStatus` tracked separately from top-level auth `status`.**
  `AuthState`'s `signed_in` variant carries its own
  `profileStatus: 'loading' | 'ready' | 'error'` for the
  `profiles.onboarding_completed_at` read the route guard needs
  (`docs/ROUTES.md` §3 rule 2). A same-user re-emission of
  `onAuthStateChange` (e.g. `TOKEN_REFRESHED`, which fires roughly hourly)
  updates the session object in place without resetting `profileStatus`/
  `onboardingCompletedAt` — resetting it every refresh would flicker
  already-visible private content back to a loading state, which the phase
  brief explicitly calls out to avoid. A profile-loading failure renders a
  retry-capable error overlay rather than guessing a redirect (routing an
  already-onboarded user back into onboarding on a transient network blip
  would be a worse failure mode than a visible retry prompt).
- **Phase 1's `__DEV__` "preview app shell" shortcut on Welcome was
  removed, not gated further.** It bypassed onboarding by routing straight
  to `(tabs)/today`; now that real guards exist, keeping it would either
  (a) still bypass the guard if special-cased, which the phase brief
  explicitly forbids, or (b) immediately bounce back to Welcome if not
  special-cased, making it dead/confusing UI. Welcome's primary CTA now
  points at Sign Up per `docs/SCREEN_SPECIFICATIONS.md` §1 (Phase 1 had
  wired it directly to onboarding since no auth existed yet).
- **Deep-link redirect-target preservation (`docs/ROUTES.md` §7) is not
  implemented this phase.** The route guard redirects an unauthenticated
  deep link to Welcome but does not yet carry the original target through
  sign-in and back. No notification-originated deep links exist yet
  (notifications are a later phase per `docs/IMPLEMENTATION_PLAN.md`), so
  there is nothing exercising this path yet; recorded here rather than
  silently assumed done, and worth revisiting once Phase 8+ adds real
  notification deep links.
- **RLS grants are deliberately stricter than "RLS alone": no table grants
  `anon` any privilege at all on a private table.** `docs/DATABASE_SCHEMA.md`'s
  RLS Policy Pattern reference relies on policies to deny cross-user/
  unauthenticated access; this phase additionally omits the underlying
  Postgres `GRANT` for `anon` on every private table, so an unauthenticated
  request fails at the privilege-check level (`insufficient_privilege`)
  before RLS is even evaluated — verified directly in the pgTAP suite.
  Reference tables grant `select` to `authenticated` only (not `anon`
  either) — nothing in this product is meant to be readable without
  signing in, so there was no reason to follow the common example pattern
  of granting `anon` broad read access "just in case."
- **`personal_records` and `performance_metrics` grants are tighter than
  `docs/DATABASE_SCHEMA.md`'s literal per-table ownership line.**
  `performance_metrics` is explicitly documented as server-job-written —
  implemented as `select`-only for `authenticated`. `personal_records` is
  documented only as `profile_id = auth.uid()` (the schema doc's default
  CRUD pattern would technically apply), but this phase grants `select` +
  `insert` only, deliberately omitting `update`/`delete` — an achieved
  personal record is app-computed history (`submitWorkout`,
  `docs/API_CONTRACTS.md` §8), not something a client should be able to
  quietly edit or remove after the fact. Recorded here as a deliberate
  tightening beyond the schema doc's terse wording, not a silent
  reinterpretation of it.
- **`biological_sex` left as unconstrained nullable text in the `profiles`
  migration**, not a guessed enum. `docs/OPEN_QUESTIONS.md` #1 classifies
  the exact field shape as an open product/clinical decision blocking
  Phase 3, not this phase — inventing a specific constraint now would
  silently resolve that open question by guessing, which `CLAUDE.md`
  and `docs/DECISIONS.md`'s own precedent both rule out. Phase 3 adds the
  real constraint alongside the Basic Profile screen once that decision is
  made.
- **Reference-table content seeding was split by whether the source
  document gives a closed enumeration.** `goals` (`docs/MASTER_SPEC.md` §7)
  and `movement_patterns` (§9) are fixed, closed lists explicitly spelled
  out in the spec — seeded directly by migration, since they're structural
  taxonomy, not authored content. `equipment`, `muscles`,
  `body_area_muscle_map`, and `exercises` all use "e.g." / illustrative
  examples in the spec, not closed lists — populating them meaningfully
  requires the same exercise-science content judgement as the exercise
  library itself (`docs/IMPLEMENTATION_PLAN.md` Phase 4), so this phase
  leaves those tables empty (structure only) rather than inventing a
  partial dataset Phase 4 would then have to reconcile with.
- **`minimum_password_length` raised from Supabase's default 6 to 8**
  (`supabase/config.toml`), matched by the client-side minimum in
  `src/domain/auth/validation.ts` — a low-effort, uncontroversial security
  baseline for a consumer app handling health-adjacent data, applied
  consistently at both layers so validation never disagrees between them.
- **`supabase/config.toml auth.email.enable_confirmations = true`, even for
  local dev** — the product requires email verification
  (`docs/SCREEN_SPECIFICATIONS.md` §1 Verify Email), so local dev matches
  production behaviour rather than diverging from it and leaving the
  Verify Email screen's real behaviour untested until a remote project
  exists.
- **Local Postgres RLS-verification harness** (`scripts/local-pg-harness/`,
  not part of `supabase/migrations/`): Docker is unavailable in the Claude
  Code cloud sandbox this phase was developed in, so the real
  `supabase start`/`supabase test db` stack could not run there. A bare
  PostgreSQL 16 instance was available, so this harness reproduces the
  minimal `auth`/`storage` schema primitives (`auth.users`, `auth.uid()`,
  `storage.buckets`/`objects`/`foldername()`) a real Supabase project
  already provisions, letting the exact same migration SQL run against
  plain PostgreSQL with its RLS policies genuinely exercised — every
  migration was confirmed to rebuild cleanly from an empty database, and
  the full 145-assertion pgTAP suite was run against it with `pg_prove`
  and passed. This is explicitly a supplementary, already-executed
  verification for an environment without Docker, not a replacement for
  `.github/workflows/ci.yml`'s `database` job, which runs the same suite
  against the real local Supabase stack on GitHub-hosted runners as the
  independent, authoritative source of truth. Two genuine bugs were found
  and fixed by actually running this harness rather than only reading the
  SQL: a data-modifying CTE nested inside a pgTAP assertion's argument list
  (`WITH ... SELECT ...` must be the top-level query, not a subquery
  argument — Postgres rejects the nested form) and a missing default
  privilege grant for `service_role` on `public`-schema tables (`bypassrls`
  only bypasses RLS policies, not ordinary `GRANT`-based permission
  checks — a real Supabase project provisions `service_role`'s full-table
  access as a platform default outside application migrations, which the
  harness had to reproduce explicitly).
- **`src/types/database.ts` generated by direct `information_schema`
  introspection against the verified local-harness schema, not hand-typed
  from the migration SQL by inspection.** `supabase gen types typescript`
  (both `--local` and `--db-url` forms) itself requires Docker in this CLI
  version, which also isn't available in this sandbox. Introspecting the
  already-migrated, already-RLS-tested harness database directly and
  mechanically generating `Row`/`Insert`/`Update` shapes (nullability and
  optionality derived from each column's actual `is_nullable`/
  `column_default`) is a closer match to "prefer generation from the
  actual local schema when the environment permits" than hand-transcribing
  the schema a second time would have been — enum-like `text` columns were
  then annotated with literal union types matching each migration's
  `CHECK` constraint. Regenerate with the real CLI command once Docker is
  available (`docs/SUPABASE_SETUP.md` §2); do not hand-edit table shapes
  without updating the owning migration.
- **Secret-leak prevention (`scripts/check-no-secrets.js`) checks for
  patterns, not one exact string**: any `EXPO_PUBLIC_*` variable name that
  looks privileged (contains SERVICE/SECRET/PRIVATE/ADMIN/PASSWORD/TOKEN),
  any JWT-shaped string that decodes to a non-`anon` role claim, any
  literal `sb_secret_`-prefixed value, and confirmation that only
  `.env.example` (never a real `.env`) is committed. Deliberately does
  _not_ grep for the literal string "service_role" in `src/`, since that
  phrase legitimately appears in this codebase's own explanatory comments
  (e.g. "never a service-role key") and in `supabase/`'s SQL comments
  about the real Postgres role of that name — a naive substring check
  would either false-positive on those or need per-file exceptions that
  quietly weaken the check over time. Run locally against source only, and
  in CI additionally against the `npx expo export --platform web` output
  directory, matching `docs/ACCEPTANCE_CRITERIA.md` #3's "verified by an
  automated build-artifact check."

## 2026-07-24 — Phase 2A CI correction pass (PR #6, GitHub Actions run 30052333327)

The Phase 2A PR's `database` CI job (`supabase test db --local` against the
real local Supabase stack — the authoritative test path per
`docs/SUPABASE_SETUP.md` §5) failed on the CI run following the PR's
opening, despite the Docker-free `scripts/local-pg-harness/` run reporting
all 145 assertions passing. This entry records the root causes and fixes;
both were genuine defects the harness's own simplifications had masked,
not flaky tests.

- **`service_role` had no table privileges on any `public`-schema table.**
  The prior Phase 2A entry above states the harness needed an explicit
  default-privilege grant for `service_role` because "a real Supabase
  project provisions `service_role`'s full-table access as a platform
  default outside application migrations" — that assumption was wrong for
  this project's own migrations against the real local stack:
  `supabase/tests/database/11_privileged_service_role.sql` failed every
  assertion with `permission denied for table profiles`/`exercises`/
  `personal_response_models`/`performance_metrics`/`programmes`
  (`42501`), because no migration ever granted `service_role` anything —
  only `authenticated` was ever granted, per-table. `bypassrls` bypasses
  RLS _policies_, not ordinary Postgres `GRANT`-based privilege checks, so
  without an explicit grant `service_role` had no access at all. Fixed in
  `supabase/migrations/20260723091900_service_role_grants.sql`: `grant all
on all tables/sequences in schema public to service_role`, plus a
  matching `alter default privileges` so later migrations don't need to
  repeat it. This is a broad grant, but scoped to a role that is never
  reachable by a client (server-only secret key, Edge Functions only) —
  not a weakening of the `anon`/`authenticated` boundary, which is
  untouched.
- **A pgTAP test assumed a Postgres-level DELETE, not the real Supabase
  Storage API's behaviour.** `supabase/tests/database/08_bodyscan.sql`
  directly `delete from storage.objects ...` to assert ownership-scoped
  RLS on Storage objects. Against the real stack this died on Supabase
  Storage's `protect_delete` statement-level trigger — a safety net,
  unrelated to RLS, that rejects any direct SQL `DELETE` on
  `storage.objects` unless the session-local
  `storage.allow_delete_query` setting is `true` (the Storage API sets
  this itself before its own deletes, specifically to catch
  orphaned-file bugs from raw SQL). Fixed by setting that flag
  immediately before each direct `DELETE` in the test, mirroring what the
  real Storage API does, so the RLS ownership policy is what's actually
  exercised. Added one new regression assertion (`throws_like`,
  `plan(17)` → `plan(18)`) confirming the trigger itself rejects a direct
  delete without the flag — the exact defect class that let this slip
  through undetected the first time.
- **`scripts/local-pg-harness/` did not reproduce the `protect_delete`
  trigger**, which is why it didn't catch the bug above. Added an
  equivalent trigger to `00_auth_storage_shim.sql` so the harness now
  fails the same way the real stack does when this class of bug
  recurs. The harness's PostgreSQL-16-vs-`config.toml`'s-Postgres-17
  version gap (no PGDG package reachable from the sandbox to install 17)
  is the likely reason this specific trigger wasn't already present —
  documented explicitly in the harness `README.md` as a known limitation
  rather than left implicit, per this correction pass's brief not to
  describe the harness as equivalent to the real stack. Re-verifying this
  pass's fixes from a genuinely from-scratch database (`dropdb`/`createdb`,
  no manual pre-setup) also surfaced a second, previously-masked harness
  gap: the harness's `extensions` schema was never added to the database's
  `search_path`, so `supabase/tests/database/00_setup.sql`'s own
  `create extension pgtap with schema extensions` left `plan()` and every
  other pgtap function unreachable by their unqualified names — this had
  gone unnoticed only because an earlier manual verification step had
  pre-installed pgtap into `public` directly, masking it. Real Supabase
  projects put `extensions` on `search_path` by default for exactly this
  reason; fixed with `alter database ... set search_path = public,
extensions` in `00_auth_storage_shim.sql`.
- **Table count arithmetic in the original PR description was wrong.**
  It stated "40 P0 tables + 3 P1-reserved = 44." `docs/DATABASE_SCHEMA.md`
  §17's table lists 41 P0 tables (recounted directly from the doc, not
  from memory) + 3 P1-reserved = 44 — the total (44) was right, matching
  all 44 `create table public.*` statements across
  `supabase/migrations/`, but the P0/P1 breakdown was misstated. No
  schema change; only the reported breakdown was wrong.
- **Password-recovery completion was audited and found incomplete**, per
  this correction pass's brief: `resetPasswordForEmail` sent no
  `redirectTo`, `supabase/config.toml`'s `additional_redirect_urls` only
  allowed localhost web URLs, no route existed to receive a recovery deep
  link, and no UI existed to set a new password — the flow could send an
  email but never complete. Implemented the full client-side lifecycle:
  `resetPasswordForEmail` now sends `redirectTo: Linking.createURL('reset-password')`;
  `supabase/config.toml` allows `murphymethod://**`/`exp://**` locally;
  a new `AuthState` status (`password_recovery`, distinct from
  `signed_in` — Supabase emits a real session on `PASSWORD_RECOVERY`, but
  it must never be treated as an ordinary authenticated session) is set
  from that `onAuthStateChange` event; `useProtectedRoute` gained a fourth
  guard rule (`docs/ROUTES.md` §3) forcing that session onto
  `(auth)/reset-password` exclusively, overriding the normal
  signed-in-routes-into-the-app rules; the new screen collects and
  confirms a new password (reusing `validatePassword`/
  `validatePasswordConfirmation`) and calls a new
  `updatePasswordAndSignOut` (`auth.updateUser` then `auth.signOut`, so
  the user returns to Sign In with the new password rather than a
  lingering recovery-scoped session). The one piece genuinely deferred to
  Phase 2B is the remote project's own dashboard redirect-URL allow-list
  entry (no remote project exists yet this phase) — documented precisely
  in `docs/SUPABASE_SETUP.md` §6 rather than left for Phase 2B to
  rediscover.

## 2026-07-24 — Phase 2B: hosted Supabase deployment infrastructure (pre-credential prep)

Full context: this phase's brief was to build everything that safely can be
built _before_ a real hosted Supabase project and its credentials exist,
then stop at that boundary. No remote project was created; no credentials
were requested, received, or committed. Repository-side deliverables:
`.github/workflows/deploy-supabase-dev.yml`, `scripts/verify-hosted-schema.sql`,
`docs/PHASE_2B_HOSTED_SETUP.md`, `docs/PHASE_2B_HOSTED_VERIFICATION.md`, a
`db:gen-types:remote` npm script, and a `docs/SUPABASE_SETUP.md` §6 update.

- **Deploy workflow is `workflow_dispatch`-only, gated by a GitHub
  Environment (`supabase-development`).** Considered running it on push to
  a `develop`/`staging` branch instead; rejected per this phase's explicit
  brief ("Do not automatically deploy database migrations on every push")
  and because a database migration is a materially higher-consequence
  action than a code deploy — an accidental push to the wrong branch should
  never apply schema changes to a real project. The Environment binding
  (rather than plain repository secrets) additionally allows an optional
  required-reviewer gate to be configured in repo settings without any
  workflow-file change, and scopes the credentials so they're not
  automatically available to every other workflow in the repo.
- **Credentials passed to the Supabase CLI via environment variables, not
  CLI flags.** `supabase link`/`db push`/`test db` read `SUPABASE_ACCESS_TOKEN`
  and `SUPABASE_DB_PASSWORD` from the process environment (the CLI's own
  supported non-interactive auth path) rather than `--password`/`--token`
  flags, so neither value is ever visible in a process listing or a
  workflow log line, on top of GitHub's own automatic secret-masking.
- **`SUPABASE_PROJECT_ID` is a GitHub Variable, not a Secret.** A project
  ref alone grants no access without the paired access token/db password,
  so it isn't sensitive — keeping it out of the workflow file as a Variable
  (rather than hardcoding it, which this phase's brief explicitly forbids)
  means the same workflow file works for any project id set later without
  a code change, while a regex sanity check (`^[a-z0-9]{20}$`) in the
  workflow's first step guards against an empty or obviously-malformed
  value silently linking to an unintended target.
- **Password-recovery redirect URL documented as `murphymethod://reset-password`
  (exact, no wildcard) for the hosted project's dashboard, not
  `murphymethod://**`.** `supabase/config.toml`'s local-dev
  `additional_redirect_urls` already uses the wildcard form (Phase 2A
  correction pass), and that remains correct for local dev. This phase's
  brief specifically asks for "the most specific production/development-safe
  redirect pattern possible" and warns against "overly broad wildcard
  redirects for production configuration" — the app only ever calls
  `Linking.createURL('reset-password')` (`src/state/auth/auth-context.tsx`),
  a single fixed path, so the hosted project's allow-list needs nothing
  broader than that one exact entry. Supabase's redirect-URL matching
  compares the URL ignoring query/fragment, so the PKCE `?code=...` (or
  implicit-flow fragment) Supabase appends on top of `redirectTo` does not
  require a wildcard to still match. The broader `exp://**` pattern is
  documented separately (`docs/PHASE_2B_HOSTED_SETUP.md` §F) as an
  explicitly opt-in, development-only addition for testing via Expo Go
  specifically (whose own local address is not a fixed string), not part
  of the default hosted-project configuration.
- **Hosted schema verification is a plain SQL script run via `psql`
  (`scripts/verify-hosted-schema.sql`), not a new pgTAP test file added to
  `supabase/tests/database/`.** The brief explicitly requires not weakening
  or renumbering the existing mandatory 146-assertion local suite; a
  separate script run only from the deploy workflow (against the linked
  hosted project, in addition to `supabase test db --linked` also running
  the real pgTAP suite there) keeps the two verification paths — CI-mandatory
  pgTAP vs. deploy-time structural check — independent and neither one able
  to silently mask a regression in the other. This script was written
  against, and actually executed against, a from-scratch migration of every
  file in `supabase/migrations/` on this sandbox's bare-PostgreSQL harness
  (`scripts/local-pg-harness/`, the same approach Phase 2A used, Docker
  still being unavailable in this sandbox) — confirmed to pass on a
  correctly-migrated schema and, deliberately, to fail loudly (non-zero
  `psql` exit code) when RLS was manually disabled on a table and when an
  `anon` grant was manually added to a private table, so its failure path
  is verified by execution, not just by reading the SQL. It is not a
  substitute for `supabase test db --linked`, which the workflow also runs.
- **No automated hosted smoke-test harness (real signup/RLS-as-a-real-user
  automation) built this phase.** Evaluated and explicitly declined — full
  reasoning in `docs/PHASE_2B_HOSTED_VERIFICATION.md` §5. Summary: the
  authoritative RLS claim is already covered by `supabase test db --linked`
  against the real database roles; a safe automated version would need
  privileged service-role cleanup credentials in CI for a project that
  doesn't yet hold real user data, which is disproportionate secret-handling
  surface for a check that only needs to run once per hosted deploy, not
  per-commit. A precise manual test plan was written instead
  (`docs/PHASE_2B_HOSTED_VERIFICATION.md` §2–4), to be executed once the
  hosted project actually exists — not claimed as already passing, since it
  hasn't run yet.
- **Remote type generation (`db:gen-types:remote` npm script) added but not
  invoked.** `src/types/database.ts` is left exactly as Phase 2A generated
  it (harness introspection, `docs/DECISIONS.md`'s Phase 2A entry) —
  running `supabase gen types typescript --project-id ...` against a real
  hosted project is meaningless before one exists, and the brief explicitly
  says not to overwrite the committed contract without one. The script
  exists so the later, real invocation is a single documented command
  rather than something to be reconstructed at Phase 2B's next session.
- **`app.json`'s existing `scheme: "murphymethod"` was left unchanged** —
  it already matches every reference in Phase 2A's password-recovery
  implementation (`PASSWORD_RECOVERY_REDIRECT_PATH`, `supabase/config.toml`'s
  local `additional_redirect_urls`, the auth-context tests' `createURL`
  mock). No Android package identifier (`android.package`) or iOS bundle
  identifier (`ios.bundleIdentifier`) is set in `app.json` yet — neither is
  needed for anything in this phase (they matter for app-store builds/push
  notification credentials, not for the Supabase Auth redirect flow), so
  none was invented; assigning real values is a decision for whoever owns
  the app-store listings, not an architecture default to guess here.

## 2026-07-24 — Phase 2B correction pass: hosted verification connectivity

An independent review of the Phase 2B PR (#7) before any hosted project
existed found a real deployment blocker in the design above, not yet a
failure anyone could have observed by running it (no hosted project has
been created): the hosted structural-verification step connected directly
to `postgresql://postgres:...@db.<project-ref>.supabase.co:5432/postgres`.
Current Supabase guidance is that this hostname resolves to an IPv6
address by default on any project without the (paid) IPv4 add-on, and
GitHub-hosted Actions runners do not have IPv6 egress — so that step was
not reliably runnable on the exact infrastructure this workflow is
designed to run on. Caught by re-reading current Supabase connectivity
documentation against the actual runner environment, not by a failed run.

- **Fix chosen: fold the structural checks into the existing pgTAP suite
  as `supabase/tests/database/12_hosted_structural_verification.sql`,
  and drop the separate `scripts/verify-hosted-schema.sql` / direct
  `psql` connection entirely**, rather than adding a Supavisor
  session-pooler connection string as a new secret. `supabase db push`
  (already required, and already implicitly assumed to work in GitHub
  Actions — it's the deployment mechanism this whole workflow exists to
  run) and `supabase test db --linked` both go through the Supabase CLI's
  own connection handling, the same mechanism Supabase's own official
  GitHub Actions guidance uses for `db push` in CI — not a hand-built
  connection string — so neither hits the IPv6 problem the removed step
  did. This was the brief's own stated strong preference ("use Supabase
  CLI linked-project functionality... avoid requiring an unnecessary extra
  secret merely to work around IPv6") and is also simply less code: one
  set of assertions, run through one mechanism, instead of a pgTAP suite
  plus a separately-connected, separately-maintained SQL script asserting
  overlapping things that could drift apart. No new GitHub secret was
  added — `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD`/`SUPABASE_PROJECT_ID`
  are unchanged from the original Phase 2B entry above. **Caveat, stated
  plainly:** this reasoning is based on current official Supabase CLI/
  GitHub Actions documentation and this project's own already-accepted
  assumption that `supabase db push` works from GitHub Actions (true both
  before and after this correction) — it has not been, and cannot yet be,
  proven against a real hosted project in this sandbox (no network egress
  to Supabase's API, no credentials). `docs/PHASE_2B_HOSTED_VERIFICATION.md`
  §1 still says so explicitly, and the first real deploy run is the actual
  proof.
- **The new pgTAP file was written and executed for real**, the same
  discipline every prior verification claim in this document follows: 44
  exact-table-set check via pgTAP's `tables_are()` (replaces three
  separate hand-written checks in the removed script with one
  purpose-built pgTAP function — missing tables, unexpected tables, and
  wrong count all fail the same single assertion), per-table RLS/
  `service_role`-privilege checks generated from `pg_tables` (88
  assertions), 3 `has_function()` checks, 1 `anon`-grants check, 2
  BodyScan-bucket checks — 95 assertions total. Run via `pg_prove` against
  a from-scratch migration of every file in `supabase/migrations/` on this
  sandbox's bare-Postgres harness (`postgresql-16-pgtap` installed for
  this purpose, since it wasn't already present): the full 13-file,
  241-assertion suite passes clean, and — mirroring the negative-test
  discipline used to verify `scripts/verify-hosted-schema.sql` originally
  — manually disabling RLS on `profiles` and manually granting `anon`
  `SELECT` on `profiles` each independently made exactly the expected
  single assertion fail, confirming the failure path works, not just the
  success path.
- **Failure summary rewritten to be phase-aware.** The prior version's
  static "Nothing further was applied" on any failure was inaccurate
  whenever `supabase db push` itself had already succeeded and a later
  step (verification) failed — the schema would already be live on the
  hosted project at that point. The job summary step now reads
  `steps.<id>.outcome` for the dry-run/push/verify steps and reports one
  of three distinct states: failed before any migration was applied
  (validation/link/dry-run); failed while applying migrations, with an
  explicit note that `supabase db push` applies and records migrations
  one at a time so a partial application is possible and
  `supabase migration list --linked` should be checked before retrying
  (not assumed rolled back — `db push` does not wrap the whole batch in
  one transaction); or migrations applied successfully but verification
  failed, stated plainly as "the schema has already changed" rather than
  implying safety.
- **`ref` workflow input removed; the checkout step now hardcodes
  `ref: main`.** The brief's own concern — this is operated by a
  non-technical user from an Android browser, and GitHub's
  workflow_dispatch UI always offers a "Use workflow from" branch
  selector regardless of whether the workflow itself declares a `ref`
  input — means the previous free-text `ref` input added a way to type an
  arbitrary, potentially-unreviewed branch/tag/SHA into a form field, and
  even removing that input alone would not have stopped someone using
  GitHub's own branch selector to run the workflow _definition_ from a
  different branch. Hardcoding the checkout step's `ref: main` closes both
  paths at once: whichever branch the workflow is triggered from, the
  checkout step always fetches `main`, so only reviewed, merged migration
  code can ever reach `supabase db push`. A future production workflow
  needing a different (e.g. tag-based) promotion model should make that
  an explicit, separate decision in its own file, not a reason to loosen
  this one.

## 2026-07-24 — Phase 2B correction pass: real CI failure (anon default table privileges)

The previous correction pass's fixes were pushed and a real CI run
executed against the real local Supabase stack (`.github/workflows/ci.yml`,
run 30079837109, `database` job 89438662438). Result: `App` job success,
`database` job **failure** — `supabase start`/`db reset --local` both
succeeded, `supabase test db --local` failed exactly one of 241
assertions: `supabase/tests/database/12_hosted_structural_verification.sql`
test 93, "anon has no privileges on any public-schema table" —
`have: 132, want: 0`. Everything else in that file (the 44-table set via
`tables_are()`, all 44 RLS checks, all 3 function checks, all 44
`service_role`-privilege checks, both BodyScan-bucket checks) passed, as
did every assertion in files 00–11 (the original Phase 2A suite).

- **Root cause:** the real Supabase stack's own project provisioning
  grants `anon` 132 unrevoked table privileges (44 tables × 3 privilege
  types — `SELECT`/`INSERT`/`UPDATE`) across `public` that no migration in
  this repository ever explicitly granted. `docs/DECISIONS.md`'s Phase 2A
  entry already stated the intended design — "no table grants `anon` any
  privilege at all on a private table," enforced at the Postgres
  privilege-check level, not just RLS — but that specific claim had never
  actually been checked at the raw-`GRANT` level against the real stack
  until this pass's new structural test did so; RLS itself was already
  correctly blocking `anon`'s actual data access the whole time (no data
  was ever exposed by this gap), so the _additional_, defense-in-depth
  privilege-level guarantee the design called for was simply never built,
  not a data-exposure incident.
- **Fix:** `supabase/migrations/20260724060000_revoke_anon_default_table_grants.sql`
  — an unconditional `revoke all on all tables/sequences in schema public
from anon`, plus the equivalent `alter default privileges ... revoke`
  pairing (mirroring `20260723091900_service_role_grants.sql`'s
  grant-plus-default-privileges shape for the same reason). Deliberately
  unconditional rather than scoped to a guessed subset of tables: the
  exact mechanism that produced the 132 grants was investigated but not
  conclusively determined (see the harness note below), and an
  unconditional `REVOKE` is a safe no-op on any table that never had the
  grant in the first place, so correctness here does not depend on fully
  understanding the platform's mechanism — only on removing whatever is
  actually there.
- **Investigation of the exact mechanism, and why it stopped short of a
  full explanation:** the arithmetic (132 = 44 × 3) initially suggested a
  uniform default-privilege grant applied to literally every table this
  project creates. That hypothesis was tested directly by reproducing it
  in `scripts/local-pg-harness/00_auth_storage_shim.sql`
  (`alter default privileges in schema public grant select, insert,
update on tables to anon, authenticated`, added before running the
  migrations) — and it was wrong: applying it uniformly broke roughly 35
  assertions across files 01–10 in the harness, including
  `01_reference_tables.sql`'s `anon cannot select from goals`/`exercises`/
  `equipment`/`movement_patterns` (`throws_ok(..., '42501', ...)`
  assertions, which can only pass on a genuine missing-`SELECT`-privilege
  error — RLS itself never raises an error for a blocked `SELECT`, it
  silently returns zero rows), and those exact assertions **passed** on
  the real stack in the same CI run this pass is fixing. That is direct
  proof the real platform's mechanism is not "every table, uniformly, via
  one default-privilege declaration applied by the same role that creates
  them" — something more selective is happening (Supabase's own Data-API/
  role provisioning, not anything in `supabase/migrations/`), and this
  sandbox has no way to inspect it directly (no Docker, no hosted project,
  no way to query the real stack's own bootstrap SQL). Rather than commit
  a harness change proven inaccurate by this project's own evidence, **the
  harness reproduction attempt was reverted** —
  `scripts/local-pg-harness/README.md` records this explicitly (what was
  tried, why it was wrong, and what remains unverified) instead of either
  silently keeping a wrong reproduction or silently dropping the
  investigation.
- **Structural-test robustness redesign
  (`supabase/tests/database/12_hosted_structural_verification.sql`).**
  Independent of the CI failure, audited for a different, related risk: the
  file's RLS and `service_role` checks were driven by scanning `pg_tables`
  directly (`where schemaname = 'public'`), meaning their assertion count
  would silently change if the real `public` schema ever contained
  anything beyond this project's own 44 tables — a legitimate
  Supabase/extension-managed object, for instance — producing a confusing
  "planned 95 but ran N" pgTAP-level failure instead of a clear, named one.
  Redesigned around one explicit allowlist (a temporary table populated
  once from the same 44 names `tables_are()` already checks), with the RLS
  check `LEFT JOIN`-ed against `pg_tables` (a missing table still produces
  a named, failing assertion rather than silently vanishing from the
  count) and the `service_role` check guarded with an explicit `CASE`
  (not `exists(...) AND has_table_privilege(...)`, whose evaluation order
  Postgres does not guarantee — calling `has_table_privilege()` on a
  nonexistent table raises `undefined_table` and aborts the whole file
  rather than failing one assertion). Verified directly, not just by
  design: re-ran against the harness with a table dropped (3 clear, named
  failures — the missing-table check, its RLS check, its `service_role`
  check — plan still exactly 95, no crash) and with an extra unexpected
  table added (exactly 2 failures — the extra-table check and an
  incidental RLS gap from how the test table was created — plan still
  exactly 95, not 97). `plan(95)` and the total assertion count are
  unchanged by this redesign; only the failure-injection paths were
  reworked to be as robust as they claim to be.
- **This is not evidence the harness is now "more equivalent" to the real
  stack — the opposite, made explicit.** The investigation above
  conclusively shows this sandbox cannot currently reproduce this specific
  class of platform behaviour accurately, and guessing further risked
  making the harness actively misleading rather than merely incomplete.
  `supabase test db --local`/`--linked` against the real stack remains the
  sole authoritative signal for the `anon`-privilege check specifically —
  restated here, not just in the harness README, because this is exactly
  the kind of claim `docs/SUPABASE_SETUP.md` and this document's own
  Phase 2A correction-pass entry already warn against overstating.
- **Broader implication flagged, not silently absorbed:** if the real
  platform grants `anon` privileges beyond what migrations declare, it may
  do the same for `authenticated` — which would matter more, since several
  tables' migrations deliberately grant `authenticated` _narrower_ access
  than the schema doc's default CRUD pattern (`programme_versions`/
  `programme_decisions` insert-only; `performance_metrics` select-only;
  `docs/DECISIONS.md`'s Phase 2A entry) as a stated structural guarantee.
  Nothing in this pass's evidence shows that guarantee is actually broken
  — RLS still gates real access regardless, and no test asserting the
  narrower grant has failed — but nothing in this pass proves it's intact
  at the raw-`GRANT` level either, only via RLS behavioural tests, which is
  exactly the gap this whole correction pass exists to close for `anon`.
  Recorded as a flagged, unresolved item in `docs/RISKS.md` risk #5 for
  Phase 11's full audit (`docs/IMPLEMENTATION_PLAN.md`) rather than
  silently assumed fine — re-auditing all 44 tables' `authenticated` grants
  against their individually documented intent is out of scope for this
  infrastructure-focused Phase 2B correction pass.

## 2026-07-24 — Phase 2B correction pass: native auth deep links

**Problem found on review (client-side, no hosted project involved):**
`getSupabaseClient()` set `detectSessionInUrl: false` (correct for native)
but the app had no incoming-link handler at all to replace the browser
behaviour that flag turns off — `signUp`/`resend` sent no
`emailRedirectTo`, and password recovery's `redirectTo` pointed at
`murphymethod://reset-password` with nothing to actually open that link,
exchange its credential, and establish a session. Tapping either email's
link would have landed the OS on the app with no session ever created.

**Fix:**

- `src/state/auth/process-auth-deep-link.ts` — one pure, unit-tested
  function (`processAuthDeepLink`) that classifies an incoming URL
  (ignored / established / failed) against this app's two known redirect
  paths (`verify-email`, `reset-password`), supporting both link shapes
  Supabase can produce for the same email action: PKCE `?code=` (this
  client's configured `flowType`, `src/services/supabase/client.ts`) via
  `exchangeCodeForSession`, and `#access_token=&refresh_token=` via
  `setSession`, kept as a defensive fallback. Never logs the URL or any
  extracted token/code.
- `AuthProvider` (`src/state/auth/auth-context.tsx`) wires this to
  `Linking.getInitialURL()` (cold start) and `Linking.addEventListener('url', ...)`
  (already running), deduping by exact URL string so a link delivered
  twice (a known platform quirk, and distinct from Supabase's own
  single-use-code enforcement) is only ever exchanged once. `signUp` and
  `resend({ type: 'signup' })` now send `emailRedirectTo:
Linking.createURL('verify-email')`.
- **Recovery-vs-signup is decided explicitly, not inferred from
  `onAuthStateChange`.** Investigated the real `@supabase/auth-js`
  behaviour directly (`node_modules/@supabase/auth-js`, not assumed): a
  manual `setSession()` call always emits `SIGNED_IN`, never
  `PASSWORD_RECOVERY`, regardless of what the token pair was for —
  confirming the task's explicit warning was a real, not theoretical, risk.
  `exchangeCodeForSession` _can_ emit `PASSWORD_RECOVERY` correctly, but
  only via a local-storage marker recorded by the original
  `resetPasswordForEmail` call on the same device — a real mechanism, but
  an implicit one this code doesn't rely on. Instead
  `processAuthDeepLink` classifies `kind` explicitly (Supabase's own
  `type` URL param when present, the app's own redirect path as a
  deterministic fallback) and `AuthProvider` sets `state.status` from that
  classification directly, so a recovery session can never fall through
  into an ordinary `signed_in` state regardless of SDK-internal timing.
- Verify Email (`src/app/(auth)/verify-email.tsx`) now surfaces a failed
  signup-link deep-link outcome (malformed / expired / already-used) as
  plain "invalid or expired, resend" copy, sourced from a new
  `AuthContextValue.deepLinkNotice` — using React's "adjust state during
  render" pattern (not a `useEffect` calling local `setState`), since
  `eslint-plugin-react-hooks`'s `set-state-in-effect` rule (already wired
  into this repo's flat config) correctly flagged the first draft of this.
  Reset Password's existing `state.status !== 'password_recovery'` fallback
  already covered the equivalent recovery-side cases without changes.
- `docs/PHASE_2B_HOSTED_SETUP.md` §F and `docs/SUPABASE_SETUP.md` §6
  updated to require both exact redirects (`murphymethod://reset-password`,
  `murphymethod://verify-email`) on the hosted project's dashboard — no
  wildcard — correcting `SUPABASE_SETUP.md`'s previous text, which
  (unlike `PHASE_2B_HOSTED_SETUP.md`) still said `murphymethod://**` was
  required. `docs/PHASE_2B_HOSTED_VERIFICATION.md`'s manual test plan
  gained explicit expired/malformed/duplicate-link checks for both flows.
- Tests: `src/state/auth/__tests__/process-auth-deep-link.test.ts` (pure
  classification/exchange logic — both link shapes, both kinds, error
  params, missing-token, exchange failure, no token/code ever logged) plus
  new cases in `src/state/auth/__tests__/auth-context.test.tsx` (cold-start
  URL, runtime URL, duplicate delivery, recovery never touching the
  profile-loading path, `emailRedirectTo` on `signUp`/`resend`,
  `deepLinkNotice` surfacing and acknowledgement). All prior tests
  continue to pass unmodified in behaviour (95 total).
- No hosted Supabase project was created, modified, or connected to for
  this pass — client-side only, per this task's explicit scope.

## 2026-07-24 — Phase 2B hosted-verification-fix correction pass

**Real CI failure investigated:** GitHub Actions run 30094254573 (job
89485692741), `Deploy Supabase (Development)` — migrations already applied
to the real hosted development project via `supabase db push` (which
succeeded), then `supabase test db --linked` reported `Result: FAIL,
Files=13, Tests=241` with 5 failed assertions across 4 files, all the same
shape: `throws_ok(..., '42501')` expecting an `UPDATE` by `authenticated`
to fail at the raw-grant level, instead reporting "caught: no exception":
`consent_records` (02, test 5), `health_screenings` and `pain_reports`
(04, tests 3 and 6), `personal_records` (07, test 6), `audit_logs` (10,
test 11). None of these UPDATEs actually mutated a row — each of the five
tables has no UPDATE policy for `authenticated`, so RLS silently reduced
every one to a 0-row no-op — but the raw-grant-level guarantee this
project's design calls for (an unintended write should fail loudly with
`insufficient_privilege`, not silently no-op) was not in place.

**Root cause:** the exact `authenticated`-role counterpart of the `anon`
gap fixed earlier the same day
(`20260724060000_revoke_anon_default_table_grants.sql`): the real hosted
Supabase platform's project-provisioning step sets `public`-schema default
privileges broader than this project's own migrations ever asked for.
Every migration already declares its intended grant per table (e.g.
`grant select, insert on table public.audit_logs to authenticated;`), but
`GRANT` is additive — it cannot remove a privilege a platform default
already conferred — so those declarations were never actually narrowing
anything on the real project. `scripts/local-pg-harness/00_auth_storage_shim.sql`
(this repo's Docker-unavailable sandbox stand-in) never reproduced this,
because it only ever grants `authenticated` schema `USAGE` plus whatever
each migration explicitly grants — it has no broader baseline to begin
with, so it had nothing to reveal. This was caught only where it can be:
`supabase test db --linked` against the real hosted project.

**Fix — explicit, deterministic privilege model, not a two-table patch:**
audited the raw SQL privilege intent for `authenticated` across all 44
application tables by treating every existing `grant ... to authenticated`
statement already present in `supabase/migrations/` as the authoritative,
already-decided contract (docs/DATABASE_SCHEMA.md §§1-15) — not a new
decision, a restatement. `supabase/migrations/20260724070000_revoke_authenticated_default_table_grants.sql`
revokes all privileges (and default privileges, for any future table) from
`authenticated` on every `public`-schema table, then re-grants, table by
table, exactly the same 44 statements already declared. A revoke is a safe
no-op wherever the platform baseline never applied. `service_role` and
`anon` grants are untouched by this migration.

**Verification — extended, not duplicated:** check 7 in
`supabase/tests/database/12_hosted_structural_verification.sql` now
asserts the full `authenticated` SELECT/INSERT/UPDATE/DELETE matrix
against all 44 tables (176 explicit, reviewable assertions — one row of
intent per table, cross-checked line-for-line against the corrective
migration during this pass), mirroring check 5's existing "no anon
grant" stance but per-privilege and per-table rather than one aggregate
count. `select plan(...)` moved 95 → 271. This file also gained its own
`create extension if not exists pgtap with schema extensions;` so it no
longer depends on `00_setup.sql` having run first.

**Hosted CI architecture corrected:** `.github/workflows/deploy-supabase-dev.yml`
previously ran `supabase test db --linked` over the entire
`supabase/tests/database/` directory — the same command and default path
used against a freshly-reset local database in `.github/workflows/ci.yml`.
Against the hosted development project (never reset, by design — see this
file's Phase 2B entries below on why `db reset --linked` is out of scope),
that full suite's `00_setup.sql` fixture users and every other file's
un-rolled-back `begin;...commit;` writes committed real rows to the real
project. The deploy workflow now runs only
`supabase test db supabase/tests/database/12_hosted_structural_verification.sql --linked`
— the one file in that directory that is non-destructive and free of
application-data mutations (no application-row insert/update/delete — its
own `create extension if not exists pgtap` and a session-local temporary
table are the only writes) and does not depend on `00_setup.sql`'s
fixtures. The full 241+-assertion RLS/owner
suite is unchanged and remains authoritative in `ci.yml`, against a
database `supabase db reset --local` resets before every run. Considered
moving hosted-safe tests into a separate `supabase/tests/hosted/`
directory (the task's suggested alternative); kept the file in
`supabase/tests/database/` instead so local CI continues to exercise the
exact same check it always has, without a second, parallel copy that
could drift — only the hosted workflow's invocation changed, to name that
one file explicitly instead of the whole directory.

**Fixture contamination from the two prior full-suite hosted runs**
(30094181154, 30094254573): audited, not assumed. Every application table
reaches `public.profiles`, and from there `auth.users`, through an
unbroken `on delete cascade` FK chain (confirmed against every migration),
so the two fixture identities' data spans effectively every table but is
fully removable by deleting the two fixture `auth.users` rows alone.
`08_bodyscan.sql` already deletes its own `storage.objects` row within the
same file, so no storage residue is expected there. Three
`public.exercises` reference rows are NOT profile-scoped and so do not
cascade-delete: `rls-test-squat` (05), `rls-test-squat-feedback` (06),
`rls-test-service-role-exercise` (11) — all `on conflict (slug) do
nothing` or otherwise identified by an exact, hardcoded test slug, never a
pattern match against the real catalog. `scripts/cleanup-hosted-test-fixtures.sql`
is a narrow, idempotent, human-run script for this — deliberately not
executed by, or wired into any workflow triggered by, this correction
pass, per this task's explicit "do not deploy anything remotely from this
Claude session" constraint.

**Not done, on purpose:** no hosted project reset, no re-run of the full
deployment workflow, no merge. This pass only adds a migration, extends
the existing hosted-safe test file, and corrects the deploy workflow's
verification step; it does not touch Phase 3 scope.

### Follow-up correction (same PR, same day) — cleanup script + wording

`scripts/cleanup-hosted-test-fixtures.sql`'s first draft claimed it could
be pasted into the Supabase Dashboard SQL Editor but used `\echo`, a
`psql`-only meta-command the Dashboard editor cannot parse — corrected to
plain PostgreSQL SQL throughout, with the BEFORE/AFTER diagnostic queries
kept as their own statements (most SQL clients, the Dashboard included,
show one result set per statement) instead of psql-only output framing.
Its `storage.allow_delete_query` `SET LOCAL` was previously issued outside
any explicit transaction; wrapped the whole cleanup in an explicit
`begin; ... commit;` so the setting is scoped to, and cannot outlive, that
one transaction. Added an explicit preflight identity guard (a `do $$ $$`
block) that aborts the whole transaction — deleting nothing — if either
hardcoded fixture UUID exists with an email other than its known fixture
identity (`user-a@example.com` / `user-b@example.com`), rather than
trusting the UUID alone; the `auth.users` deletes themselves are now also
scoped by `id and email` together as defense in depth on top of that
guard. Also corrected this file's and the deploy workflow's/test file's
"100% read-only" description of
`12_hosted_structural_verification.sql` — it installs pgTAP
(`create extension if not exists pgtap`) and creates session-local
temporary tables, so it is not literally read-only end to end; restated
as "non-destructive and free of application-data mutations" (no
application-row insert/update/delete, no fixture users required), which
is the property that actually matters for running it against a
never-reset hosted project. No assertions changed.
