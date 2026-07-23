# Screen Specifications

Status: authoritative for this phase, for every **P0** screen. P1/P2 screens
that appear in the full screen inventory (`MASTER_SPEC.md` §5.2) are listed
at the end of each section for completeness but are not specified in detail
here — see [`DEFERRED.md`](DEFERRED.md).

Route paths reference [`ROUTES.md`](ROUTES.md). Visual/component vocabulary
references [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). Data operations
reference [`API_CONTRACTS.md`](API_CONTRACTS.md).

## 0. Standard states (apply to every screen unless overridden)

- **Loading:** skeleton placeholders matching the screen's content
  hierarchy (not a generic spinner) for first load; subsequent
  refetches use a lightweight inline indicator that doesn't discard visible
  content.
- **Empty:** every list/chart screen defines an explicit empty state with a
  short explanation and, where applicable, a CTA toward the action that
  would populate it (e.g. Personal Records empty → "Complete a workout to
  set your first record"). A chart is never shown with empty axes and no
  explanation.
- **Error:** a retry-capable inline error state; never a blank screen or an
  unhandled crash. Destructive/safety-relevant actions (e.g. `reportPain`)
  show an explicit failure message rather than failing silently.
- **Offline:** screens reading server data show cached-last-known content
  with an offline indicator where connectivity is required to refresh
  (`ARCHITECTURE.md` §5). Only the Active Workout stack (§3) carries the
  _write_ offline guarantee; other screens degrade to read-only/cached on
  write attempts while offline, with the action queued or explicitly
  disabled per screen below.
- **Accessibility:** screen-reader labels, WCAG AA contrast, large touch
  targets, and reduced-motion-safe transitions apply by default per
  `DESIGN_SYSTEM.md` §8; only _screen-specific_ accessibility notes are
  called out per screen.

---

## 1. Authentication (P0)

### Welcome (`/welcome`)

- **Purpose:** entry point; establish trust/tone before requiring input.
- **Primary CTA:** Sign Up.
- **Secondary:** Sign In.
- **Hierarchy:** brand mark, one-line proposition (`MASTER_SPEC.md` §1), Sign
  Up, Sign In.
- **Validation:** n/a.
- **Offline:** fully static; no network dependency.

### Sign Up (`/sign-up`)

- **Purpose:** create an account.
- **Primary CTA:** Create Account.
- **Secondary:** switch to Sign In.
- **Fields:** email, password (+ confirmation or strength meter).
- **Validation:** inline email format check, password minimum strength,
  server-side duplicate-email error surfaced inline, not as a generic
  toast.
- **Error state:** field-level for validation errors; banner for
  network/server errors.

### Sign In (`/sign-in`)

- **Purpose:** authenticate an existing user.
- **Primary CTA:** Sign In.
- **Secondary:** Forgot Password, switch to Sign Up.
- **Validation:** inline; incorrect-credentials error must not reveal
  whether the email exists (standard auth security practice).

### Forgot Password (`/forgot-password`)

- **Purpose:** trigger a reset email.
- **Primary CTA:** Send Reset Link.
- **Success state:** confirmation copy shown regardless of whether the
  email exists (no account enumeration).

### Verify Email (`/verify-email`)

- **Purpose:** confirm email ownership where required by Supabase Auth
  config.
- **Primary CTA:** Resend verification email.
- **State:** polls/refreshes on return-to-app (deep link or manual
  "I've verified" action) rather than requiring the user to manually
  navigate away and back unaided.

---

## 2. Onboarding (P0)

Shared pattern across all onboarding steps: a persistent progress indicator,
a **Back** action (except on Introduction), and a **Next** action disabled
until the step's minimum required input is present. No step permits
skipping past _required_ fields, per `ROUTES.md` §3 rule 2 — but optional
depth (e.g. detailed training history beyond the minimum) can be deferred to
post-onboarding Profile editing, consistent with progressive disclosure
(`MASTER_SPEC.md` §6).

### Introduction (`/introduction`)

- **Purpose:** set expectations for the 3–6 minute onboarding flow.
- **Primary CTA:** Get Started.

### Basic Profile (`/basic-profile`)

- **Purpose:** collect age/date of birth, height, weight, unit preference.
- **Fields:** DOB, height, weight, units toggle.
- **Validation:** plausible-range checks (not medical validation) with
  inline errors; DOB must indicate 18+ (`MASTER_SPEC.md` §3) with clear
  copy if it does not, rather than a silent block.

### Main Goal (`/main-goal`)

- **Purpose:** select from the primary goal list (`MASTER_SPEC.md` §7).
- **Interaction:** multi-select from the fixed goal list.
- **Validation:** at least one goal required to proceed.

### Goal Prioritisation (`/goal-prioritisation`)

- **Purpose:** rank the selected goals.
- **Interaction:** drag-to-reorder list (with an accessible non-drag
  alternative — up/down controls per row — for screen-reader and motor-
  accessibility parity, per `DESIGN_SYSTEM.md` §8).
- **Validation:** a strict, unique priority order (backing constraint:
  `DATABASE_SCHEMA.md` §2).

### Interactive Body Goal Map (`/body-goal-map`)

- **Purpose:** select body-area goals (`MASTER_SPEC.md` §7.1).
- **Interaction:** front/back anatomical toggle, tap-to-select regions.
- **Validation:** optional step — proceeding with zero selections is
  allowed (not every user has a specific body-area focus).
- **Accessibility:** each selectable region has an explicit text label
  reachable without relying on spatial/visual tapping alone (e.g. a
  supplementary list-based selector), since a purely visual body-map
  interaction is not screen-reader-friendly by default.

### Training Experience (`/training-experience`)

- **Purpose:** capture experience level and brief training history.
- **Fields:** experience tier (beginner/recreational/intermediate),
  optional free-text or structured history.

### Available Equipment (`/equipment`)

- **Purpose:** capture `user_equipment`.
- **Interaction:** multi-select checklist grouped by category
  (`equipment.category`).

### Training Availability (`/availability`)

- **Purpose:** capture available days/week.
- **Interaction:** day-of-week multi-select or count selector.
- **Validation:** at least 1 day required.

### Preferred Workout Duration (`/workout-duration`)

- **Purpose:** capture target session length, feeding §6 of
  `PROGRAMME_ENGINE.md`.

### Safety Screening (`/safety-screening`)

- **Purpose:** collect `health_screenings` responses (`MASTER_SPEC.md` §8.1).
- **Validation:** required questions must be answered; a response
  indicating a need for clearance shows explanatory, non-alarming copy and
  routes to the appropriate `requires_clearance` outcome rather than a hard
  dead-end.
- **Safety note:** this step's output gates programme generation
  eligibility — it cannot be skipped.

### Baseline Measurements (`/baseline-measurements`)

- **Purpose:** optional initial `body_measurements`.
- **Validation:** every field optional (no scale, `MASTER_SPEC.md` §38, must
  not block onboarding).

### BodyScan Introduction & Consent (`/bodyscan-intro`)

- **Purpose:** explain BodyScan's purpose/privacy plainly and obtain
  explicit consent before any capture.
- **Primary CTA:** Continue to BodyScan / Skip for now.
- **Consent:** writes a `consent_records` row only on explicit affirmative
  action; declining is a fully supported path (`MASTER_SPEC.md` §38 — "no
  BodyScan consent").

### Optional Baseline BodyScan (`/bodyscan-baseline`)

- **Purpose:** guided front/side/back capture.
- **Primary CTA:** Capture.
- **Secondary:** Skip.
- **Offline:** capture requires connectivity to upload
  (`ARCHITECTURE.md` §9); if offline, the step is skippable and revisitable
  later from Progress, never blocking onboarding completion.

### Coaching Style (`/coaching-style`)

- **Purpose:** select one of five styles (`MASTER_SPEC.md` §20.1), changeable
  later in Profile.

### Programme Preview (`/programme-preview`)

- **Purpose:** show the generated programme (`generateProgramme`,
  `API_CONTRACTS.md` §6) before the user lands on Today, with its
  Explainable-AI summary.
- **Primary CTA:** Start Training / Go to Today.
- **Loading:** this screen's loading state is meaningful (programme
  generation is synchronous to onboarding completion) — shown with
  reassuring, non-generic copy given it may take a few seconds.

### Onboarding Complete (`/complete`)

- **Purpose:** brief confirmation before entering the tab app.
- **Primary CTA:** Continue → Today.

---

## 3. Workout (P0)

The highest-stakes flow for the offline guarantee (`MASTER_SPEC.md` §13,
`ARCHITECTURE.md` §5) — every write here must succeed locally before any
network attempt, and the UI never blocks on network latency for a core
in-workout action.

### Workout Overview (`workout/[workoutId]/overview`, modal)

- **Purpose:** preview before starting — exercise list, estimated duration,
  mode toggle (Full/Quick/Minimum).
- **Primary CTA:** Start Workout.
- **Secondary:** switch mode (re-fetches via `generateQuickWorkout` if Quick/
  Minimum selected), close.

### Active Workout (`workout/[workoutId]/active`)

- **Purpose:** the in-progress workout shell — current exercise, set
  progress, navigation between exercises.
- **Primary CTA:** context-dependent (advance to next set/exercise).
- **Secondary:** Stop Workout (with confirmation — destructive-styled per
  `DESIGN_SYSTEM.md` §7), access Exercise Information/Substitution/Pain flow.
- **Offline:** fully functional; all state local-first (`ARCHITECTURE.md`
  §5). A sync-status indicator (not blocking) shows local-saved vs. synced.
- **Accessibility:** large controls throughout per `DESIGN_SYSTEM.md` §7.1.

### Exercise Screen (`workout/[workoutId]/exercise/[workoutExerciseId]`)

- **Purpose:** the canonical exercise-execution view — content model exactly
  as specified in `MASTER_SPEC.md` §13 (name, set X of Y, target range,
  previous performance, suggested load, effort goal).
- **Components:** Set Logger (weight/reps steppers + complete-set action),
  Rest Timer (auto-starts on set completion), quick access to Exercise
  Information, Swap, Report Pain.
- **Validation:** reps required to log a set; weight optional only for
  bodyweight-flagged exercises.
- **Offline:** logging a set writes locally first, always (§ above).

### Rest Timer (embedded component, not a distinct route)

- **Behaviour:** auto-starts post-set, visually and (where enabled)
  audibly/haptically signals completion, skippable early, extendable.

### Exercise Information (modal/sheet over Exercise Screen)

- **Purpose:** show `exercises.description`, muscles, media.
- **Empty state:** if `media_url` is absent, shows text-only content
  gracefully — never a broken media placeholder.

### Exercise Substitution (`plan/swap/[workoutExerciseId]`, also reachable

from Active Workout)

