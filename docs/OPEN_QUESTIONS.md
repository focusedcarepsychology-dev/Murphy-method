# Open Questions

Status: authoritative list of genuinely unresolved product/technical
decisions — things that require a human product/legal/design decision
rather than sound architecture alone. Per the brief: this list does not
include questions that architecture can reasonably resolve (those have been
resolved throughout `docs/`, with the reasoning recorded in
[`DECISIONS.md`](DECISIONS.md)).

Each item notes where it surfaced and what's needed to close it.

## Identity & onboarding

1. **Exact biological-sex/physiological field set.** `profiles`
   (`DATABASE_SCHEMA.md` §1) reserves a `biological_sex` field because some
   physiological calculations genuinely benefit from it, but the precise
   field (a binary flag vs. a broader set of options, whether it's required
   or optional, and exactly which calculations depend on it) needs product
   - a qualified exercise-science/clinical reviewer to define, not an
     architecture document. Needs resolution before Phase 3 (Onboarding)
     implements the Basic Profile screen.
2. **Age verification.** MVP assumes self-attested 18+ (`MASTER_SPEC.md`
   §3) via date-of-birth entry. Whether any stronger verification is
   required (for App Store/Play Store policy or regional law) is unresolved
   — needs legal input before public launch.
3. **Social sign-in requirements.** Apple's App Store guidelines require
   offering "Sign in with Apple" if any other third-party sign-in (e.g.
   Google) is offered. Whether MVP ships with email/password only (avoiding
   the requirement entirely) or adds social sign-in from day one is a
   product decision, not resolved in `ARCHITECTURE.md` §6.

## Data & retention

4. **Account deletion grace period.** `API_CONTRACTS.md` §22 assumes a
   grace window (deletion is "scheduled," with a `cancelAccountDeletion`
   escape hatch) but the exact duration is unspecified — a product/legal
   decision, not an architectural one.
5. **Screening honesty / liability framing.** Safety screening
   (`MASTER_SPEC.md` §8.1) relies on self-reported answers; architecture
   cannot guarantee honesty. The exact disclaimer/consent copy and its
   legal review is unresolved (flagged in `RISKS.md` #1).
6. **Regional regulatory review.** `RISKS.md` #11 flags that health-data-
   adjacent handling (screening responses, BodyScan imagery) may trigger
   region-specific obligations (e.g. biometric-data statutes, health-data
   rules) beyond general privacy practice. Needs dedicated legal/compliance
   review before public launch — out of scope for this architecture phase.

## Infrastructure choices

7. **Analytics provider.** `ARCHITECTURE.md` §11 defines the event
   contract and PII constraints but does not select a vendor (e.g.
   PostHog, Amplitude, a Supabase-native approach). Needs a product/
   engineering decision at Phase 1/2.
8. **Error tracking / crash reporting SDK.** `ARCHITECTURE.md` §12 defines
   the requirement (scrub health-sensitive fields, wire client + Edge
   Functions) but not the specific provider (e.g. Sentry). Decide at
   Phase 1/2.
9. **Realtime coach streaming.** Coach is designed pull-based for MVP
   (`ARCHITECTURE.md` §6); whether P1 coach personalisation should move to
   Supabase Realtime/streaming responses is left open pending user feedback
   on the pull-based experience.
10. **Subscription billing platform.** `MASTER_SPEC.md` §30 defines tiers
    conceptually; whether billing runs through Apple/Google in-app
    purchase, Stripe, or a mix (and how that interacts with the
    `subscriptions` table's `provider` field) is a business decision not
    made in this phase.

## Product behaviour

11. **BodyScan cadence enforcement.** `MASTER_SPEC.md` §23.5 recommends a
    2–4 week cadence and asks the product to stay alert to excessive-
    scanning patterns, but doesn't mandate a hard technical limit. Whether
    the product should soft-nudge (copy only) or hard-limit (disable new
    scan capture before N days have passed) is an unresolved product/
    body-image-safety decision — recommend involving a clinical/ED-aware
    reviewer before deciding.
12. **Default coaching style assignment.** Onboarding requires a selection
    (`SCREEN_SPECIFICATIONS.md` §2) but whether there's a recommended
    default (e.g. based on stated goals) or a neutral forced choice is
    unresolved — minor, but affects onboarding-step design.
13. **Push notification permission timing.** Whether the OS permission
    prompt is requested during onboarding or deferred to first relevant
    moment (e.g. first workout scheduled) is a UX decision affecting
    opt-in rates, not resolved here.
14. **Exact volume/frequency literature ranges.** `PROGRAMME_ENGINE.md` §5
    intentionally works in ranges rather than fixed numbers and defers the
    exact range values to configuration tuned with exercise-science input.
    A qualified reviewer should sign off on the initial range values before
    Phase 5 ships, not just an engineering estimate.
15. **Wearable integration scope (P1).** `DEFERRED.md` lists wearable
    integration as P1 but doesn't specify which wearables/platforms
    (Apple Health, Google Fit/Health Connect, specific device APIs) or
    which data types are in scope — needs product scoping when that phase
    is approached.

## Explicitly not open questions (resolved by architecture, listed here only to preempt re-litigation)

- Backend platform (Supabase), AI provider abstraction shape, offline
  architecture, database schema shape, RLS approach, and the AI layer
  model are all resolved in `ARCHITECTURE.md`/`AI_ARCHITECTURE.md`/
  `DATABASE_SCHEMA.md` and recorded in `DECISIONS.md`. Revisit only if a
  genuine blocking technical issue emerges during implementation, per
  `CLAUDE.md`'s guidance to document rather than silently deviate.
