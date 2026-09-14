# Murphy Method — commercial validation analytics

## Purpose

This document narrows product telemetry to the current commercial question: **does the core adaptive workout/accountability loop create enough repeated use and willingness to pay to justify further feature expansion or paid acquisition?**

It does not replace the broader product analytics contract in `ARCHITECTURE.md`. It adds the minimum evidence layer needed for the first 30-user validation cohort.

## Cohort contract

Every validation participant should receive a stable, non-identifying `cohort` label (for example `beta-2026-09`) and an `acquisition_source` category. Do not send names, email addresses, health information, body measurements, diagnoses, injuries, BodyScan data or free text into product analytics.

The provider-neutral implementation lives in:

- `src/services/analytics/track-event.ts`
- `src/services/analytics/validation-events.ts`

Analytics failure is always non-blocking.

## Required validation events

| Event | Commercial meaning |
| --- | --- |
| `validation_cohort_joined` | denominator for the cohort |
| `onboarding_started` | user entered the activation funnel |
| `onboarding_completed` | setup friction cleared |
| `first_plan_ready` | first value unit available |
| `workout_started` | intended use began |
| `workout_completed` | core value unit completed |
| `weekly_checkin_completed` | repeat/adaptation loop engaged |
| `accountability_action_completed` | accountability loop engaged |
| `pay_intent_prompted` | denominator for willingness-to-pay question |
| `pay_intent_positive` | explicit willingness to pay |
| `pay_intent_negative` | explicit rejection; capture reason separately in consented research, not analytics free text |
| `checkout_started` | monetisation intent |
| `paid_conversion` | settled commercial success |
| `subscription_cancelled` | retention/monetisation failure signal |

## Definitions

**Activated user**

A cohort member who completes onboarding and reaches `first_plan_ready`, then completes at least one workout within 72 hours of joining.

**Week-1 retained**

An activated user with at least one `workout_completed`, `weekly_checkin_completed` or `accountability_action_completed` event on cohort days 4–7.

**Week-4 retained**

An activated user with at least one core-loop event on cohort days 22–28 and at least two completed workouts during days 15–28. This prevents a single accidental app open from being counted as meaningful retention.

**Pay-intent positive**

A cohort member who explicitly answers yes to the current paid-offer question. The question/price band must be versioned with `experiment_id`, `variant`, `pay_band` and `currency` so different offers are not mixed together.

**Paid conversion**

A successfully settled payment or active paid subscription. `checkout_started` is not revenue.

## Promotion gates

The product remains in **VALIDATE** mode until the cohort contains at least 30 participants.

- If week-4 retention is below 25%, change the core proposition/onboarding/habit loop before broad feature expansion.
- The current scale target is at least 50% week-4 retention and at least 10 of 30 participants expressing credible willingness to pay.
- Do not buy traffic until retention is demonstrated; acquisition cannot repair a product that does not retain users.
- Do not treat feature usage, streaks, messages, app opens or generated plans as commercial success unless they causally improve retention or paid conversion.

## Experiment discipline

Every behavioural or monetisation test should carry a stable `experiment_id` and `variant`. Compare a challenger against the existing journey and preserve guardrails: safety, opt-out, user burden, crash rate and support burden.

A challenger should not become the default because it produces more engagement events. Promotion requires improvement in the relevant downstream metric (retention, credible pay intent or paid conversion) without guardrail deterioration.

## Reporting

The cohort report should contain only:

1. joined, activated, week-1 retained, week-4 retained;
2. workouts completed per activated user;
3. check-in/accountability loop participation;
4. pay-intent positive / prompted;
5. checkout started and paid conversions;
6. results by acquisition source and experiment variant;
7. support/founder minutes per retained or paid user once measurable.

This is sufficient to decide whether to iterate, monetise or scale without building a large analytics stack first.
