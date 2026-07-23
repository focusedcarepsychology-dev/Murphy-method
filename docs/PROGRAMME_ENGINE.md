# Programme Engine

Status: authoritative for this phase. This is Layer 2 of
[`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) — the deterministic exercise
science engine. It contains no unsupported medical claims and no invented
physiological precision; where exercise science has genuine uncertainty,
this document says so rather than asserting a false constant.

## 1. Pipeline overview

```
1. Safety & eligibility filter        (Layer 1 output consumed as a hard constraint)
2. Goal → muscle/movement priority translation
3. Exercise ranking
4. Session assembly
5. Volume/frequency boundary application
6. Session-duration estimation
7. Programme validation
8. Save immutable ProgrammeVersion
```

Every step's output is structured data suitable for direct storage and for
generating the plain-language explanation required by
`MASTER_SPEC.md` §21.2/§10. No step requires an LLM call.

## 2. Goal → muscle/movement priority translation

Inputs: ranked `user_goals`, ranked `body_area_goals`.

Each goal type maps to a fixed weighting over movement patterns and, for
body-area goals, over the `body_area_muscle_map` weights
(`DATABASE_SCHEMA.md` §2). Example mappings (illustrative, tuned as content,
not hardcoded logic):

| Goal                              | Movement pattern emphasis                                                                                                                                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build muscle                      | Balanced across all patterns, moderate-to-high volume                                                                                                                                                                                                                   |
| Improve strength                  | Squat, hip hinge, horizontal/vertical push and pull, lower rep ranges                                                                                                                                                                                                   |
| Lose body fat / recomposition     | Balanced training emphasis + adherence-optimised session design (`MASTER_SPEC.md` §2.1) — the engine does not add "fat-burning" exercise selection, since exercise selection does not create region-specific or method-specific fat loss beyond general training effect |
| Improve fitness                   | Conditioning pattern weighted up, work-capacity-oriented set/rep schemes                                                                                                                                                                                                |
| Improve mobility                  | Full ROM variants preferred within eligible options                                                                                                                                                                                                                     |
| Body area goal (e.g. "shoulders") | `body_area_muscle_map` weights applied directly to muscle-level scoring in §3                                                                                                                                                                                           |

**Priority order is respected multiplicatively, not by exclusion:** a
Priority 3 goal still receives programme time, just proportionally less
than Priority 1 — the engine never fully drops a lower-priority goal from
the programme (this is what "programme decisions must respect goal
priority", `MASTER_SPEC.md` §7, requires).

**Spot-reduction constraint:** a body-area goal contributes to _muscle
development_ scoring only. It must never influence a body-composition/fat-
loss strategy component — that would imply spot reduction, which
`MASTER_SPEC.md` §7.2 explicitly forbids. Where a body-area goal is
waist-appearance-related, the engine routes it to core/postural
development plus flags the goal for the standard overall body-composition
guidance shown in the UI, not to any exercise-selection change.

## 3. Exercise eligibility & scoring

### 3.1 Eligibility (hard filter)

An exercise is eligible only if: (a) Layer 1 verdict is not `excluded`; (b)
required equipment (`exercise_equipment.required = true`) is available per
`user_equipment`; (c) `exercises.active = true` and
`exercises.review_status = 'published'` (`DATABASE_SCHEMA.md` §5 — an
unreviewed/draft row is never selected into a real user's programme); (d)
`difficulty` is appropriate for `profiles.training_experience` (a beginner
is not served an `advanced`-only exercise as a primary selection, though it
may appear as a long-term progression target, §7).

### 3.2 Scoring (ranking within eligible set)

```
score(exercise) =
    w1 * goalMuscleOverlap(exercise, goalWeights)
  + w2 * movementPatternPriority(exercise, patternWeights)
  + w3 * preferenceSignal(exercise, profileId)       // 0 if no signal yet
  + w4 * setupEfficiency(exercise)
  - w5 * fatigueCostPenalty(exercise, recentFatigue)
```

- `goalMuscleOverlap` / `movementPatternPriority` come from §2.
- `preferenceSignal` reads `personal_response_models` (domain =
  `preference`) where evidence exists; contributes 0 (neutral) rather than
  guessing when no signal exists yet — a cold-start user is never penalised
  for lacking history.
- `fatigueCostPenalty` uses `exercises.fatigue_profile` plus recent training
  volume for overlapping muscles, to avoid stacking multiple high-fatigue-
  cost exercises for the same muscle group in one session.
- Weights (`w1..w5`) are tuning configuration, versioned alongside the
  engine, not hardcoded magic numbers scattered through code.

## 4. Session assembly

Given a target weekly frequency (from `training_availability`) and per-
session duration target (§6), the engine:

1. Selects a split structure appropriate to frequency and experience
   (e.g. full-body for 2–3 days/week beginners; upper/lower or push/pull/
   legs for 4+ days/week or intermediate+).
2. Fills each session by iterating the ranked exercise list (§3.2) per
   movement-pattern slot required by the split, respecting per-session
   fatigue budgets so a session doesn't stack excessive fatigue-cost
   exercises.
3. Assigns rep ranges and initial working parameters (§5) per exercise
   based on goal emphasis (e.g. strength-weighted goals bias toward the
   lower end of hypertrophy-appropriate rep ranges) — always within the
   exercise's own `recommended_rep_range_low/high`.

## 5. Volume & frequency boundaries

The engine enforces configured minimum/maximum weekly set ranges per muscle
group, informed by general resistance-training literature but expressed as
a **range, not a single "correct" number** — this is a deliberate
acknowledgment of genuine individual variability, not an evasion. Initial
volume is set conservatively (lower-middle of the range) for a new user or
new programme structure; §6 in `MASTER_SPEC.md` (Progression) governs how
volume/load move from there. The engine never increases volume purely
because time has passed — an increase requires either a scheduled
progression check (§5 below, load/rep progression) or Level 2+ evidence-
based adaptation (`AI_ARCHITECTURE.md` §2.4).

## 6. Session-duration estimation

```
estimatedMinutes =
    Σ (setup_time_seconds + sets * (avg_rep_time_seconds * reps + rest_seconds))
  / 60
```

`avg_rep_time_seconds` and default `rest_seconds` are configuration,
adjustable per exercise `stability_requirement`/`loading_potential`
(higher-skill/heavier exercises get longer default rests). The estimate is
shown to the user (`MASTER_SPEC.md` §13 example: "Estimated time: 34
minutes") and is treated as an estimate, not a guarantee — actual duration
naturally varies with logged rest/rep pace once a user has workout history,
at which point the estimate can be refined using the user's own historical
pace (a Personalisation Engine input, `AI_ARCHITECTURE.md` §2.3), never
before real history exists.

## 7. Progression model

Implements the models named in `MASTER_SPEC.md` §11, applied at the Level 1
(micro-adjustment) tier:

- **Double progression:** within a prescribed rep range (e.g. 8–12), the
  user progresses reps at a fixed load until reaching the top of the range
  for all target sets with an acceptable effort response (§ `MASTER_SPEC.md`
  §12: effort response ≤ a configured ceiling, e.g. "1" or better on the
  0/1/2/3+ scale, and no pain flag), then load increases and reps reset
  toward the bottom of the range.
- **Straight rep progression:** for exercises without adjustable external
  load (e.g. many bodyweight movements), reps/sets increase directly within
  configured ceilings before a regression/progression _exercise_ swap is
  considered (a Level 3 change, not Level 1).
- **Load progression:** for exercises past double-progression's effective
  range (e.g. compound barbell lifts for an intermediate+ lifter), load
  increases on a fixed cadence subject to the same effort/safety gate.
- **Volume progression:** governed by §5's boundaries and Level 2+
  adaptation, never by Level 1 alone.

**The smallest practical load increase** is applied — a configured
increment per equipment type (e.g. smallest available plate/dumbbell
increment), not an arbitrary percentage, so real-world loadable increments
are always respected.

## 8. Adaptation levels & stability windows

Restates and operationalises `MASTER_SPEC.md` §16:

| Level                       | Trigger source                                                                                                                      | Typical stability window before another change at this level                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — No change               | n/a                                                                                                                                 | n/a                                                                                                                                                               |
| 1 — Micro adjustment        | Per-session, evaluated every time the relevant exercise is logged                                                                   | None — this is the expected steady-state cadence                                                                                                                  |
| 2 — Session adjustment      | Evidence & Confidence Engine (`AI_ARCHITECTURE.md` §2.4) or explicit user request                                                   | ≥ 1 training block (configurable; default 2 weeks) between system-triggered Level 2 changes to the same session, to preserve enough signal to evaluate the change |
| 3 — Exercise substitution   | Evidence threshold met, pain/safety, equipment unavailable, or explicit user request                                                | ≥ 1 training block per exercise slot, except pain/equipment triggers which apply immediately regardless of window                                                 |
| 4 — Programme restructuring | Strong accumulated evidence, explicit user request ("Reset / Restructure Plan"), or a material profile change (goals, availability) | ≥ 1 full training block (default 4 weeks) since the last restructure, except explicit user request which is never blocked by the window                           |

**User-requested changes and safety/equipment-triggered changes always
bypass the stability window** — the window exists to prevent the _system_
from thrashing the programme on weak automated signals, not to obstruct a
user's own explicit control (`MASTER_SPEC.md` §21.3) or a genuine safety
need (§8.2). Window values are configuration, reviewed post-launch against
real adherence/outcome data, not fixed forever by this document.

## 8a. Decision Minimalism (N-of-1 learning)

**Change as little as necessary, then observe.** This is a binding
algorithmic principle, not just a stability-window side effect (§8). When
evidence justifies a Level 2+ change, the engine selects the **smallest
evidence-supported intervention** that addresses the triggering signal,
rather than changing several independent programme variables at once.

Example: chest progress reads as slow. The engine does **not**
simultaneously replace multiple chest exercises, materially raise volume,
change training frequency, and change rep ranges in the same decision. It
identifies the single highest-leverage variable the evidence actually
points to (e.g. reported effort has consistently been below the progression
ceiling — a rep-range/load issue, not a volume or exercise-selection issue)
and changes that one variable, then waits through the relevant stability
window (§8) to observe the effect before considering a further change.

This is a product and algorithmic requirement, not a stylistic preference,
because compound changes make it impossible to attribute a subsequent
outcome to any one variable — the exact failure mode the Evidence &
Confidence Engine and PRM (`MASTER_SPEC.md` §14–15) exist to avoid. Changing
one variable at a time is what makes individual response learning possible
at all: it preserves:

- **Programme stability** — the user experiences a coherent, trackable
  programme rather than one that feels different every week.
- **Causal interpretability** — the next round of feedback can actually be
  attributed to the change that was made.
- **Individual response learning** — the PRM can only learn "this user
  responds well to X" if X was isolated when it was tried.
- **User trust** — a programme that visibly overreacts to a single data
  point reads as unreliable, independent of whether any individual change
  was technically defensible.

**Documented exceptions** — cases where minimalism is deliberately
overridden because a broader or immediate change is the correct response:

- **Safety** — a Layer 1 exclusion always applies immediately and in full,
  regardless of how many exercises/prescriptions it touches.
- **Pain** — `reportPain` (`API_CONTRACTS.md` §11) acts immediately on the
  affected exercise(s); minimalism governs adaptation width, never delays a
  safety response.
- **Equipment loss** — if a gym change removes access to equipment
  underpinning multiple prescriptions, all affected prescriptions are
  updated together in one Level 3 change rather than incrementally
  breaking across sessions.
- **Explicit user request** — Reset/Restructure Plan (Level 4,
  `MASTER_SPEC.md` §21.3) is exactly the case where the user is asking for
  a broad change; minimalism does not second-guess an explicit request.
- **Severe schedule incompatibility** — a material availability change
  (e.g. days/week drops from 5 to 2) requires restructuring the split, not
  a single-variable patch that no longer fits the available time.

Outside these exceptions, a candidate decision that would touch more than
one independent variable is either narrowed to the single highest-evidence
variable or, if the evidence genuinely supports several changes at once
with no safe way to sequence them, escalated to a Level 4 restructure
(§8) — which is itself a deliberate, larger-scope decision, not an
accumulation of small ones happening to land together.

## 9. Substitution ranking

Implements `MASTER_SPEC.md` §18's ordered criteria as a scoring function
mirroring §3.2's shape:

```
substitutionScore(candidate, forExercise) =
    v1 * muscleGoalOverlap(candidate, forExercise)
  + v2 * movementPatternMatch(candidate, forExercise)
  + v3 * stimulusSimilarity(candidate, forExercise)     // loading potential / fatigue profile proximity
  + v4 * equipmentAvailable(candidate)                  // hard 0 if unavailable — filtered, not just penalised
  + v5 * skillFit(candidate, profile.trainingExperience)
  + v6 * preferenceSignal(candidate, profileId)
  - v7 * restrictionPenalty(candidate)                   // 0 unless a modify-level restriction applies; excluded candidates are filtered entirely
  + v8 * setupEfficiency(candidate)
```

Seeded from the precomputed `exercise_substitutions.similarity_score` prior
(`DATABASE_SCHEMA.md` §5) as the base for `muscleGoalOverlap` +
`movementPatternMatch`, then adjusted per-user by `v4..v6`. Top-N candidates
(configurable, default 3) are returned with a per-candidate explanation
string generated from which terms dominated the score (e.g. "closest match
for lateral deltoid emphasis, available with your equipment").

## 10. Quick / Minimum workout logic

Given the current Full session's `workout_exercises`, reprioritise using
`MASTER_SPEC.md` §19.3's ordered criteria:

```
priority(exercise) =
    u1 * goalImportance(exercise)              // from §2 weighting
  + u2 * recentlyUndertrainedBonus(exercise)   // muscle groups under weekly volume floor recently
  + u3 * trainingValue(exercise)               // compound > isolation, all else equal
  - u4 * setupTimePenalty(exercise)
  - u5 * fatigueCostPenalty(exercise)          // recovery/safety consideration
```

Selection then fills the target duration envelope (Quick: 15–25 min,
Minimum: 5–15 min, `MASTER_SPEC.md` §19.3) using the duration model in §6,
taking highest-priority exercises first until the envelope is filled, with
sets-per-exercise reduced before exercises are dropped entirely (preserving
breadth of stimulus over depth on fewer movements, within the time budget).
The resulting workout is generated as an actual `workouts` row (mode =
`quick`/`minimum`), not merely a truncated view of the Full session, so it
logs and counts identically (`MASTER_SPEC.md` §19.3: "counts positively
toward adherence").

## 11. What this engine deliberately does not claim

- It does not claim a single "optimal" set/rep/frequency number — it works
  in literature-informed ranges (§5) and adapts within them from observed
  response, because individual response variability is real and the
  product's own philosophy (§ `MASTER_SPEC.md` §2) is built around learning
  it, not assuming it away.
  - It does not claim to selectively burn fat from a body area via exercise
    selection (§2).
- It does not diagnose overtraining (`MASTER_SPEC.md` §19.1) — recovery
  responses are triggered by defined signal combinations, not a medical
  determination.
- It does not require BodyScan data to function — every input in §2–§10
  above is available from onboarding, workout logging, and manual
  measurements alone (`MASTER_SPEC.md` §38).
