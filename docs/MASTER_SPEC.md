# Murphy Method — Master Specification

**Status:** Authoritative. This is the source of truth for product intent and
scope. Every other document in `docs/` must remain consistent with it. If a
requirement here conflicts with another document, this document wins and the
other document should be corrected.

**Scope of this phase:** This document defines _what_ the product is and
_why_. It does not itself authorise building anything. `CLAUDE.md` requires
working one implementation phase at a time, against `docs/IMPLEMENTATION_PLAN.md`.

Related documents (do not duplicate their detail here — cross-reference):

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — client/server/data architecture
- [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) — table-level data model
- [`ROUTES.md`](ROUTES.md) — navigation and route contracts
- [`API_CONTRACTS.md`](API_CONTRACTS.md) — domain service contracts
- [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) — AI layer design
- [`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md) — programme generation/adaptation algorithm
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — visual design tokens and components
- [`SCREEN_SPECIFICATIONS.md`](SCREEN_SPECIFICATIONS.md) — per-screen behaviour
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — phased build plan
- [`DECISIONS.md`](DECISIONS.md) — architecture decision records
- [`DEFERRED.md`](DEFERRED.md) — everything explicitly out of MVP
- [`RISKS.md`](RISKS.md) — risk register
- [`ACCEPTANCE_CRITERIA.md`](ACCEPTANCE_CRITERIA.md) — global quality gates
- [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) — unresolved product decisions

---

## 1. Product

**Working name:** Murphy Method

**Category:** Adaptive fitness, body-transformation and behavioural
accountability platform.

**Core consumer proposition:**

> "Show us where you are. Show us where you want to go. We build the path —
> and adapt it as you change."

Murphy Method is **not** a generic workout generator and must never degrade
into one. The central product innovation is a continuously evolving
**Personal Response Model (PRM)** — see §14 — that captures how a specific
user:

1. Wants their body, fitness or performance to change.
2. Physically responds to training.
3. Performs on individual exercises.
4. Recovers from training.
5. Enjoys or dislikes exercises.
6. Responds to different workout lengths and structures.
7. Adheres to different schedules.
8. Responds to different forms of motivation.
9. Reacts to accountability interventions.
10. Progresses across individual goals and body areas.

The application must become more personalised and more useful the longer a
person uses it. A competitor that only ships a static programme generator has
not built this product.

## 2. Core Product Philosophy

### 2.1 Sustainable progress

The system optimises for **sustainable progress**, not raw theoretical
programme quality. Conceptually (not as a literal formula the code computes):

```
Sustainable Progress ≈ Effectiveness × Adherence × Recovery × Safety × Sustainability
```

A theoretically perfect programme the user abandons is worse than a good
programme they consistently complete. Every engine in this spec (programme
generation, adaptation, coaching, notifications) must be judged against this
standard, not against exercise-science optimality alone.

### 2.2 Next Best Action

At any point the system should be able to answer: **what is the most
appropriate next training action for this particular user right now?**,
considering goals, programme, training history, progress, preferences,
recovery, available time, equipment, safety, and likelihood of completion.
This is the unifying frame for Today's workout, Quick/Minimum variants,
substitutions, and coach suggestions.

### 2.3 Two adaptive loops

**Physical loop:**

```
Goal → Programme → Train → Performance → Recovery → Measurement → Learn → Adapt
```

**Behavioural loop:**

```
Plan → Prompt → User acts/delays/shortens/skips/completes → Observe response
     → Learn → Personalise motivation → Improve future intervention
```

Both loops run continuously and independently, but feed the same Personal
Response Model and the same Evidence & Confidence Engine (§15). Physiological
adaptation without behavioural adaptation produces a programme nobody
follows; behavioural personalisation without physiological rigour produces an
engagement app with no real training value. Murphy Method requires both.

### 2.4 Core product loop (top level)

```
SEE → UNDERSTAND → PLAN → TRAIN → MEASURE → LEARN → ADAPT
```

The intelligence should become more sophisticated in the background while
the user-facing experience becomes _simpler_, not more complex, over time.

## 3. Target Users & Positioning

**MVP primary audience:** adults 18+ who want to build muscle, improve
physique, improve strength, reduce body fat, achieve recomposition, improve
general fitness, become more consistent with exercise, or develop specific
body areas.

**MVP focus:** beginners, recreational exercisers, and intermediate lifters.

**Explicitly out of positioning for MVP:** Murphy Method is **not** marketed
or built as medically supervised rehabilitation. Users who need clinical
exercise supervision may require exclusion, modification of the programme,
or a requirement to obtain professional clearance before proceeding (see
Safety Screening, §8.1, and Layer 1 in §21).

## 4. Product Language & Body Image Safety

This is a binding constraint on every screen, notification, and AI-generated
string in the product, not a stylistic preference.

**Never use:** bad body, ugly, defect, problem area, failure, perfect body
score, punishment, burn off food, problem body.

**Prefer:** progress, adapt, build, momentum, response, pathway, personal
best, consistency, current, goal, developing, adapting.

**Hard rules:**

- Never implement attractiveness scoring of any kind.
- Never rank or compare one user's body against another user's.
- Never claim a specific body-fat, measurement, or "percentage to goal" value
  with false precision (see §19, §26).
- Never use humiliation, body shaming, manipulative guilt, or fear-based
  messaging in coaching, notifications, or adherence-rescue flows (§18, §20).
- Streak/consistency mechanics must not be destructive (§17).

## 5. Information Architecture

### 5.1 Primary navigation

Five bottom tabs, kept deliberately simple:

1. **Today**
2. **Plan**
3. **Progress**
4. **Coach**
5. **Profile**

### 5.2 Screen inventory

Full screen-by-screen navigation, guards, and route paths are specified in
[`ROUTES.md`](ROUTES.md). Per-screen UX contracts for all P0 screens are
specified in [`SCREEN_SPECIFICATIONS.md`](SCREEN_SPECIFICATIONS.md). The
canonical screen groups are:

- **Authentication:** Splash, Welcome, Sign Up, Sign In, Forgot Password,
  Email Verification (where required).
- **Onboarding:** Introduction, Basic Profile, Main Goal, Goal
  Prioritisation, Interactive Body Goal Map, Training Experience, Available
  Equipment, Training Availability, Preferred Workout Duration, Safety
  Screening, Baseline Measurements, BodyScan Introduction & Consent,
  Optional Baseline BodyScan, Coaching Style, Programme Preview, Onboarding
  Complete.
- **Today:** Today Dashboard, Optional Daily Readiness, Today's Workout
  (Full/Quick/Minimum), Coach Insight, Momentum/Consistency, one meaningful
  progress insight.
- **Workout:** Workout Overview, Active Workout, Exercise Screen, Set
  Logger, Rest Timer, Exercise Information, Exercise Substitution,
  Pain/Discomfort Flow, Exercise Feedback, Workout Summary, Workout
  Feedback, Personal Record Celebration.
- **Plan:** Current Programme, Weekly Schedule, Workout Detail, Exercise
  Detail, Exercise Swap, Programme Change History, "Why did my programme
  change?", Reset/Restructure Plan.
- **Progress:** Goal Journey, Strength Progress, Measurements, Personal
  Records, Consistency, BodyScan Timeline, New BodyScan, BodyScan
  Comparison, Progress Review, Adaptive Work Pathway.
- **Coach:** Coach Conversation, Daily/Weekly Insight, Motivation Profile,
  Reset My Plan, Accountability Settings.
- **Profile:** Personal Details, Goals, Equipment, Training Availability,
  Coaching Style, Notifications, Units, Privacy, BodyScan Privacy, Consent,
  Data Export, Delete Data, Delete Account, Subscription.

## 6. Onboarding

Use **progressive disclosure**; avoid a single long questionnaire. Target
roughly **3–6 minutes** for essential onboarding, with deeper personalisation
collected over time through use (feedback loops, Profile edits, and later
prompts) rather than up front.

Essential onboarding must collect: age; relevant biological information
genuinely required for physiological calculations (see `OPEN_QUESTIONS.md`
for the exact field set); height; weight; preferred units; current training
experience/history; equipment; available training days; available session
duration; relevant restrictions; and goals (see §7).

## 7. Goals

**Possible primary goals:** build muscle, improve strength, lose body fat,
body recomposition, improve fitness, improve mobility, become more
consistent, improve specific body areas.

Multiple goals are allowed, but the user must **rank them by priority**
(e.g. Priority 1: shoulder development; Priority 2: reduce waist appearance;
Priority 3: increase overall strength). Programme generation and adaptation
decisions must always respect this stated priority order (see
[`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md) §2).

