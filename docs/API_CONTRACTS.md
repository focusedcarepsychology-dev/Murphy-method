# API Contracts

Status: authoritative for this phase, at an architectural level. These are
**domain service contracts**, not necessarily literal REST endpoints — per
`MASTER_SPEC.md` §34, each is implemented as either a direct
RLS-protected Supabase table operation (client → Postgres) or a Supabase
Edge Function, per the rule in [`ARCHITECTURE.md`](ARCHITECTURE.md) §6:
_privilege escalation or cross-cutting domain logic goes through an Edge
Function; simple owner-scoped CRUD does not._

Types below are illustrative TypeScript shapes to pin down the contract,
not final implementation types. All operations require an authenticated
session unless noted. All Edge Function operations are scoped to
`auth.uid()` — no operation accepts an arbitrary `profileId` from the
caller for anything other than the caller's own profile.

## Transport legend

- **[table]** — direct Supabase client call against an RLS-protected table.
- **[fn]** — Supabase Edge Function.
- **[fn+ai]** — Edge Function that calls the `AIProvider` abstraction
  ([`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md)).

---

## 1. Authentication

Supabase Auth client SDK directly; not a custom contract. Session
management (sign up, sign in, forgot password, email verification) uses
Supabase Auth's existing API surface.

## 2. Profile — **[table]** + **[fn]** for completion

```ts
// [table] read/update own profile
getProfile(): Profile
updateProfile(patch: Partial<ProfileFields>): Profile

// [fn] completeOnboarding — validates all required onboarding data exists
// across profiles/user_goals/body_area_goals/user_equipment/
// health_screenings before setting onboarding_completed_at, then triggers
// generateProgramme (§6).
completeOnboarding(): { profile: Profile; programme: ProgrammeVersion }
```

## 3. Goals — **[table]**

```ts
listGoals(): Goal[]                              // reference data
setUserGoals(goals: { goalId: string; priority: number }[]): UserGoal[]
setBodyAreaGoals(areas: { bodyAreaKey: string; priority?: number }[]): BodyAreaGoal[]
```

Priority uniqueness (`MASTER_SPEC.md` §7) is enforced by the `unique
(profile_id, priority) where active` constraint in
[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md); the client must handle the
constraint-violation error path (e.g. reassign priorities atomically in one
call rather than one row at a time).

## 4. Equipment — **[table]**

```ts
listEquipment(): Equipment[]                      // reference data
setUserEquipment(items: { equipmentId: string; available: boolean }[]): UserEquipment[]
```

## 5. Exercise Library — **[table]**

```ts
listExercises(filter?: { movementPattern?: string; equipmentIds?: string[] }): Exercise[]
getExercise(exerciseId: string): ExerciseDetail    // includes muscles, substitutes, media
```

Read-only reference data; no write contract for end users.

## 6. Programme Generation — **[fn]**

```ts
// Called once at onboarding completion (via completeOnboarding) and
// available for explicit "Reset / Restructure Plan" (Level 4 change).
generateProgramme(input: {
  reason: 'onboarding' | 'user_requested_restructure';
}): {
  programme: Programme;
  version: ProgrammeVersion;         // change_level = 4 (or initial, no previous_version_id)
  explanation: string;               // Explainable AI summary
};
```

Runs the deterministic pipeline in
[`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md) — no LLM call is required for
this operation to succeed (`MASTER_SPEC.md` §10). `explanation` is generated
by deterministic templating over the engine's structured output; an LLM may
optionally rephrase it for tone (Layer 6), but the underlying claims come
from Layer 2 output, never invented by the LLM.

## 7. Programme Adaptation — **[fn]**

```ts
// Internal/system-triggered in most cases (background job evaluating
// evidence per PROGRAMME_ENGINE.md); also invoked synchronously when a
// user action (pain report, equipment change, explicit swap request)
// warrants an immediate adaptation check.
evaluateAdaptation(trigger: {
  type: 'pain_report' | 'equipment_change' | 'evidence_threshold' | 'user_request';
  referenceId?: string;               // e.g. pain_reports.id
}): {
  // decision.outcome distinguishes an ordinary "evaluated, no change
  // needed" (change_level 0, outcome 'applied') from an explicit abstain
  // (change_level 0, outcome 'abstained' — evidence conflicted or no safe
  // option existed; see AI_ARCHITECTURE.md §2.4.1). Both are logged; only
  // the latter surfaces "not enough reliable information" framing to the
  // user where relevant (e.g. via Coach).
  decision: ProgrammeDecision;        // may be change_level 0 (no-op, still logged)
  newVersion?: ProgrammeVersion;      // present only if change_level >= 2
};

// User-initiated substitution acceptance/rejection (MASTER_SPEC.md §21.3)
respondToSubstitution(input: {
  workoutExerciseId: string;
  action: 'accept' | 'reject' | 'lock_current';
}): WorkoutExercise;
```

`respondToSubstitution` writes a `preference_signals` row regardless of the
user's choice (§13) — override behaviour is itself a learning signal.

## 8. Workout Logging — **[table]** for set-level writes, **[fn]** for lifecycle transitions

```ts
// [fn] startWorkout — materialises a workouts + workout_exercises row set
// from the current programme_version (or from generateQuickWorkout output),
// returns a client_generated_id-keyed payload the client persists locally
// first (ARCHITECTURE.md §5).
startWorkout(input: { workoutId?: string; mode: 'full' | 'quick' | 'minimum' }): WorkoutWithExercises;

// [table] logSet — direct table upsert keyed on client_generated_id,
// safe to retry from the offline sync queue.
logSet(set: SetLogInput & { clientGeneratedId: string }): SetLog;

// [fn] submitWorkout — closes out the workout, computes personal_records,
// enqueues performance_metrics recomputation, and enqueues an evidence
// evaluation (§7) from the resulting exercise/workout feedback once
// submitted.
submitWorkout(workoutId: string): {
  workout: Workout;
  newPersonalRecords: PersonalRecord[];
};
```

## 9. Exercise Feedback — **[table]**

```ts
submitExerciseFeedback(feedback: {
  workoutExerciseId: string;
  enjoyment?: 1 | 2 | 3 | 4 | 5;
  difficulty?: 'too_easy' | 'appropriate' | 'very_hard' | 'too_hard';
  signalType?: 'dislike' | 'excessive_difficulty' | 'pain' | 'technical_insecurity' | 'boredom';
}): ExerciseFeedback;
```

If `signalType === 'pain'`, the client must additionally call `reportPain`
(§11) — this table alone never triggers the pain flow's conservative rules.

## 10. Workout Feedback — **[table]**

```ts
submitWorkoutFeedback(feedback: {
  workoutId: string;
  enjoyment?: 1 | 2 | 3 | 4 | 5;
  overallDifficulty?: 1 | 2 | 3 | 4 | 5;
  energyAfterwards?: 'better' | 'same' | 'worse';
  wouldRepeat?: 'yes' | 'maybe' | 'no';
}): WorkoutFeedback;
```

## 11. Pain / Safety — **[fn]**

```ts
reportPain(input: {
  workoutExerciseId?: string;
  exerciseId?: string;
  bodyArea: string;
  severity: 'mild' | 'moderate' | 'significant';
  description?: string;
}): {
  painReport: PainReport;
  actionTaken: 'paused_progression' | 'exercise_modified' | 'exercise_stopped' | 'escalation_shown';
  guidance: string;                  // non-diagnostic, supportive copy; escalation messaging where warranted
};
```

An Edge Function (not a plain table write) because it must synchronously
apply Layer 1 deterministic rules (pause progression, exclude/modify the
exercise going forward) and may trigger `evaluateAdaptation` — this is
exactly the "safety rules override AI output, always" boundary from
`MASTER_SPEC.md` §8.2, enforced server-side regardless of what any AI layer
concludes.

## 12. Quick Workout Generation — **[fn]**

```ts
generateQuickWorkout(input: { mode: 'quick' | 'minimum' }): WorkoutWithExercises;
```

Deterministic reprioritisation over the current programme version per
`MASTER_SPEC.md` §19.3 and [`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md) §
Quick/Minimum Logic — no LLM call required.

## 13. Exercise Substitution — **[fn]**

```ts
suggestExerciseSubstitution(input: {
  workoutExerciseId: string;
  reason: 'dislike' | 'equipment_unavailable' | 'pain' | 'user_request';
}): {
  // An empty array is a valid, explicit response — "no suitable
  // alternative exists within your current equipment/restrictions" — not
  // an error and not a bug to paper over client-side. See
  // AI_ARCHITECTURE.md §2.4.1 (Abstention).
  candidates: { exercise: Exercise; score: number; explanation: string }[];
};
```

Ranking per `MASTER_SPEC.md` §18 / `PROGRAMME_ENGINE.md`. Accepting a
candidate goes through `respondToSubstitution` (§7). An empty
`candidates` array is rendered by Exercise Substitution
(`SCREEN_SPECIFICATIONS.md` §3) with an explanatory message and the
"keep current exercise" fallback, never as a loading/error state.

## 14. Personal Response Model — **[table]** read, **[fn]** write

```ts
// [table] — read-only to the client
getPersonalResponseModel(domain?: PRMDomain): PRMAttribute[];

// [fn] — internal, invoked by background evidence-processing jobs, not
// directly callable by the client with arbitrary input.
recomputePRMAttribute(input: { attributeKey: string }): PRMAttribute;
```

## 15. Evidence & Confidence — **[fn]**, internal

```ts
// Not exposed as a standalone client-callable operation; consumed
// internally by evaluateAdaptation (§7) and recomputePRMAttribute (§14).
// Its contract is documented for completeness in AI_ARCHITECTURE.md
// § Evidence & Confidence Engine.
assessEvidence(input: {
  profileId: string;
  evidenceType: string;
  subjectId?: string;
}): {
  sufficientToAct: boolean;
  confidence: number;
  evidenceCount: number;
  // Present when sufficientToAct is false. Distinguishes "not enough
  // evidence yet" (ordinary, expected pre-decision state) from "abstain"
  // (evidence conflicts, or no safe/eligible option exists) — see
  // AI_ARCHITECTURE.md §2.4.1. Absent when sufficientToAct is true.
  insufficiencyReason?: 'not_enough_evidence' | 'conflicting_evidence' | 'no_eligible_option';
};
```

## 16. Progress — **[table]** for reads, **[fn]** for computed reviews

```ts
// [table]
listMeasurements(metric?: string): BodyMeasurement[];
recordMeasurement(input: { metric: string; value: number; measuredOn: string }): BodyMeasurement;
listPersonalRecords(exerciseId?: string): PersonalRecord[];

// [fn] generateProgressReview — combines visual/measurement/performance/
// adherence evidence per MASTER_SPEC.md §26; returns categorical
// trajectory, never a fabricated precise percentage.
generateProgressReview(input: { goalId?: string }): {
  objectiveMetrics: { label: string; value: string }[];
  trajectory: 'ahead' | 'on_track' | 'slower_than_expected' | 'insufficient_evidence';
  narrative: string;
};

// [fn] getAdaptiveWorkPathway — MASTER_SPEC.md §26.2
getAdaptiveWorkPathway(bodyAreaKey: string): {
  qualityRepsCompleted: number;
  estimatedRangeLow: number;
  estimatedRangeHigh: number;
  nextMilestone: string;
};
```

## 17. BodyScan — **[fn]** for upload + comparison

```ts
// [fn] requestBodyScanUpload — returns a short-lived signed upload URL
// per image, and pre-creates the body_scans/body_scan_images rows.
requestBodyScanUpload(input: {
  purpose: 'baseline' | 'progress_check';
  angles: ('front' | 'side' | 'back' | 'angle_45')[];
}): { scanId: string; uploads: { angle: string; imageId: string; uploadUrl: string }[] };

// [fn] confirms upload completion, finalises capture_metadata
completeBodyScanUpload(scanId: string): BodyScan;

// [fn] getBodyScanComparison — returns signed *read* URLs, never public
getBodyScanComparison(input: { scanIdA: string; scanIdB: string }): {
  imagesA: SignedImage[];
  imagesB: SignedImage[];
};

deleteBodyScan(scanId: string): void;   // [fn] — deletes row + storage object together
```

## 18. Coach — **[fn+ai]**

```ts
sendCoachMessage(input: { threadId?: string; message: string }): {
  threadId: string;
  reply: string;
  structuredContextUsed: string[];     // which structured tables informed the reply, for auditability
};

getDailyInsight(): { insight: string };
getWeeklyInsight(): { insight: string };
```

Full context-assembly contract: [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) §
Coach Context Builder. The coach never receives raw chat history as its only
input — every call re-assembles structured context from the tables in
[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

## 19. Notifications — **[table]** read, **[fn]** for preference-driven scheduling

```ts
listNotificationPreferences(): NotificationPreferences;
updateNotificationPreferences(patch: Partial<NotificationPreferences>): NotificationPreferences;
recordNotificationResponse(input: {
  notificationId: string;
  responseType: 'opened' | 'started_workout' | 'quick' | 'rescheduled' | 'skipped' | 'dismissed';
}): void;
```

Scheduling/sending itself is a server-side job, not a client-callable
operation.

## 20. Subscriptions — **[table]** read, provider webhook for writes

```ts
getSubscription(): Subscription;
```

Writes happen via a provider webhook Edge Function (App Store / Play Store /
Stripe server notifications), not via a client-callable mutation — a client
must never be able to set its own subscription tier directly.

## 21. Analytics — **[fn]**, fire-and-forget

```ts
trackEvent(input: { name: string; properties?: Record<string, string | number | boolean> }): void;
```

A single typed wrapper (`ARCHITECTURE.md` §11); `properties` must never
contain raw health-sensitive values (exact weight, measurements, BodyScan
data) — only categorical/derived values.

## 22. Privacy / Data Export / Delete — **[fn]**

```ts
requestDataExport(): { exportId: string; status: 'queued' };
getDataExportStatus(exportId: string): { status: 'queued' | 'processing' | 'ready' | 'failed'; downloadUrl?: string };

requestDeleteBodyScanData(): void;      // deletes all body_scans + images, keeps rest of account
requestAccountDeletion(): { status: 'scheduled'; effectiveAt: string };
cancelAccountDeletion(): void;          // within the grace window, see OPEN_QUESTIONS.md
```

Every call here writes an `audit_logs` row (§ `DATABASE_SCHEMA.md` §15)
independent of its outcome.

---

## Error handling convention

All `[fn]` operations return a discriminated error shape on failure rather
than throwing raw provider errors across the client boundary:

```ts
type ServiceError = {
  code:
    | 'unauthorized'
    | 'validation_failed'
    | 'safety_blocked'
    | 'rate_limited'
    | 'not_found'
    | 'internal_error';
  message: string; // safe to show or adapt for the user
};
```

`safety_blocked` is a distinct code (not folded into `validation_failed`)
because the client must be able to render safety-blocked outcomes with
dedicated, non-generic messaging (`MASTER_SPEC.md` §8.2) rather than a
generic form-error treatment.
