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