### 7.1 Interactive Body Goal Map

Front and back anatomical views with selectable regions, at minimum:
shoulders/deltoids, chest, biceps, triceps, forearms, upper back, lats, core,
waist appearance, glutes, quadriceps, hamstrings, calves.

User-facing regions map internally to a structured anatomical/exercise
ontology (§9). Example: "Shoulders" maps internally to anterior, lateral, and
posterior deltoid targets. This mapping must be structured data, not an
LLM improvisation, and must avoid pseudo-scientific precision in what is
shown to the user.

### 7.2 Goal translation

Natural-language/selected goals are translated into realistic training
objectives. Example: "broader shoulders and a smaller-looking waist" may
translate internally to lateral deltoid development, lat development,
upper-back development, an appropriate overall body-composition strategy,
and core function.

**Hard constraint:** the product must never claim that local exercise can
selectively remove fat from a specific body area (spot reduction). Where a
goal implies this, the UI must explain the physiological limitation clearly
and positively, then offer the closest legitimate strategy.

## 8. Safety Foundation

### 8.1 Safety screening

Collected during onboarding (§6) and re-evaluated when relevant profile data
changes. Populates deterministic eligibility/contraindication rules in the
Programme Engine (Layer 1, §21) — never solely an LLM judgement call. Users
whose screening responses indicate a need for clinical supervision are
flagged for exclusion, modification, or a requirement to seek professional
clearance before certain training content is unlocked.