- **Purpose:** present `suggestExerciseSubstitution` candidates with
  explanations (`API_CONTRACTS.md` §13).
- **Primary CTA:** select a candidate → `respondToSubstitution`.
- **Secondary:** keep current exercise.
- **Offline:** requires connectivity (candidate generation is server-side);
  disabled with explanatory copy if offline, falling back to "keep current
  exercise."

### Pain / Discomfort Flow (modal, reachable from Exercise Screen)

- **Purpose:** the dedicated pain flow (`MASTER_SPEC.md` §8.2) — distinct
  from Exercise Feedback.
- **Fields:** body area, severity, optional description.
- **Primary CTA:** Submit → `reportPain` (`API_CONTRACTS.md` §11).
- **Result state:** shows the deterministic `actionTaken` and non-diagnostic
  `guidance` text plainly; if `severity = significant`, escalation
  messaging is shown (suggesting professional consultation), never
  encouraging continuation through concerning pain.
- **Offline:** this is a safety-relevant write; if offline, it is queued
  with a visible "will submit when connected" state and the exercise is
  provisionally paused locally pending sync, rather than silently dropped
  or silently allowed to continue as normal.

### Exercise Feedback (inline, end of exercise)

- **Purpose:** enjoyment + difficulty (`MASTER_SPEC.md` §13.1).
- **Interaction:** lightweight tap-to-select scales, skippable (feedback is
  not mandatory to proceed).

