# AI Architecture

Status: authoritative for this phase. Expands
[`MASTER_SPEC.md`](MASTER_SPEC.md) §21 into an implementable design. Nothing
here is implemented yet — see [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
Phases 5, 7, 9.

## 1. Guiding constraint

**The LLM never overrides deterministic safety rules, and programme
generation/adaptation must work correctly with zero LLM calls.** Every
design decision in this document is subordinate to that constraint. The LLM
is Layer 6 of six; it sits on top of, and reads output from, Layers 1–4, and
never substitutes for them.

## 2. Layer model

```
┌─────────────────────────────────────────────────────────┐
│ Layer 6 — LLM                                            │
│ conversation, explanation rephrasing, coaching tone,      │
│ natural-language interpretation of free-text user input   │
├─────────────────────────────────────────────────────────┤
│ Layer 5 — Computer Vision (future, P1/P2)                 │
│ scan alignment, pose matching, scan quality, visual trend  │
├─────────────────────────────────────────────────────────┤
│ Layer 4 — Evidence & Confidence Engine                     │
│ decides whether accumulated signals justify acting         │
├─────────────────────────────────────────────────────────┤
│ Layer 3 — Personalisation Engine                           │
│ preferences, adherence, behaviour, motivation signals       │
├─────────────────────────────────────────────────────────┤
│ Layer 2 — Exercise Science / Programme Engine               │
│ eligibility, structure, volume, frequency, progression,     │
│ fatigue, structured substitution                            │
├─────────────────────────────────────────────────────────┤
│ Layer 1 — Deterministic Safety Rules                        │
│ contraindications, safety boundaries, pain flags,            │
│ hard eligibility rules                                       │
└─────────────────────────────────────────────────────────┘
```

Each layer only calls downward (a higher layer may read a lower layer's
output; a lower layer never depends on a higher layer's output to make its
own determination). Layer 1's output is a hard constraint set that Layer 2
must respect, not a suggestion Layer 2 can weigh against other factors.

### 2.1 Layer 1 — Deterministic Safety Rules

Pure functions/SQL, no AI, fully unit-testable. Inputs: `health_screenings`
restriction flags, active `exercise_restrictions`, active `pain_reports`.
Output: a per-exercise eligibility verdict (`eligible` / `excluded` /
`modified`) consumed by Layer 2. Also directly gates the `reportPain`
Edge Function's synchronous response (`API_CONTRACTS.md` §11) — pain
handling never waits on, or can be talked out of its action by, an LLM
call.

### 2.2 Layer 2 — Exercise Science / Programme Engine

Deterministic algorithm over structured data (exercise ontology, goal
priorities, equipment, availability, Layer 1 output). Full design:
[`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md). No AI dependency; runs
entirely as TypeScript/SQL in Edge Functions. This is what makes
`generateProgramme`/`evaluateAdaptation` (`API_CONTRACTS.md` §6–7) work
with zero LLM calls.

### 2.2a Decision Minimalism (N-of-1 learning)

A cross-cutting constraint on Layers 2 and 4, not a separate layer: **change
as little as necessary, then observe.** Full principle and worked example:
[`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md) §8a. When the Evidence &
Confidence Engine (§2.4) determines a decision is sufficiently supported,
the Programme Engine (§2.2) applies the smallest evidence-supported
intervention rather than bundling several independent changes into one
decision, except under the documented exceptions (safety, pain, equipment
loss, explicit user request, severe schedule incompatibility). This is what
makes the Personal Response Model's per-attribute learning
(`MASTER_SPEC.md` §14) valid: attributing an observed outcome to a specific
variable requires that variable to have been changed in isolation.

### 2.3 Layer 3 — Personalisation Engine

Aggregates `preference_signals`, adherence patterns
(`workouts`/`notification_responses`), and feedback into
`personal_response_models` rows (§ `DATABASE_SCHEMA.md` §11). Runs as
scheduled/triggered Edge Function jobs, deterministic aggregation (weighted
recency-favoured averages, categorical counts) — not an LLM call. Its output
feeds Layer 2 (e.g. down-weighting a disliked exercise in scoring) and Layer 4.

#### 2.3.1 Data hierarchy: observation → signal → inference → confidence → decision

The PRM (`MASTER_SPEC.md` §14) and the Evidence & Confidence Engine (§2.4)
only work correctly if four genuinely different kinds of data are never
conflated into one. Each stage below has its own storage location so the
distinction is structural, not just conceptual:

| Stage                        | Definition                                                                                                                                       | Storage                                                                                                            | Example                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **Observation**              | A raw, factual, directly-recorded user event or input — not yet interpreted.                                                                     | `exercise_feedback`, `workout_feedback`, `pain_reports`, `set_logs`, `notification_responses`, `body_measurements` | "User rated this exercise's enjoyment 1/5."                                            |
| **Signal**                   | One observation, extracted and tagged as evidentially relevant to a specific question, with traceability back to its source observation.         | `preference_signals` (`signal_type`, `source_table`, `source_id`)                                                  | "`exercise_dislike` signal, sourced from that `exercise_feedback` row."                |
| **Inference**                | An aggregated estimate over multiple signals, carrying its own uncertainty — never a single signal treated as settled fact.                      | `personal_response_models` (`estimate`, `confidence`, `evidence_count`, `personalisation_rules_version`)           | "Repeated low-enjoyment pattern for this exercise (confidence 0.8, evidence_count 4)." |
| **Confidence → sufficiency** | Whether an inference (or a combination of inferences) clears the bar to justify a decision — a distinct determination from the inference itself. | Computed at decision time by the Evidence & Confidence Engine (§2.4), not stored as its own row                    | "This confidence level, for a Level 3 change, is/isn't sufficient to act."             |
| **Decision**                 | The resulting action (or explicit abstention, §2.4.1), with the evidence and versions that produced it.                                          | `programme_decisions` + `decision_evidence` (`DATABASE_SCHEMA.md` §6)                                              | "Offer a substitution for this exercise."                                              |

The chain runs strictly one direction — **observation → signal →
inference → confidence → decision** — and a lower stage is never skipped
or inferred backwards from a higher one (e.g. a decision is never used to
retroactively imply what the original observation must have been). A
single observation only ever reaches the _signal_ stage on its own (§2.4's
"one dislike rating" example); it takes multiple signals, aggregated with
recorded confidence, to reach _inference_; and it takes an inference
clearing a `change_level`-appropriate threshold to reach _decision_.
**An uncertain inference is never stored or displayed as if it were a
verified observation** — `personal_response_models` rows are always shown
(where surfaced to the user at all, e.g. via Coach) with their confidence
qualified in the language used, never phrased as settled fact
(`ACCEPTANCE_CRITERIA.md` § Personal Response Model integrity).

### 2.4 Layer 4 — Evidence & Confidence Engine

Given a candidate decision (e.g. "substitute exercise X"), determines
whether the supporting evidence clears the bar to act, per
`MASTER_SPEC.md` §15. Deterministic scoring function over `decision_evidence`
inputs:

```
score = f(evidence_count, recency, consistency, contradiction_penalty, magnitude)
sufficientToAct = score >= threshold(decision_type, change_level)
```

Thresholds are configuration, tuned per `decision_type` and `change_level`
(a Level 4 restructure requires materially stronger evidence than a Level 1
progression). This function is deterministic and independently testable
without any AI dependency — the "confidence" it produces is a computed
statistic, not an LLM's self-reported confidence. See §7 for the concrete
worked example from `MASTER_SPEC.md` §15 (one dislike rating vs. repeated
dislike + falling completion).

#### 2.4.1 Abstention

**The system is not required to produce a decision.** `sufficientToAct`
is not the only outcome of an evidence assessment — three genuinely
different states exist, and must not be collapsed into one:

| State                             | Meaning                                                                | Example                                                                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sufficient evidence to act        | `score >= threshold` for the relevant `decision_type`/`change_level`   | Repeated dislike + falling completion → substitution                                                                                                                                                   |
| Insufficient evidence — no change | `score < threshold`, and nothing is unsafe or contradictory            | One dislike rating → logged as a signal only, no decision                                                                                                                                              |
| **Abstain**                       | Evidence is conflicting, unreliable, or no safe/eligible option exists | Conflicting pain signals; no exercise satisfies all active restrictions and equipment; Scan Reliability is `low` (`MASTER_SPEC.md` §23.4); a BodyScan-derived trend has too few comparable data points |

Abstention is distinct from "no change" (Level 0): "no change" means the
engine evaluated the evidence and correctly concluded nothing should move;
**abstain** means the engine cannot respect the request/goal at all with
the confidence the product requires, and says so rather than guessing. It
applies wherever a layer would otherwise be forced to fabricate an answer:

- **Programme Engine (Layer 2):** if no eligible exercise exists for a
  required movement-pattern slot after Layer 1 filtering (e.g. every
  candidate is excluded by a restriction and unavailable equipment
  eliminates the rest), the engine abstains from filling that slot rather
  than silently relaxing eligibility — the resulting programme surfaces the
  gap explicitly (`PROGRAMME_ENGINE.md` § What this engine deliberately
  does not claim) rather than shipping an unsafe or incomplete-looking
  programme without explanation.
- **Substitution (Layer 2/4):** `suggestExerciseSubstitution`
  (`API_CONTRACTS.md` §13) may return zero candidates; this is a valid,
  explicit response ("no suitable alternative within your current
  equipment/restrictions"), not an empty-array bug to paper over client-side.
- **Evidence & Confidence Engine (Layer 4):** `assessEvidence`
  (`API_CONTRACTS.md` §15) can return `sufficientToAct: false` with a
  `reason` distinguishing "not enough evidence yet" from "evidence
  conflicts" — the latter is logged as an abstained `programme_decisions`
  row (`outcome = 'abstained'`, `DATABASE_SCHEMA.md` §6), not silently
  dropped, so the Coach can still answer "why didn't anything change?".
- **BodyScan / Progress (Layer 4/5):** `generateProgressReview`
  (`API_CONTRACTS.md` §16) already returns `insufficient_evidence` as a
  trajectory state (`MASTER_SPEC.md` §26.1); a `low`-reliability BodyScan
  (future, Layer 5) must not drive a major automated programme change
  (`MASTER_SPEC.md` §23.4) — reliability gating is the same abstention
  principle applied to computer-vision input.
- **Coach (Layer 6):** where the LLM is asked a question the structured
  context genuinely cannot answer, the required response is an honest "I
  don't have enough reliable information to make that change safely" (or
  the non-safety equivalent for a non-safety question), never a fabricated
  answer to avoid an unhelpful-seeming reply — enforced by the same
  groundedness check in §10 (an ungrounded claim is a "never"-list
  violation regardless of how well-intentioned the language is).

**Escalation/fallback:** an abstained outcome is always paired with a
plain-language reason (why, not just that) and, where relevant, a concrete
next step the user can take (e.g. "add equipment", "relax a restriction",
"try again once you've logged a few more sessions", "consult a qualified
professional" for safety-adjacent abstention). Abstaining is never a dead
end presented as a bug or a blank state.

### 2.5 Layer 5 — Computer Vision (future)

Not built in MVP. Reserved architecturally per `ARCHITECTURE.md` §9: an
asynchronous job over `body_scan_images`, writing to `scan_quality`,
independent of the synchronous capture path. When built, it remains
deterministic/model-based image analysis — not the conversational LLM — and
its output (`reliability: high|moderate|low`) is consumed by Layer 2/4
exactly like any other evidence input, gated the same way ("if reliability
is Low, do not use the scan to drive major automated programme changes",
`MASTER_SPEC.md` §23.4).

### 2.6 Layer 6 — LLM

The only layer that calls an external LLM provider. Responsibilities,
exhaustively:

- Coach conversation (`sendCoachMessage`) — natural-language answers
  grounded in structured context assembled by the Coach Context Builder
  (§4).
- Rephrasing Layer 2/4's deterministic, templated explanations into the
  user's selected coaching-style tone (§5) — never inventing the underlying
  claim.
- Interpreting free-text user input into structured intents where the
  product allows free text (e.g. "I only have 15 minutes" → intent:
  `generateQuickWorkout`).

The LLM **never**: decides exercise eligibility, decides whether a pain
report is safe to continue through, computes progression/load suggestions,
decides whether evidence is sufficient to act, or writes directly to
`programme_versions`/`personal_response_models`. It may only produce text,
and (via tool-calling, see §6) invoke Layer 1–4 operations that themselves
enforce the real constraints.

## 3. AIProvider abstraction

```ts
interface AIProvider {
  complete(input: {
    systemPrompt: string;
    context: StructuredContext; // see §4 — never raw chat history alone
    userMessage: string;
    tools?: ToolDefinition[]; // for structured intent extraction / Layer 2-4 invocation
  }): Promise<{
    text: string;
    toolCalls?: ToolCall[];
    usage: { inputTokens: number; outputTokens: number };
  }>;
}
```

Implementations:

- **`MockAIProvider`** — deterministic canned/templated responses, used in
  all automated tests and local development without incurring cost or
  requiring network access. This is what makes Coach-adjacent logic testable
  without hitting a real model (`MASTER_SPEC.md` §37).
- **`ClaudeAIProvider`** — wraps the Claude API (Messages API). Model
  selection and version are configuration, not hardcoded, so the provider
  can be upgraded without touching call sites.
- Future providers implement the same interface; nothing above Layer 6
  knows or cares which provider is active.

Selection is dependency-injected server-side (an Edge Function environment
variable / config value), never client-controlled. **Provider API keys live
only in Edge Function runtime environment variables** — this is the same
boundary as `ARCHITECTURE.md` §8's "no privileged key in the client" row,
applied specifically to AI keys.

## 4. Coach Context Builder

Assembles `StructuredContext` fresh on every `sendCoachMessage` call —
**chat transcript is never the source of truth for user state**
(`MASTER_SPEC.md` §20). Context sources, all read live from the tables in
[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md):

```ts
type StructuredContext = {
  goals: UserGoal[]; // ranked
  currentProgrammeSummary: ProgrammeVersionSummary;
  recentPerformance: { exerciseId: string; trend: string }[];
  upcomingSchedule: WorkoutSummary[];
  exercisePreferences: { exerciseId: string; sentiment: string }[];
  recentPersonalRecords: PersonalRecord[];
  adherenceSummary: { plannedLast4Weeks: number; completedLast4Weeks: number };
  motivationProfile?: MotivationProfileSummary; // P1
  coachingStyle: CoachingStyle;
};
```

The assembled context, plus which fields it drew on, is stored in
`coach_messages.structured_context_snapshot` for every reply
(`DATABASE_SCHEMA.md` §12) — this is both a debugging aid and the
auditability the product requires (§8).

## 5. Coaching styles as prompt configuration

The five styles (`MASTER_SPEC.md` §20.1) are implemented as **system-prompt
templates plus tone constraints**, not as different models or different
underlying claims. The set of facts available to the LLM (§4) is identical
regardless of style; only phrasing changes. A shared, style-independent
content filter enforces the hard "never" list (humiliation, body shaming,
manipulative guilt, fear-based messaging) as a post-generation check before
any LLM output reaches the user — implemented as a deterministic
keyword/pattern + classifier check, not trusted to prompting alone.

## 6. Tool-calling boundary

Where the coach needs to _act_ (e.g. "make today easier" → should actually
regenerate a Minimum workout, not just describe one), the LLM is given a
constrained tool/function-calling interface whose tools map 1:1 to
`API_CONTRACTS.md` operations already gated by Layers 1–4 (e.g.
`generateQuickWorkout`, `suggestExerciseSubstitution`). The LLM can request
that one of these run; it cannot bypass their internal deterministic logic,
because the tool implementation _is_ that deterministic logic. This is the
mechanism that makes "the LLM never overrides deterministic safety rules"
true even when the coach is empowered to take action, not just talk.

The conceptual flow this boundary enforces is always: **LLM identifies/
requests intent → typed tool/domain request → deterministic validation →
safety check → authorised domain operation → audit record → result
returned → LLM explains result.** The LLM never has a write path that
skips the middle of that chain.

### 6.1 Tool permission classification

Every tool the coach can invoke falls into exactly one of three permission
classes — this is what decides whether a Coach action needs explicit user
confirmation before it takes effect:

| Class                          | Meaning                                                                                                                               | Examples                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Automatic execution**        | Read-only, or a low-stakes/easily-reversible generated result the user explicitly asked for.                                          | Explaining a workout (read-only); `generateQuickWorkout` for a requested Quick/Minimum session (`API_CONTRACTS.md` §12) — generates through the deterministic engine, does not touch the standing programme.                                                                                                                                                                                                     |
| **User confirmation required** | Materially changes standing programme state; reversible, but not silently.                                                            | `respondToSubstitution` accepting a suggested swap (§7); Level 3/4 `evaluateAdaptation`/`generateProgramme` restructures (`PROGRAMME_ENGINE.md` §8) — the Coach may _propose_ these via conversation, but the write only happens after the user confirms in the relevant screen (Exercise Substitution, Reset/Restructure Plan, `SCREEN_SPECIFICATIONS.md` §3/§5), never as a side effect of a chat reply alone. |
| **Refusal / escalation**       | The LLM has no path to perform this at all — it is Layer 1–4's exclusively, or requires human judgement the product doesn't automate. | Any safety-relevant override (a Layer 1 exclusion, a `significant` pain report's deterministic action, §11 `reportPain`) — the Coach can _explain_ why, never override it; requests implying medical diagnosis or clearance decisions are refused with a suggestion to consult a qualified professional (`MASTER_SPEC.md` §8.2).                                                                                 |

A tool's class is a property of the tool/operation itself (defined once,
where the operation is implemented), not something the LLM decides
per-conversation — this is what keeps the boundary enforceable rather than
advisory.

## 7. Evidence & Confidence Engine — worked example

Directly implements the example in `MASTER_SPEC.md` §15:

| Scenario                                                                                       | `evidence_count`                                                   | `consistency` | `sufficientToAct` (Level 3 threshold)                                                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| One disliked-exercise rating                                                                   | 1                                                                  | n/a           | **No** — logged as a `preference_signals` row only                                                                             |
| Repeated consistent dislike + falling session completion for sessions containing that exercise | ≥3, corroborated by a second `evidence_type` (`adherence_pattern`) | high          | **Yes** — `evaluateAdaptation` produces a `change_level = 3` decision with both evidence types attached in `decision_evidence` |

Thresholds and the exact weighting function are tuning parameters owned by
[`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md) and are expected to be
refined empirically post-launch — the _architecture_ (evidence must be
explicit, stored, and thresholded before acting) is the fixed part; the
specific numbers are not.

## 8. Explainable AI

Every Layer 2–4 decision produces a **template-filled, plain-language
explanation** as a first-class output field (`programme_decisions.summary`,
`ProgrammeVersion.change_reason`), generated deterministically from the
decision's structured inputs (which evidence, which rule fired). The LLM
may be used only to _smooth the phrasing_ of an already-fully-determined
explanation (Layer 6 rephrasing, §2.6) — it must never be asked to
originate the justification, because that would let it assert a reason
that isn't the one that actually drove the decision. Internal
chain-of-thought (of either the deterministic engine's internal scoring or
any LLM reasoning) is never exposed to the user — only the resulting
plain-language summary is (`MASTER_SPEC.md` §21.2).

## 9. Logging & auditability

- Every AI provider call (Layer 6) logs: model/version, input token count,
  output token count, latency, and the `coach_messages`/operation it served
  — no raw health data beyond IDs, per `ARCHITECTURE.md` §12.
- Every Layer 2–4 decision is logged via `programme_decisions` +
  `decision_evidence`, immutable, per `DATABASE_SCHEMA.md` §6.
- Every safety-relevant Layer 1 verdict that excludes/modifies an exercise
  is traceable back to the `health_screenings`/`pain_reports`/
  `exercise_restrictions` rows that produced it, via the `restriction_code`
  join — sufficient to answer "why is this exercise not being suggested?"
  without guesswork.
- Every `programme_decisions` and `personal_response_models` row records the
  version of every engine/dataset that materially contributed to it
  (`engine_version`, `safety_rules_version`, `exercise_dataset_version`,
  `personalisation_rules_version`, `evidence_engine_version`, and
  `llm_model_version` where Layer 6 contributed phrasing) — see
  `DATABASE_SCHEMA.md` § Versioning. This is what lets a later audit answer
  "what rules and data produced this recommendation at that time?" even
  after the engine, dataset, or rules have since changed.

## 10. Evaluation

Two distinct evaluation surfaces, both required before any AI-touching
feature ships past the phase that introduces it (`IMPLEMENTATION_PLAN.md`):

- **Deterministic layers (1–4):** ordinary unit/integration tests with
  fixed inputs and exact expected outputs — no LLM involvement, fully
  reproducible in CI.
- **LLM layer (6):** a fixed evaluation set of representative coach
  prompts/contexts, graded against: (a) the hard "never" list (§5) — must be
  zero violations, gating any provider/prompt change; (b) groundedness —
  every factual claim in the reply must be traceable to a field in the
  supplied `StructuredContext`, checked via an automated groundedness check
  plus periodic human review; (c) tone adherence to the selected coaching
  style. Run on every prompt-template or provider/model change, not just
  pre-launch.

## 11. Cost control

Ordered preference, matching `MASTER_SPEC.md` §36:

1. Deterministic algorithm (Layers 1–4) — zero marginal AI cost.
2. Cached/precomputed results (e.g. `performance_metrics` recomputed
   periodically, not on every read).
3. A smaller/cheaper model where sufficient (e.g. structured intent
   extraction from short free-text input).
4. Server-side summarisation to keep `StructuredContext` compact before it
   reaches the LLM, rather than sending raw historical rows.
5. A full-capability LLM call, reserved for genuinely open-ended
   conversation (Coach) — the only Layer 6 use case that requires it.

Enforcement: per-user, per-operation rate limiting at the Edge Function
layer (`ARCHITECTURE.md` §6, §12); per-request token budgets on
`StructuredContext` size; usage/cost logged per §9 and reviewable against
the north-star/safety metrics dashboards (`MASTER_SPEC.md` §31). Cost
monitoring is treated as a Phase 9 (Coach) deliverable, not an
afterthought — see [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).