### 8.2 Pain and safety (runtime)

Pain is **not** equivalent to normal training difficulty and must be
distinguished from it everywhere feedback is collected (§13). If pain is
reported: pause the relevant progression, collect concise safety
information via a dedicated flow, apply conservative deterministic rules,
and modify or stop the relevant exercise where appropriate. The system must
not diagnose a medical condition, and must not encourage a user to push
through concerning pain. Provide appropriate escalation messaging where
warranted (e.g. suggesting the user consult a qualified professional for
persistent or severe pain).

**Safety rules must override AI-generated recommendations, unconditionally.**
This is enforced architecturally — see Layer 1 in §21 and
[`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md).

## 9. Exercise Ontology

This is a critical technical foundation and the base layer that exercise
selection, substitution, and progression all depend on. Exercise selection
must primarily use this structured data — **an LLM must never be allowed to
improvise the fundamental exercise taxonomy** (which exercises exist, what
they train, what they require, what may replace them).

Each exercise record includes, at minimum: name; description; primary
muscles; secondary muscles; movement pattern; relevant joint/movement
characteristics; required equipment; skill requirement; difficulty;
stability requirement; loading potential; fatigue profile; recommended rep
ranges; progression options; regression options; substitute relationships;
contraindication/restriction flags; approximate setup time.

**Movement patterns** include: horizontal push, vertical push, horizontal
pull, vertical pull, squat, hip hinge, lunge/single-leg, knee flexion, hip
extension, hip abduction, elbow flexion, elbow extension, calf, core
anti-extension, core anti-rotation, loaded carry, conditioning.

Table-level design is in [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) §
Exercise Ontology. Seeding the actual exercise library is out of scope for
this architecture phase (see `IMPLEMENTATION_PLAN.md` Phase 4).

## 10. Programme Generation Engine

Full algorithmic detail lives in [`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md).
Summary: initial programme generation uses goal priorities, body-area
priorities, training experience, recent training, available equipment,
available days, available session duration, safety/restrictions, exercise
eligibility, known preferences, and recovery considerations, through a
pipeline of: (1) safety/eligibility filter; (2) goal → muscle/movement
priority translation; (3) exercise ranking; (4) session assembly; (5) volume/
frequency boundary application; (6) session-duration estimation; (7)
programme validation; (8) saving an **immutable `ProgrammeVersion`** (see
§16). Every significant decision the engine makes must be explainable in
plain language (§23).

**Programme generation and adaptation must work correctly with no LLM call at
all.** The LLM is a conversation/explanation layer on top of a deterministic
engine, never the engine itself (§21).

## 11. Progression

The engine implements explicit, named progression models: double
progression, straight rep progression, load progression, and volume
progression, applied within programme-defined boundaries. Example: a
prescription of 3×8–12 — when a user consistently reaches the top of the
target rep range with acceptable reported effort and no safety flag, the
system suggests the smallest practical load increase. Volume is not
increased simply because progress exists; volume changes follow the
adaptation-level rules in §16.

## 12. Effort Tracking

Effort is captured in a user-friendly way, mapped internally to concepts
such as RPE/RIR without exposing that jargon by default. Example prompt:
"How many more good reps could you have completed?" with options `0 / 1 / 2
/ 3+`. Detailed RPE collection after every single set must not be forced on
casual users — the default interaction is lightweight, with deeper capture
available for users who opt in.

## 13. Workout UX

Workout mode must minimise friction. Canonical exercise-screen content
model:

```
Incline Dumbbell Press
Set 2 of 3
Target: 8–12 reps
Previous: 22 kg × 10
Suggested: 22 kg
Goal: Try 11 good-quality reps.

Controls: weight · reps · complete set
```

An automatic rest timer runs between sets. From the active workout the user
can access exercise information, swap the exercise, report pain, or stop the
workout. **Set data must persist immediately, local-first.** A lost
connection or an interrupted app session must never destroy a workout in
progress (see §22, Offline Behaviour).