### Workout Summary (`workout/[workoutId]/summary`)

- **Purpose:** post-workout recap — completed exercises, sets, any new
  personal records.
- **Primary CTA:** Continue → Workout Feedback (or Done, if feedback is
  skipped).

### Workout Feedback (part of Workout Summary flow)

- **Purpose:** the four short questions (`MASTER_SPEC.md` §13.2).
- **Interaction:** single screen, skippable, deliberately short to avoid
  survey fatigue.

### Personal Record Celebration (overlay on Workout Summary)

- **Purpose:** positive-only moment when `newPersonalRecords` is non-empty.
- **Motion:** respects reduced-motion (`DESIGN_SYSTEM.md` §6) — a
  non-animated equivalent still clearly communicates the achievement.

---

## 4. Today (P0, except Daily Readiness which is P1)

### Today Dashboard (`(tabs)/today`)

- **Purpose:** answer "what should I do next?" (`MASTER_SPEC.md` §27).
- **Primary CTA:** Start (today's Full workout).
- **Secondary:** Quick, Minimum, resume-in-progress-workout affordance if
  applicable (`ROUTES.md` §6).
- **Hierarchy:** greeting → Today card (workout name, estimated duration,
  Start) → Quick/Minimum options → Momentum/Consistency → one Coach
  Insight → one progress insight. Deliberately not a dashboard of many
  metrics (`MASTER_SPEC.md` §27).
- **Empty state:** rest day / no workout scheduled → shows momentum and an
  option to train anyway (e.g. from Plan), never a blank/dead screen.
- **Offline:** shows the last-synced programme's next workout from cache;
  Start still works offline (workout generation from an already-cached
  programme version does not require a fresh network call — see
  `ARCHITECTURE.md` §5 boundary; if the specific workout hasn't been
  materialised yet and requires a server round trip, an explanatory offline
  state is shown instead of a silent failure).

---

## 5. Plan (P0)

### Current Programme (`(tabs)/plan`)

- **Purpose:** show the active `programme_versions` structure.
- **Secondary:** navigate to Weekly Schedule, History, Reset/Restructure.

### Weekly Schedule (`plan/schedule`)

- **Purpose:** week-at-a-glance view of planned sessions.

### Workout Detail (`plan/workout/[workoutId]`)

- **Purpose:** preview a specific planned/past workout's exercises.
- **Secondary:** navigate to Exercise Detail per row.

### Exercise Detail (`plan/exercise/[exerciseId]`)

- **Purpose:** exercise information in the Plan context (same content model
  as the in-workout Exercise Information sheet, §3).

### Exercise Swap

- Shares the Exercise Substitution spec in §3 (reachable from both Plan and
  Active Workout).

### Programme Change History (`plan/history`)

- **Purpose:** list of `programme_versions`, each showing `change_level`,
  `change_reason`, and date.
- **Empty state:** a brand-new programme shows just its initial version,
  with copy explaining that history builds over time.

### "Why did my programme change?" (`plan/why-changed/[decisionId]`, modal)

- **Purpose:** render `programme_decisions.summary` plus the evidence types
  behind it, in plain language (`MASTER_SPEC.md` §21.2) — never internal
  scores or chain-of-thought.

### Reset / Restructure Plan (`plan/reset`)

- **Purpose:** explicit user-requested Level 4 change
  (`PROGRAMME_ENGINE.md` §8).
- **Primary CTA:** Confirm restructure → `generateProgramme` with
  `reason: 'user_requested_restructure'`.
- **Validation:** confirmation step given this is a significant, though
  reversible (prior version remains in history), change.

---

## 6. Progress (P0)

### Goal Journey (`(tabs)/progress/goal-journey`)

- **Purpose:** per-goal objective metrics + trajectory
  (`generateProgressReview`, `API_CONTRACTS.md` §16).
- **Content rule:** trajectory is always shown as one of the four
  categorical states, never a fabricated precise percentage
  (`MASTER_SPEC.md` §26.1).
- **Empty state:** "insufficient evidence" is a first-class, non-alarming
  state for a new user, not an error.

### Strength Progress (`progress/strength`)

- **Purpose:** per-exercise trend charts from `performance_metrics`.
- **Empty state:** shown before 2+ data points exist, explaining that
  trends need a little history.

### Measurements (`progress/measurements`)

- **Purpose:** manual measurement entry + trend, with an explicit toggle to
  hide appearance/weight metrics (`MASTER_SPEC.md` §27).
- **Primary CTA:** Add Measurement.
- **Conflicting entries:** same-day duplicate entries are all shown on the
  trend (raw series), not silently collapsed (`DATABASE_SCHEMA.md` §9).

### Personal Records (`progress/records`)

- **Purpose:** list of `personal_records`, most recent first.

### Consistency (`progress/consistency`)

- **Purpose:** Momentum/Sustainable-Training-Weeks visualisation
  (`MASTER_SPEC.md` §17) — never a destructive streak counter.

### BodyScan Timeline (`progress/bodyscan`)

- **Purpose:** chronological list of `body_scans`.
- **Empty state:** explains BodyScan is optional and how to start one, with
  no pressure framing (`MASTER_SPEC.md` §23.5).

### New BodyScan (`progress/bodyscan/new`, modal)

- Shares the Optional Baseline BodyScan capture spec (§2), reused
  post-onboarding, with `purpose: 'progress_check'`.

### BodyScan Comparison (`progress/bodyscan/compare`)

- **Purpose:** side-by-side/slider comparison between two scans
  (`getBodyScanComparison`, `API_CONTRACTS.md` §17).
- **Privacy:** images loaded via short-lived signed URLs only; never cached
  to a location outside the app's private storage.

### Progress Review (`progress/review`)

- **Purpose:** the fuller narrative version of Goal Journey, combining all
  four evidence categories (`MASTER_SPEC.md` §26).

### Adaptive Work Pathway (`progress/pathway`)

- **Purpose:** the motivational cumulative-work view (`MASTER_SPEC.md`
  §26.2), always paired with the "estimates adapt, not a guarantee" caveat
  copy.

---

## 7. Coach (P0, except Motivation Profile which is P1)

### Coach Conversation (`(tabs)/coach`)

- **Purpose:** `sendCoachMessage` interface (`API_CONTRACTS.md` §18).
- **Primary CTA:** send message.
- **Content rule:** replies stay brief by default (`MASTER_SPEC.md` §20);
  no chain-of-thought or internal scoring ever rendered.
- **Offline:** disabled with explanatory copy — coach requires connectivity.
- **Error:** AI-provider failure shows a plain retry state, never a raw
  provider error message.

### Daily / Weekly Insight (`coach/insight`)

- **Purpose:** `getDailyInsight`/`getWeeklyInsight` surfaced standalone (in
  addition to the one insight embedded on Today).

### Reset My Plan (`coach/reset-plan`)

- **Purpose:** the adherence-rescue entry point (`MASTER_SPEC.md` §20.4) —
  distinct from Plan's Reset/Restructure in framing (this is triggered by,
  or leads into, a supportive "let's adapt the plan to your life"
  conversation) though it may invoke the same underlying restructure/
  adaptation operations.
