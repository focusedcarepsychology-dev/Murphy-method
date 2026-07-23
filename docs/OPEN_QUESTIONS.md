# Open Questions

Status: authoritative list of genuinely unresolved product/technical
decisions — things that require a human product/legal/design decision
rather than sound architecture alone. Per the brief: this list does not
include questions that architecture can reasonably resolve (those have been
resolved throughout `docs/`, with the reasoning recorded in
[`DECISIONS.md`](DECISIONS.md)).

Each item notes where it surfaced, what's needed to close it, and is
classified:

- **A — must resolve before Phase 1.** None of the items below block
  Phase 1 (Design System / Application Shell, `IMPLEMENTATION_PLAN.md`) —
  Phase 1 builds no product data model or business logic, so no genuinely
  open product/legal question blocks it. This is a deliberate finding, not
  an oversight: per `IMPLEMENTATION_PLAN.md`, product data decisions first
  matter starting Phase 2/3.
- **B — must resolve before public beta** (may still block a specific
  earlier phase, noted per item).
- **C — can safely defer** (does not block any phase through Phase 12; a
  reasonable default can ship and be revisited).

## Identity & onboarding

1. **Exact biological-sex/physiological field set.** [**B** — blocks
   Phase 3's Basic Profile screen specifically, not Phase 1] `profiles`
   (`DATABASE_SCHEMA.md` §1) reserves a `biological_sex` field because some
   physiological calculations genuinely benefit from it, but the precise
   field (a binary flag vs. a broader set of options, whether it's required
   or optional, and exactly which calculations depend on it) needs product
   - a qualified exercise-science/clinical reviewer to define, not an
     architecture document. Needs resolution before Phase 3 (Onboarding)
     implements the Basic Profile screen.
2. **Age verification.** [**B**] MVP assumes self-attested 18+
   (`MASTER_SPEC.md` §3) via date-of-birth entry. Whether any stronger
   verification is required (for App Store/Play Store policy or regional
   law) is unresolved — needs legal input before public launch; does not
   block architecture, onboarding UI, or any phase through Phase 11.
3. **Social sign-in requirements.** [**B** — a real decision is needed
   before Phase 2 (Auth) ships, but a safe default (email/password only)
   lets Phase 2 proceed without blocking on it] Apple's App Store
   guidelines require offering "Sign in with Apple" if any other
   third-party sign-in (e.g. Google) is offered. Whether MVP ships with
   email/password only (avoiding the requirement entirely) or adds social
   sign-in from day one is a product decision, not resolved in
   `ARCHITECTURE.md` §6.

## Data & retention

4. **Account deletion grace period.** [**B**] `API_CONTRACTS.md` §22
   assumes a grace window (deletion is "scheduled," with a
   `cancelAccountDeletion` escape hatch) but the exact duration is
   unspecified — a product/legal decision, not an architectural one; only
   needs resolving before Phase 11 (Privacy/Security Hardening) ships it.
5. **Screening honesty / liability framing.** [**B**] Safety screening
   (`MASTER_SPEC.md` §8.1) relies on self-reported answers; architecture
   cannot guarantee honesty. The exact disclaimer/consent copy and its
   legal review is unresolved (flagged in `RISKS.md` #1) — needed before
   Phase 3 ships real screening copy to real users, and in any case before
   public beta.
6. **Regional regulatory review.** [**B**] `RISKS.md` #11 flags that
   health-data-adjacent handling (screening responses, BodyScan imagery)
   may trigger region-specific obligations (e.g. biometric-data statutes,
   health-data rules) beyond general privacy practice. Needs dedicated
   legal/compliance review before public launch — out of scope for this
   architecture phase; does not block any implementation phase.

## Infrastructure choices

7. **Analytics provider.** [**C**] `ARCHITECTURE.md` §11 defines the event
   contract and PII constraints but does not select a vendor (e.g.
   PostHog, Amplitude, a Supabase-native approach). A reasonable default
   can be picked when Phase 1/2 instrumentation is actually wired up
   without blocking architecture or any earlier phase.
8. **Error tracking / crash reporting SDK.** [**C**] `ARCHITECTURE.md` §12
   defines the requirement (scrub health-sensitive fields, wire client +
   Edge Functions) but not the specific provider (e.g. Sentry). Decide at
   Phase 1/2 implementation time; the requirement, not the vendor, is what
   matters architecturally.
9. **Realtime coach streaming.** [**C**] Coach is designed pull-based for
   MVP (`ARCHITECTURE.md` §6); whether P1 coach personalisation should move
   to Supabase Realtime/streaming responses is left open pending user
   feedback on the pull-based experience — inherently a post-MVP question.
10. **Subscription billing platform.** [**C**] `MASTER_SPEC.md` §30 defines
    tiers conceptually; whether billing runs through Apple/Google in-app
    purchase, Stripe, or a mix (and how that interacts with the
    `subscriptions` table's `provider` field) is a business decision not
    made in this phase, and not needed until monetisation is actually
    scoped — well after MVP (P0) functionality.

## Product behaviour

11. **BodyScan cadence enforcement.** [**B**] `MASTER_SPEC.md` §23.5
    recommends a 2–4 week cadence and asks the product to stay alert to
    excessive-scanning patterns, but doesn't mandate a hard technical
    limit. Whether the product should soft-nudge (copy only) or hard-limit
    (disable new scan capture before N days have passed) is an unresolved
    product/body-image-safety decision — recommend involving a
    clinical/ED-aware reviewer before deciding; needed before public beta
    given the body-image-harm risk (`RISKS.md` #8), not before Phase 1–9.
12. **Default coaching style assignment.** [**C**] Onboarding requires a
    selection (`SCREEN_SPECIFICATIONS.md` §2) but whether there's a
    recommended default (e.g. based on stated goals) or a neutral forced
    choice is unresolved — minor, decidable during Phase 3 implementation
    without a separate resolution step.
13. **Push notification permission timing.** [**C**] Whether the OS
    permission prompt is requested during onboarding or deferred to first
    relevant moment (e.g. first workout scheduled) is a UX decision
    affecting opt-in rates — decidable during the phase that implements
    notifications (Phase 8+) without blocking earlier work.
14. **Exact volume/frequency literature ranges.** [**B** — blocks Phase 5
    specifically] `PROGRAMME_ENGINE.md` §5 intentionally works in ranges
    rather than fixed numbers and defers the exact range values to
    configuration tuned with exercise-science input. A qualified reviewer
    should sign off on the initial range values before Phase 5 ships, not
    just an engineering estimate — well before Phase 1, but a real gate on
    Phase 5.
15. **Wearable integration scope (P1).** [**C**] `DEFERRED.md` lists
    wearable integration as P1 but doesn't specify which wearables/
    platforms (Apple Health, Google Fit/Health Connect, specific device
    APIs) or which data types are in scope — needs product scoping only
    when that phase is approached, safely deferrable past MVP entirely.

## Explicitly not open questions (resolved by architecture, listed here only to preempt re-litigation)

- Backend platform (Supabase), AI provider abstraction shape, offline
  architecture, database schema shape, RLS approach, and the AI layer
  model are all resolved in `ARCHITECTURE.md`/`AI_ARCHITECTURE.md`/
  `DATABASE_SCHEMA.md` and recorded in `DECISIONS.md`. Revisit only if a
  genuine blocking technical issue emerges during implementation, per
  `CLAUDE.md`'s guidance to document rather than silently deviate.