### 13.1 Exercise feedback

Lightweight, collected per exercise:

- **Enjoyment:** 1 Hated it · 2 Disliked it · 3 Fine · 4 Liked it · 5 Loved it
- **Difficulty:** Too easy · Appropriate · Very hard · Too hard
- **Pain:** a separate, explicit flow (§8.2) — never folded into difficulty.

The system must distinguish five distinct signal types that a user's
negative reaction can represent: **(1) dislike, (2) excessive difficulty,
(3) pain, (4) technical insecurity, (5) boredom.** These must not be treated
as interchangeable or produce the same downstream response — see
[`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md) § Substitution Ranking and
§15 below.

### 13.2 Whole-workout feedback

Kept short, to avoid survey fatigue: enjoyment (1–5); overall difficulty
(1–5); energy afterwards (better/same/worse); "would you willingly do a
similar session again?" (yes/maybe/no).

## 14. Personal Response Model (PRM)

One of the core long-term intellectual assets of the product. The PRM is
structured, per-user state — not a prompt, not a chat transcript — covering
four domains:

- **Physical response:** strength changes, rep progression, measurements,
  relevant BodyScan-derived signals, weight trends.
- **Training response:** exercise-level performance, volume-tolerance
  signals, fatigue, recovery.
- **Preference response:** exercise enjoyment/dislike, workout-duration
  preference, training-structure preference.
- **Behavioural response:** adherence, missed days, shortened sessions,
  preferred training times, schedule patterns.
- **Motivation response:** responsiveness to numerical targets, supportive
  coaching, competitive coaching, direct coaching, time-framing, reminders,
  notification fatigue.

Every inferred attribute in the PRM is stored with an **estimate**, a
**confidence** value, an **evidence count**, and a **last-updated**
timestamp. Weak inference must never be presented to the user, or acted on
by the Programme Engine, as if it were settled fact — this is enforced by
the Evidence & Confidence Engine (§15). Table design: `personal_response_models`,
`preference_signals`, `motivation_profiles` in
[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

## 15. Evidence & Confidence Engine

The system must distinguish **a signal** from **sufficient evidence to
act**. Example: one disliked-exercise rating is weak evidence and must not
trigger a major programme change; repeated, consistent dislike combined with
falling completion is stronger evidence and may justify a substitution.

Inputs to an evidence assessment: evidence count, recency, consistency,
contradictory evidence, and magnitude. Every significant automated decision
(a Level 2+ programme change, per §16) must store the evidence that
justified it, in `decision_evidence`, linked to a `programme_decisions` row.
Full design in [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) § Evidence &
Confidence Engine.

## 16. Programme Stability & Versioning

The system must not over-adapt. Constantly replacing exercises destroys
progression tracking and prevents the PRM from learning anything useful.
Every programme change is classified into one of five levels:

| Level | Name                    | Example                                                         |
| ----- | ----------------------- | --------------------------------------------------------------- |
| 0     | No change               | —                                                               |
| 1     | Micro adjustment        | Rep/load progression within an existing prescription            |
| 2     | Session adjustment      | Set/rep-range or intra-session ordering change                  |
| 3     | Exercise substitution   | Replacing one exercise with an alternative                      |
| 4     | Programme restructuring | Changing the programme's split, frequency, or overall structure |

Core programme structure should generally remain stable for a meaningful
period (see stability windows in
[`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md)) unless one of: a pain/safety
flag, unavailable equipment, an explicit user request, or strong accumulated
evidence (§15) justifies a change.

**Every Level 2+ change must create auditable history**, stored as a
`programme_versions` row referencing the previous version, with decision
type, reason, supporting evidence, timestamp, and confidence where
applicable, in `programme_decisions`. Rollback must be supported where
sensible (e.g. reverting a Level 3/4 change the user disliked).

## 17. Momentum, Never Zero

Streak mechanics must never be destructive. The product must never say
something like "you ruined your 73-day streak." Instead it uses **Momentum**,
**Consistency**, and **Sustainable Training Weeks** framing, designed to help
users preserve behavioural continuity without demanding perfection. A
shortened (Quick/Minimum) workout counts positively toward adherence and is
never framed as a failure (§19).

## 18. Exercise Substitution

