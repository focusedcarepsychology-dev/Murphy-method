# Deferred Requirements

A record of requirements or ideas that have been raised but intentionally not
implemented yet, with the reason for deferral. Nothing should be silently
dropped — if it isn't being built now, it belongs here.

This list is derived from [`MASTER_SPEC.md`](MASTER_SPEC.md) §29.2/§29.3.
Every item was explicitly requested in the product brief and is preserved
here, not dropped, per `CLAUDE.md`'s "never silently remove or ignore a
requirement." None of these block MVP (P0).

## P1 — planned after MVP

- **Daily Readiness check-in** — optional pre-workout readiness capture
  (`MASTER_SPEC.md` §19.2). Deferred because MVP's programme engine and
  Quick/Minimum logic function correctly without it; readiness is an
  additional, conservative input on top of an already-working system, not
  a dependency of it. Schema (`readiness_entries`) reserved in
  `DATABASE_SCHEMA.md` §8 now to avoid a later migration.
- **Motivation Profile** — systematic modelling of what motivational
  framing works per user (`MASTER_SPEC.md` §20.2). Deferred because it
  requires meaningful behavioural history to produce reliable signal;
  building it before there's data to learn from would mean shipping an
  empty/placeholder feature. Schema (`motivation_profiles`) reserved.
- **Advanced adherence rescue** — beyond the basic Reset My Plan flow
  shipped in MVP Phase 8, more sophisticated detection and intervention
  sequencing (`MASTER_SPEC.md` §20.4). Deferred pending real adherence data
  to tune against.
- **More sophisticated adaptation** — refinement of the Evidence &
  Confidence Engine's thresholds and scoring beyond the MVP baseline
  (`PROGRAMME_ENGINE.md` §8, `AI_ARCHITECTURE.md` §2.4). Deferred because
  meaningful tuning requires real post-launch outcome data, not
  simulation.
- **Adaptive scheduling** — automatically adjusting _which days_ a user
  trains based on observed behaviour, beyond the static availability
  captured in onboarding. Deferred as a distinct, larger behavioural-
  modelling feature than MVP's schedule support.
- **Programme Fit** (`MASTER_SPEC.md` §26.3) — the composite transparent
  fit concept. Deferred because it's a synthesis of multiple other P1
  signals (motivation profile, advanced adherence data); building it on
  MVP-only inputs would be a weaker version not worth shipping twice.
- **Advanced coach personalisation** — deeper adaptation of coach behaviour
  beyond the five fixed coaching styles. Deferred pending Motivation
  Profile.
- **Ghost-overlay BodyScan** — pose-matched overlay guidance during capture
  (`MASTER_SPEC.md` §23.2). Deferred — computer vision (Layer 5) is
  explicitly out of MVP scope; the storage/metadata architecture supports
  adding this without a later migration (`ARCHITECTURE.md` §9).
- **Pose guidance** during BodyScan capture. Same rationale and same
  architectural preparation as ghost-overlay.
- **Scan Reliability Score** (`MASTER_SPEC.md` §23.4). Schema
  (`scan_quality`) reserved in `DATABASE_SCHEMA.md` §10; not populated
  until Layer 5 exists.
- **Wearable integration** — no wearable data source exists in MVP; all
  recovery/readiness signals are self-reported or derived from training
  data. Deferred as a distinct integration surface with its own scoping
  needs (which wearables, which data, consent model).
- **Advanced progress review** — deeper narrative/analysis beyond MVP's
  Progress Review screen. Deferred pending more longitudinal data per user.

## P2 / Research — not scoped for near-term work

- **3D body estimation** and **LiDAR/depth capture** — Research. No
  validated approach is assumed or promised; MVP BodyScan is explicitly
  2D comparison imagery only (`MASTER_SPEC.md` §23).
- **Automatic circumference estimates** from images — Research. Explicitly
  not promised in MVP; `MASTER_SPEC.md` §23.2 requires the product never
  fake precision it hasn't earned, and this capability isn't validated.
- **Advanced computer vision** generally, beyond MVP's zero-CV baseline.
- **Real-time form analysis** and **rep counting from camera** — Research;
  would require on-device or streaming CV infrastructure not built in
  MVP.
- **Predictive body-response models** — Research; requires substantial
  longitudinal data across many users before this is responsible to build,
  and raises the population-level-learning consent/de-identification
  requirements in `MASTER_SPEC.md` §39.
- **Advanced Adaptive Work Pathway forecasting** — MVP's Adaptive Work
  Pathway (`MASTER_SPEC.md` §26.2) shows current cumulative progress and a
  static estimated range; predictive forecasting beyond that is deferred.
- **BodyScan Mat** — physical product. `MASTER_SPEC.md` §23.3 requires the
  app remain fully functional without it; software architecture must never
  assume its existence, which the current design honours (calibration is
  optional and additive).
- **Human coach marketplace** — a significant separate product surface
  (matching, scheduling, payments, professional credentialing) with its
  own trust/safety model. Not scoped in this architecture phase beyond the
  MVP note that human override always remains available
  (`MASTER_SPEC.md` §21.3).
- **Sophisticated wearable recovery prediction** — depends on Wearable
  integration (P1) existing first.

## Architectural deferrals (not product features, but explicitly not decided now)

- **Multi-device concurrent workout logging** — MVP assumes single-writer-
  per-workout (`ARCHITECTURE.md` §5.1); a user logging the same workout
  simultaneously from two devices is not supported and not designed for.
  Revisit if usage data shows this is a real need.
- **Realtime coach streaming** — Coach is pull-based (request/response) in
  MVP (`ARCHITECTURE.md` §6); Supabase Realtime is not used. Revisit if
  P1 coach personalisation benefits materially from live updates.
- **Motivational experimentation framework** (`MASTER_SPEC.md` §20.3) —
  the A/B-style low-risk framing experiments are explicitly P1/premium
  scope in the brief and are not designed in this phase beyond the
  safeguards already recorded in `MASTER_SPEC.md` §20.3.
- **Deep-link redirect-target preservation** (`ROUTES.md` §7) — Phase 2A's
  route guard (`src/hooks/use-protected-route.ts`) redirects an
  unauthenticated deep link to Welcome/Sign In but does not yet carry the
  original target through sign-in and back to it afterward. No
  notification-originated deep links exist yet (notifications are a later
  phase per `IMPLEMENTATION_PLAN.md`), so nothing exercises this path
  today. Revisit once a later phase adds real notification deep links.