- **Options presented:** shorter workouts, fewer days, change days, change
  exercises, reduce difficulty, pause and restart.
- **Content rule:** never uses failure/blame language (§ same section).

### Accountability Settings (`coach/accountability-settings`)

- **Purpose:** basic controls over coach/notification behaviour (frequency,
  quiet hours) feeding `notification preferences`
  (`API_CONTRACTS.md` §19).

---

## 8. Profile (P0)

Standard settings-list pattern; each row navigates to a focused sub-screen.

### Personal Details (`profile/personal-details`)

- **Purpose:** edit `profiles` fields collected in Basic Profile.

### Goals (`profile/goals`)

- Reuses Main Goal + Goal Prioritisation + Body Goal Map interactions from
  onboarding, in an editable context.

### Equipment (`profile/equipment`)

- Reuses onboarding Equipment interaction; supports marking equipment
  temporarily unavailable (`MASTER_SPEC.md` §38) without deleting it.

### Training Availability (`profile/availability`)

- Reuses onboarding Availability interaction.

### Coaching Style (`profile/coaching-style`)

- Reuses onboarding Coaching Style interaction.

### Notifications (`profile/notifications`)

- **Purpose:** granular notification preferences and frequency caps
  (`MASTER_SPEC.md` §28).

### Units (`profile/units`)