Substitution ranking considers, in order of primacy: (1) goal/muscle
overlap, (2) movement pattern, (3) expected training stimulus, (4)
equipment, (5) user skill, (6) user preference, (7) restrictions/pain, (8)
fatigue profile, (9) setup efficiency. Example: repeated dislike of the
Bulgarian split squat may surface Leg Press, Reverse Lunge, or an alternative
split-squat variation as ranked options. Every suggested replacement must be
explainable (§23). Full ranking algorithm in
[`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md).

## 19. Recovery & Adaptive Workouts

### 19.1 Recovery and deload logic

Signals considered: declining performance, repeated high reported effort,
persistent soreness, poor recovery signals, low readiness, falling
adherence. Potential responses: reduce volume, reduce load, shorten the
session, apply an easier training period, or adjust frequency. The system
must **not** self-diagnose "overtraining" from limited data — language and
UI must stay within what the evidence supports.

### 19.2 Daily readiness

Optional, quick: "How do you feel?" (very low / low / normal / good /
excellent), with optional sleep, soreness, and available-time inputs. Used
**conservatively** — one bad night must not automatically rewrite an entire
programme.

### 19.3 Full / Quick / Minimum workouts

Every appropriate planned session supports three modes:

- **Full:** the normal prescribed session.
- **Quick:** approximately 15–25 minutes.
- **Minimum:** approximately 5–15 minutes.

The reduced-workout engine prioritises exercises by: (1) goal importance, (2)
recently undertrained targets, (3) training value, (4) setup efficiency, (5)
recovery, (6) safety. A shortened workout counts positively toward
adherence and is never presented as failure or as "less than" a full
session in tone.

## 20. Accountability Coach

A contextual AI accountability coach with structured knowledge of: goals,
programme, recent performance, schedule, exercise preferences, personal
records, adherence, and motivation preferences. It is **brief by default**.
Example: "Upper body today. Last session you were one rep away from a new
incline-press best. Estimated time: 34 minutes." Architecture in
[`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) § Coach Context Builder — the
coach reasons over structured application data, **not** over its own chat
transcript as source of truth.

### 20.1 Coaching styles

Five initial styles the user selects (and can change) in onboarding/Profile:
**Supportive**, **Direct**, **Analytical**, **Competitive**, **Calm/Minimal**.
Example (Supportive): "Low-energy day? Start with ten minutes and
reassess." Example (Analytical): "You have completed 82% of planned
sessions this month." **Never:** humiliation, body shaming, manipulative
guilt, or fear-based messaging, in any style.

### 20.2 Motivation profile

The system learns what appears to help an individual act, from signals such
as: numerical-target responsiveness, encouragement responsiveness,
personal-record responsiveness, time-minimisation responsiveness,
competitive-framing responsiveness, preferred notification timing, dislike
of streak pressure, and notification fatigue. Requires repeated evidence
(§15); correlation is never treated as causation without it.

### 20.3 Motivational experimentation (P1/premium)

