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

### 2.3 Layer 3 — Personalisation Engine

Aggregates `preference_signals`, adherence patterns
(`workouts`/`notification_responses`), and feedback into
`personal_response_models` rows (§ `DATABASE_SCHEMA.md` §11). Runs as
scheduled/triggered Edge Function jobs, deterministic aggregation (weighted
recency-favoured averages, categorical counts) — not an LLM call. Its output
feeds Layer 2 (e.g. down-weighting a disliked exercise in scoring) and Layer 4.

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