- **Purpose:** metric/imperial toggle; also houses the manual theme
  override if offered (`DESIGN_SYSTEM.md` §9).

### Privacy (`profile/privacy`)

- **Purpose:** overview of privacy controls, links to BodyScan Privacy,
  Consent, Data Export, Delete Data, Delete Account.

### BodyScan Privacy (`profile/bodyscan-privacy`)

- **Purpose:** BodyScan-specific consent state and deletion
  (`requestDeleteBodyScanData`, `API_CONTRACTS.md` §22).

### Consent (`profile/consent`)

- **Purpose:** list of `consent_records`, current state per consent type,
  with the ability to withdraw where the consent type supports it.

### Data Export (`profile/data-export`)

- **Purpose:** `requestDataExport`/`getDataExportStatus` flow
  (`API_CONTRACTS.md` §22).
- **State:** explicit queued/processing/ready/failed states shown, not a
  silent background process.

### Delete Data (`profile/delete-data`)

- **Purpose:** category-specific deletion (starting with BodyScan data).
- **Validation:** explicit confirmation step for any deletion action.

### Delete Account (`profile/delete-account`)

- **Purpose:** `requestAccountDeletion` with a grace-period explanation and
  `cancelAccountDeletion` path (`API_CONTRACTS.md` §22).
- **Validation:** explicit confirmation, destructive-styled per
  `DESIGN_SYSTEM.md` §7.

### Subscription (`profile/subscription`)

- **Purpose:** `getSubscription` display; upgrade flow itself depends on
  which store/billing integration is active (see `OPEN_QUESTIONS.md`).
- **Content rule:** never implies a safety feature is paywalled
  (`MASTER_SPEC.md` §30).

---

## 9. P1/P2 screens (listed, not specified here)

Per `MASTER_SPEC.md` §29.2/§29.3 and [`DEFERRED.md`](DEFERRED.md): Optional
Daily Readiness, Motivation Profile screen, ghost-overlay/pose-guided
BodyScan capture UI, Scan Reliability indicator UI, advanced Programme Fit
visualisation, wearable-integration screens, and any human-coach-marketplace
UI. These are not designed in this phase to avoid over-specifying UI ahead
of the phase that builds them.