Future, low-risk framing experiments (e.g. "Only 18 minutes today" vs. "One
workout from your weekly goal") measured by notification open rate, workout
start rate, and completion rate. Safeguards: notification frequency caps,
user preference controls, easy opt-out, no exploitation of vulnerability, no
dark patterns. Classified P1 — see [`DEFERRED.md`](DEFERRED.md).

### 20.4 Adherence rescue

Detects declining engagement from patterns such as missed workouts, lower
completion, declining enjoyment, shortened sessions, or reduced app
engagement. The response is **never** simply "send more notifications." The
system offers **Reset My Plan**, with choices such as: make workouts
shorter, train fewer days, change days, change exercises, reduce current
difficulty, or pause and restart. Message philosophy: "Let's adapt the plan
to your life." Never: "You failed."

## 21. AI Architecture (summary)

Full detail in [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md). A strict layered
architecture, where **the LLM never overrides deterministic safety rules**:

1. **Layer 1 — Deterministic Safety Rules:** contraindications, safety
   boundaries, pain flags, hard eligibility rules.
2. **Layer 2 — Exercise Science / Programme Engine:** exercise eligibility,
   programme structure, volume, frequency, progression, fatigue, structured
   substitution.
3. **Layer 3 — Personalisation Engine:** preferences, adherence, behaviour,
   motivation signals.
4. **Layer 4 — Evidence & Confidence Engine:** determines when sufficient
   evidence exists to act (§15).
5. **Layer 5 — Computer Vision** (future): scan alignment, pose matching,
   scan quality, validated visual trend features.
6. **Layer 6 — LLM:** conversation, explanations, coaching, natural-language
   interpretation only.

### 21.1 AI provider abstraction

The product must not be tightly coupled to one LLM vendor. An `AIProvider`
abstraction is defined with implementations including `MockAIProvider` (for
deterministic testing) and `ClaudeAIProvider`, with room for future
alternatives. **LLM/API secrets remain server-side, always** — see §24.

### 21.2 Explainable AI

Every significant recommendation must be able to answer "why?" in concise,
user-facing language (e.g. "why did you suggest replacing barbell bench
press?" → references repeated low ratings, completion, goal relevance,
available alternatives, user preferences). Internal chain-of-thought is
never exposed to the user.

### 21.3 Human override

Users can reject substitutions, restore exercises, lock preferred exercises
where safe to do so, adjust days, and request easier/harder alternatives.
The system should learn appropriately from override behaviour (it is itself
a preference signal). Human coach functionality (a marketplace of real
coaches) is explicitly future scope — see [`DEFERRED.md`](DEFERRED.md).

## 22. Offline Behaviour

Workout logging must tolerate poor connectivity. A user must never lose a
workout because the internet drops mid-session. This requires local-first
workout state, durable local persistence, later synchronisation, and
predictable conflict handling. Full design in
[`ARCHITECTURE.md`](ARCHITECTURE.md) § Offline Strategy.

## 23. BodyScan

BodyScan is a structured, longitudinal progress-comparison system. It is
**not** marketed or built, in MVP, as a clinical measurement tool.

**MVP purposes:** standardised progress images, comparison, trend support,
user motivation, and a foundation for future analysis.

### 23.1 MVP capture

Supports Front, Side, Back, and optional 45-degree captures, with on-screen
guidance for consistency of phone, camera/lens where possible, camera
height, camera distance, standing location, pose, lighting, and clothing
consistency where practical. Useful capture metadata is stored alongside
each image. **Images are private by default and always.**

### 23.2 Future development (P1/P2/Research)

- **P1/P2:** ghost overlay, pose matching, camera alignment guidance, auto
  capture, a Scan Reliability Score, a calibration marker, an optional scan
  mat, computer-vision trend extraction.
- **Research/Future:** validated circumference estimates, depth/LiDAR
  capture, 3D modelling.

The product must never fake precision it has not earned — a scan-derived
number is only shown once the underlying method actually supports it.

### 23.3 Calibration (future)

Explore, as future work: a known-size floor mat, a printable calibration
marker, a known-size reference object, or AR measurement where supported.
Potential future physical product: a **Murphy Method BodyScan Mat** with
known dimensions, foot markers, orientation, and calibration references.
**The application must remain fully functional without ever purchasing a
mat.**

### 23.4 Scan reliability (future)

Future scan-quality assessment may consider camera alignment, scale
consistency, pose, framing, lighting, and clothing consistency, expressed as
**High / Moderate / Low**. If reliability is Low, the scan must not be used
to drive major automated programme changes.

### 23.5 BodyScan cadence and body-image safety

Typical BodyScan cadence is approximately every 2–4 weeks, depending on
purpose. The product avoids: daily physique-check pressure, attractiveness
scoring, "defect" detection, public body comparison, and unrealistic
guarantees. It stays alert to patterns suggesting excessive scanning,
compulsive weighing, or extreme rapid-loss goals, without ever diagnosing a
psychiatric or eating disorder — it provides supportive guidance and, where
warranted, appropriate escalation messaging only. The product must remain
fully useful to a user who never enables BodyScan at all (§27).

## 24. Security

- **Auth:** Supabase Auth.
- **Database:** PostgreSQL with Row Level Security enabled on every
  user-owned table.
- **Storage:** private Supabase Storage buckets for BodyScan and other
  user media.
- **Privileged operations:** server-side Edge Functions (or equivalent);
  **no privileged service key is ever present in the client.**

A user must never be able to access another user's private health
information, measurements, workouts, coaching history, or BodyScan
photographs. Full model in [`ARCHITECTURE.md`](ARCHITECTURE.md) § Security
Boundaries and [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) (RLS concept per
table).

## 25. Privacy

Body imagery is particularly sensitive and is treated accordingly:

- Explicit consent is required before any BodyScan is captured
  (`consent_records`).
- Encryption in transit; secure, access-restricted storage at rest.
- Image deletion, full data export, and account deletion are supported
  end-to-end (Profile → Data Export / Delete Data / Delete Account).
- Clear retention logic is defined per data category.
- **No advertising use of BodyScan images. No sale of body/face data. No
  training of external AI models on identifiable images without explicit,
  separate consent.**
- On-device processing is explored where technically reasonable, as future
  work.

## 26. Progress & Goal Evidence

Progress evidence combines four independent categories, and none of them
alone should be treated as a complete picture:

- **Visual:** standardised BodyScan comparison.
- **Measurements:** weight, waist, chest, hips, arm, thigh, calf (all
  manually entered in MVP; see §23 for BodyScan-derived measurement future
  work).
- **Performance:** strength, reps, volume, work capacity.
- **Adherence:** sessions planned vs. completed, quality of work completed.

**Photographs alone must never create high-certainty physiological claims.**

### 26.1 Goal progress presentation

The product separates **objective metrics** (e.g. "Strength +18%", "Waist
−3 cm", "Adherence 87%") from **estimated goal trajectory** (e.g. Ahead / On
track / Slower than expected / Insufficient evidence). It never claims
something like "your body is exactly 73% complete" — trajectory language is
categorical, not falsely precise.

### 26.2 Adaptive Work Pathway

Retains the motivational concept of cumulative work/reps toward a goal,
without asserting false biological certainty. Potential metrics: quality
targeted repetitions, effective working sets, strength milestones, completed
sessions, consistency, estimated training blocks. Example:

```
Shoulder Development Pathway
682 quality targeted reps completed.
Current estimated pathway: 1,700–2,300
Next performance milestone: 8 kg lateral raise × 15 with good technique.
```

The UI must always make clear that pathway estimates adapt to the user's
actual observed response and do not guarantee a specific body outcome.

### 26.3 Programme Fit

A transparent, explainable concept combining progress, adherence, enjoyment,
recovery, and exercise compatibility, presented categorically or
numerically, without implying medical/scientific precision. Every
contributing component must be explainable to the user on request (§21.2).

## 27. Product Screens — Behavioural Summary

Detailed per-screen behaviour is in
[`SCREEN_SPECIFICATIONS.md`](SCREEN_SPECIFICATIONS.md). Product intent per
tab:

- **Today** must answer "what should I do next?" — greeting, a Today card
  (workout name, estimated duration, primary Start CTA), Quick/Minimum
  options, momentum/consistency, one coach insight, one meaningful progress
  insight. It is deliberately not a cluttered analytics dashboard.
- **Plan** answers "what am I doing?" and "why did this change?" — current
  programme, weekly schedule, workout/exercise detail, and change history.
- **Progress** supports goals, measurements, strength, personal records,
  consistency, BodyScan, estimated goal trajectory, and the Adaptive Work
  Pathway. Users may hide appearance/weight metrics to support a
  performance-focused experience. **The product must remain fully useful to
  a user who never enables BodyScan.**
- **Coach** provides conversational coaching over structured application
  data (§20), answering questions such as: "Why did my programme change?",
  "I only have 15 minutes", "I dislike this exercise", "My gym doesn't have
  this equipment", "I am travelling", "Make today easier", "Make this
  harder", "I have lost motivation."

## 28. Notifications

Examples: workout reminder ("Upper Body A at 6:00. Estimated time: 34
minutes."); missed-start nudge ("Still training tonight?" with Start / Quick
/ Reschedule / Skip actions); progress ("You reached a new incline-press
best."); BodyScan ("Your next progress check is available this week.").
Frequency is capped, user preferences are respected, and notification
fatigue is monitored as a first-class PRM signal (§14, §20.2).

## 29. Scope

### 29.1 MVP (P0) — must have

Authentication; user profile; onboarding; goal priorities; body-area goal
map; equipment profile; safety screening; structured exercise ontology;
initial programme generation; programme versioning; workout execution;
set/reps/load logging; local/offline workout resilience; progression rules;
exercise feedback; workout feedback; basic exercise substitution; Quick
workout; Minimum workout; basic Personal Response Model; evidence/confidence
framework; basic accountability; basic coach architecture; manual
measurements; standardised BodyScan capture/storage/comparison; progress
dashboard; privacy controls; RLS/security; analytics foundation;
auditability.

### 29.2 P1

Daily readiness; Motivation Profile; advanced adherence rescue; more
sophisticated adaptation; adaptive scheduling; Programme Fit; advanced coach
personalisation; ghost-overlay BodyScan; pose guidance; Scan Reliability
Score; wearable integration; advanced progress review.

### 29.3 P2 / Research

3D body estimation; LiDAR/depth capture; automatic circumference estimates;
advanced computer vision; real-time form analysis; rep counting from
camera; predictive body-response models; advanced Adaptive Work Pathway
forecasting; BodyScan Mat; human coach marketplace; sophisticated wearable
recovery prediction.

MVP is never blocked waiting on P1/P2/Research items. Full list with
rationale: [`DEFERRED.md`](DEFERRED.md).

## 30. Business Model

Architected for future tiers; no tier is implemented in this phase.

- **Free:** core programme, workout logging, basic progression.
- **Premium:** full adaptive programming, AI coach, advanced
  personalisation, BodyScan comparison, advanced accountability, adaptive
  scheduling.
- **Premium+:** human review, enhanced assessment, advanced BodyScan
  features.

**Core safety is never paywalled**, at any tier.

## 31. Product Metrics

Potential north-star metric: **Sustainable Active Weeks**. Supporting
metrics: onboarding completion; first-workout completion; Week 1 activation;
Week 4/8/12 retention; planned vs. completed sessions; Quick Workout rescue
rate; exercise enjoyment; adherence; Programme Fit; personal records;
meaningful goal progress; coach engagement.

### 31.1 Safety metrics

Pain reports; safety blocks; recommendation overrides; programme
reversions; excessive-volume prevention events; body-image safety signals;
escalation events.

## 32. Accessibility

Design toward WCAG-aligned mobile accessibility: screen-reader labels,
scalable type, sufficient contrast, large touch targets, captions where
relevant, alternatives to colour-only meaning, and full support for reduced
motion. Detail in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) § Accessibility.

## 33. Visual Design (summary)

The product should feel premium, intelligent, calm, modern, scientific,
motivating, and human — explicitly avoiding stereotypical
macho/bodybuilding design (excessive black/red aggression, flames, skulls,
clutter). Generous spacing, strong hierarchy, restrained animation, rounded
surfaces, large workout controls, accessible contrast. Supports light mode,
dark mode, and reduced motion. Full token set and component specs in
[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md); initial direction (subject to
refinement documented in `DECISIONS.md`):

| Token             | Light value |
| ----------------- | ----------- |
| Background        | `#F7F9FC`   |
| Surface           | `#FFFFFF`   |
| Primary text      | `#101828`   |
| Primary brand     | `#4F6EF7`   |
| Positive / energy | `#22C7A9`   |
| Warning           | `#F59E0B`   |
| Critical          | `#E5484D`   |

These are implemented as semantic design tokens; raw hex values must never
be scattered through UI code (§ see `DESIGN_SYSTEM.md`).

## 34. API / Service Boundaries (summary)

Clear domain service interfaces are defined for: Authentication, Profile,
Goals, Equipment, Exercise Library, Programme Generation, Programme
Adaptation, Workout Logging, Exercise Feedback, Workout Feedback,
Pain/Safety, Quick Workout Generation, Exercise Substitution, Personal
Response Model, Evidence/Confidence, Progress, BodyScan, Coach,
Notifications, Subscriptions, Analytics, Privacy/Data Export/Delete. Full
contracts in [`API_CONTRACTS.md`](API_CONTRACTS.md); these are conceptual
service boundaries and do not all need to be literal REST endpoints (see
[`ARCHITECTURE.md`](ARCHITECTURE.md) for the chosen transport pattern).

## 35. Non-Functional Requirements

Fast app startup; mobile-first (Android and iOS today, web later via the
same Expo Router foundation); graceful offline workout operation; secure
storage; scalable image storage; observability; error tracking; rate
limiting; AI cost monitoring; predictable sync. Detail in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## 36. AI Cost Control

Expensive model calls are never made unnecessarily. Preference order:
deterministic algorithms first, structured domain logic, cached results,
smaller models where sufficient, server-side summarisation, and high-value
LLM calls only where a deterministic approach genuinely cannot serve. Cost
architecture is tracked from the beginning — detail in
[`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) § Cost Control.

## 37. Testing Strategy (summary)

Type checking; linting; unit tests; integration tests; domain-engine tests;
RLS tests; safety tests; accessibility tests; component tests; end-to-end
tests; AI evaluations; computer-vision validation once that layer exists.
**Programme generation and adaptation must be fully testable without an
LLM.** Phase-by-phase test expectations: [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).

## 38. Key Edge Cases

The product is explicitly designed for: gym changes; equipment becoming
unavailable; holiday/travel; illness; injury; missed weeks; shift work;
irregular schedules; poor connectivity; device changes; deleted BodyScans;
no BodyScan consent given; no weighing scale available; conflicting
measurements; a user who dislikes many exercises; a user who manually
rejects AI recommendations repeatedly. **The product must remain fully
useful without BodyScan ever being enabled.**

## 39. Long-Term Defensibility

The durable moat is **longitudinal personal response data**: the system's
progressively deepening knowledge of an individual's exercise preferences,
adherence patterns, training responses, motivational response, and progress
trajectories (§14). Any population-level learning derived from this data
must use appropriate consent, privacy protection, and de-identification —
this is a hard constraint on any future cross-user modelling work, not an
implementation detail to defer casually.

## 40. Core Product Rule

Murphy Method is never built as: _"Take a selfie and AI magically tells you
exactly how many squats you need to get your dream body."_

It is built as: _"An adaptive system that converts a person's goals into a
measurable training pathway, observes how their performance, body, and
behaviour actually respond, and continually improves the pathway."_

---

_This specification will evolve. Material changes must be recorded in
[`DECISIONS.md`](DECISIONS.md); anything intentionally not built yet must be
recorded in [`DEFERRED.md`](DEFERRED.md); anything genuinely unresolved
belongs in [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md). Nothing in this document
should be silently dropped by a future revision._
