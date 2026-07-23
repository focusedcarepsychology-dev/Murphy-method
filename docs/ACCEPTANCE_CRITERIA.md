# Acceptance Criteria

Status: authoritative for this phase. Global quality gates that apply
across every phase in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md),
in addition to (not instead of) each phase's own acceptance criteria. A
phase is not complete if it violates any gate below that its scope touches.

## Security & privacy

1. No user can access another user's private data (health information,
   measurements, workouts, coaching history, BodyScan photographs) —
   verified by automated negative tests against RLS on every user-owned
   table (`DATABASE_SCHEMA.md`).
2. No BodyScan image is ever accessible via a public or unauthenticated
   URL — verified by an automated test attempting unauthenticated and
   cross-user object access.
3. No privileged key (Supabase service role, AI provider API key) is ever
   present in a client bundle — verified by an automated build-artifact
   check.
4. Every BodyScan capture requires prior explicit consent
   (`consent_records`), and declining consent leaves the product fully
   usable (`MASTER_SPEC.md` §38).
5. Data export produces a complete, human-readable bundle of a test
   account's data; account deletion removes/anonymises all rows per the
   retention rules in `DATABASE_SCHEMA.md`, verified by an automated
   post-deletion query sweep.
6. No analytics event contains raw health-sensitive values (exact
   measurements, BodyScan data) — only categorical/derived values
   (`ARCHITECTURE.md` §11).

## Safety

7. Pain overrides preference optimisation: a `significant`-severity pain
   report deterministically pauses progression / modifies / stops the
   relevant exercise, regardless of any concurrent AI/coach output
   (`MASTER_SPEC.md` §8.2).
8. Safety rules (Layer 1) are never bypassable by LLM output — verified by
   the LLM evaluation harness's "never" list checks
   (`AI_ARCHITECTURE.md` §10) plus the architectural fact that Layer 6 has
   no write path to safety-relevant state except through already-gated
   tool operations (`AI_ARCHITECTURE.md` §6).
9. The system never diagnoses a medical, psychiatric, or eating-disorder
   condition; concerning patterns produce supportive/escalation copy, not
   a diagnostic claim (`MASTER_SPEC.md` §8.2, §23.5).

## Programme integrity

10. Programme generation and adaptation work correctly and are fully
    testable with **zero LLM/AI provider calls**
    (`MASTER_SPEC.md` §10, `PROGRAMME_ENGINE.md`).
11. A single dislike rating (or any single weak signal) does not trigger a
    Level 2+ programme change — verified by the explicit automated test
    reproducing `MASTER_SPEC.md` §15's example
    (`AI_ARCHITECTURE.md` §7).
12. Every Level 2+ programme change is auditable: a `programme_versions`
    row with `previous_version_id`, `change_level`, `change_reason`, and a
    linked `programme_decisions`/`decision_evidence` record exists for it
    (`MASTER_SPEC.md` §16).
13. Programme changes respect stated goal priority order — a lower-
    priority goal is never fully dropped from the programme in favour of a
    higher-priority one (`MASTER_SPEC.md` §7, `PROGRAMME_ENGINE.md` §2).
14. Generated programmes never violate a hard eligibility constraint
    (excluded exercise, unavailable required equipment) — verified by
    property-based tests across randomised valid input combinations
    (`IMPLEMENTATION_PLAN.md` Phase 5).

## User control

15. The user can reject or override any AI/system recommendation
    (substitution, restructure suggestion) without being blocked, and the
    override is captured as a preference signal, not silently discarded
    (`MASTER_SPEC.md` §21.3).
16. A user-requested programme change (Reset/Restructure, exercise swap
    rejection) is never blocked by the system-triggered stability window
    (`PROGRAMME_ENGINE.md` §8).

## Data integrity & resilience

17. A workout in progress survives a dropped network connection and an
    interrupted app session with no lost sets — verified by an automated
    offline-simulation test (`ARCHITECTURE.md` §5,
    `IMPLEMENTATION_PLAN.md` Phase 6).
18. Retried/duplicated sync attempts never double-write a set or workout —
    verified by idempotency tests against `client_generated_id` keys.

## Product language & body image

19. No fake body-composition precision: goal trajectory is always shown as
    one of the defined categorical states, never a fabricated precise
    percentage or measurement claim the underlying data can't support
    (`MASTER_SPEC.md` §26.1, §23.4).
20. No banned language (bad body, ugly, defect, problem area, failure,
    perfect body score, punishment, burn off food, problem body) appears
    in any UI copy or AI-generated output — verified by a content-lint
    test covering static copy and the LLM evaluation harness covering
    generated text (`MASTER_SPEC.md` §4).
21. No attractiveness scoring and no cross-user body comparison exists
    anywhere in the product.
22. Streak/consistency mechanics are never framed as destructive ("you
    ruined your streak") — verified by content review of all Momentum/
    Consistency copy (`MASTER_SPEC.md` §17).

## Explainability & AI boundaries

23. Every significant recommendation (substitution, programme change) can
    answer "why?" in concise, user-facing language without exposing
    internal chain-of-thought or raw scores (`MASTER_SPEC.md` §21.2).
24. Every Coach reply's factual claims are traceable to the structured
    context supplied to it (`structured_context_snapshot`), checked by an
    automated groundedness pass (`AI_ARCHITECTURE.md` §10).

## Screen quality

25. Every P0 screen has explicit loading, empty, and error states where
    applicable, per `SCREEN_SPECIFICATIONS.md` §0 — audited at
    `IMPLEMENTATION_PLAN.md` Phase 12, but expected to already hold true
    screen-by-screen as each phase ships it.
26. Every P0 screen meets the accessibility baseline in
    `DESIGN_SYSTEM.md` §8 (screen-reader labels, WCAG AA contrast, scalable
    type, reduced-motion support).

## Engineering hygiene (per `CLAUDE.md`)

27. `npm run typecheck`, `npm run lint`, and `npm run format:check` pass
    before any phase is declared complete.
28. Relevant tests (per that phase's `IMPLEMENTATION_PLAN.md` entry) pass.
29. No requirement from `MASTER_SPEC.md` is silently dropped — anything not
    built is recorded in `DEFERRED.md`; anything disagreed with is recorded
    in `DECISIONS.md` or `RISKS.md` with the product intent preserved.
