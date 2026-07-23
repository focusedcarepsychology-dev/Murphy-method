# Database Schema

Status: authoritative for this phase. PostgreSQL (Supabase). Derived from
[`MASTER_SPEC.md`](MASTER_SPEC.md) § Data Model and cross-checked against
every domain section of that document. No migration exists yet — this is
the design that `IMPLEMENTATION_PLAN.md` Phase 2 will implement.

## Conventions

- All primary keys are `uuid default gen_random_uuid()` unless noted.
- Every table has `created_at timestamptz not null default now()`. Mutable
  tables also have `updated_at timestamptz not null default now()`
  (maintained by a trigger). Immutable/append-only tables (marked
  **immutable**) omit `updated_at` by design — they are never updated.
  P0/P1/P2 marks below indicate: MVP indicates whether this table is built
  as part of the MVP scope in `MASTER_SPEC.md` §29.
- **Ownership** states which column RLS keys on, and who may read/write.
  Unless stated otherwise, the pattern is: `select`/`insert`/`update`/`delete`
  restricted to rows where `auth.uid() = <owner column>`, using Postgres RLS
  policies. Tables with no direct `user_id` (e.g. child tables of a
  user-owned parent) key ownership through a join to the parent, expressed
  as a policy using `EXISTS (...)` against the parent table — noted per
  table.
- Reference/lookup tables (exercises, muscles, movement patterns, goals,
  equipment) are readable by any authenticated user and writable only by a
  service role (content managed by the Murphy Method team, not end users).
- All FKs use `on delete cascade` unless a different behaviour is specified
  (e.g. audit/version tables use `on delete restrict` or nullable FKs to
  preserve history after a referenced row's lifecycle ends).

---

## 1. Identity & Profile

### `profiles` — P0

1:1 extension of `auth.users`.

| Column                     | Type         | Notes                                                                       |
| -------------------------- | ------------ | --------------------------------------------------------------------------- |
| `id`                       | uuid, PK     | `references auth.users(id) on delete cascade`                               |
| `display_name`             | text         | nullable                                                                    |
| `date_of_birth`            | date         | required for physiological calculations                                     |
| `biological_sex`           | text         | constrained enum; see `OPEN_QUESTIONS.md` for exact field framing           |
| `height_cm`                | numeric(5,1) | stored canonically in metric; unit preference is a display concern          |
| `unit_preference`          | text         | `metric` \| `imperial`                                                      |
| `training_experience`      | text         | `beginner` \| `recreational` \| `intermediate`                              |
| `coaching_style`           | text         | `supportive` \| `direct` \| `analytical` \| `competitive` \| `calm_minimal` |
| `onboarding_completed_at`  | timestamptz  | null until onboarding finishes                                              |
| `timezone`                 | text         | IANA tz name                                                                |
| `created_at`, `updated_at` | timestamptz  |                                                                             |

**Indexes:** PK only (1:1, no additional lookup pattern).
**Ownership:** `id = auth.uid()`.
**Retention:** deleted on account deletion (cascades from `auth.users`); see
Privacy in `MASTER_SPEC.md` §25.
**Data minimisation:** every field above is collected for a specific,
named purpose, not because conventional fitness apps typically collect it:
`date_of_birth` — required for 18+ eligibility (`MASTER_SPEC.md` §3) and
age-relevant physiological calculations; `biological_sex` — reserved only
because specific physiological calculations genuinely benefit from it, with
the exact field shape still an open product/clinical decision, not assumed
here (`OPEN_QUESTIONS.md` #1); `height_cm`/`weight` (via
`body_measurements`) — required for programme/load estimation. No other
demographic field (e.g. ethnicity, income, relationship status) is
collected — this phase does not add a field to `profiles` without a stated
product, safety, or legal purpose tied to it.

### `consent_records` — P0

**Immutable** (append-only; a withdrawn consent is a new row, not an
update).

| Column         | Type                     | Notes                                                                                     |
| -------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `id`           | uuid, PK                 |                                                                                           |
| `profile_id`   | uuid, FK → `profiles.id` |                                                                                           |
| `consent_type` | text                     | `bodyscan_capture` \| `bodyscan_ai_processing` \| `data_processing` \| `marketing` \| ... |
| `granted`      | boolean                  | `true` = granted, `false` = withdrawn                                                     |
| `version`      | text                     | version of the consent copy shown                                                         |
| `created_at`   | timestamptz              |                                                                                           |

**Indexes:** `(profile_id, consent_type, created_at desc)`.
**Ownership:** `profile_id = auth.uid()`, insert-only from client (no
update/delete grants).
**Retention:** kept indefinitely as a legal/audit record even after account
deletion is requested, subject to the deletion flow finalised in
`OPEN_QUESTIONS.md`.

---

## 2. Goals

### `goals` — P0 (reference table)

Canonical list of primary goal types (`MASTER_SPEC.md` §7).

| Column        | Type         | Notes                                                                                                                                   |
| ------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | uuid, PK     |                                                                                                                                         |
| `key`         | text, unique | e.g. `build_muscle`, `improve_strength`, `lose_fat`, `recomposition`, `improve_fitness`, `improve_mobility`, `consistency`, `body_area` |
| `label`       | text         | display copy                                                                                                                            |
| `description` | text         |                                                                                                                                         |

**Ownership:** reference table, read-only to authenticated users.

### `user_goals` — P0

| Column                     | Type                     | Notes                                                                                   |
| -------------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `id`                       | uuid, PK                 |                                                                                         |
| `profile_id`               | uuid, FK → `profiles.id` |                                                                                         |
| `goal_id`                  | uuid, FK → `goals.id`    |                                                                                         |
| `priority`                 | smallint                 | 1 = highest; unique per `(profile_id)` — enforces a strict ranking, `MASTER_SPEC.md` §7 |
| `active`                   | boolean                  | default `true`; superseded goals are deactivated, not deleted                           |
| `created_at`, `updated_at` | timestamptz              |                                                                                         |

**Constraints:** `unique (profile_id, priority) where active`.
**Indexes:** `(profile_id, active, priority)`.
**Ownership:** `profile_id = auth.uid()`.

### `body_area_goals` — P0

Interactive Body Goal Map selections (`MASTER_SPEC.md` §7.1), each mapped to
one or more muscles via `body_area_muscle_map` (below).

| Column                     | Type                     | Notes                                                                                                                        |
| -------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `id`                       | uuid, PK                 |                                                                                                                              |
| `profile_id`               | uuid, FK → `profiles.id` |                                                                                                                              |
| `body_area_key`            | text                     | e.g. `shoulders`, `chest`, `waist_appearance`, `glutes`, ... — constrained to the fixed region list in `MASTER_SPEC.md` §7.1 |
| `priority`                 | smallint                 | nullable; ranking among body-area goals                                                                                      |
| `active`                   | boolean                  | default `true`                                                                                                               |
| `created_at`, `updated_at` | timestamptz              |                                                                                                                              |

**Indexes:** `(profile_id, active)`.
**Ownership:** `profile_id = auth.uid()`.

### `body_area_muscle_map` — P0 (reference table)

Structured mapping from a user-facing body area to the underlying muscles —
kept as data, not code, so the ontology can be refined without a deploy.

| Column          | Type                    | Notes                                                                                              |
| --------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `id`            | uuid, PK                |                                                                                                    |
| `body_area_key` | text                    |                                                                                                    |
| `muscle_id`     | uuid, FK → `muscles.id` |                                                                                                    |
| `weight`        | numeric(3,2)            | relative contribution, e.g. lateral deltoid weighted higher than posterior deltoid for "shoulders" |

**Ownership:** reference table, read-only.

---

## 3. Equipment

### `equipment` — P0 (reference table)

| Column     | Type         | Notes                                                                                                |
| ---------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `id`       | uuid, PK     |                                                                                                      |
| `key`      | text, unique | e.g. `barbell`, `dumbbell`, `cable_machine`, `bodyweight`, `resistance_band`, `bench`, `pull_up_bar` |
| `label`    | text         |                                                                                                      |
| `category` | text         | `free_weight` \| `machine` \| `bodyweight` \| `accessory`                                            |

**Ownership:** reference table, read-only.

### `user_equipment` — P0

| Column                     | Type                      | Notes                                                                                                                                    |
| -------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                       | uuid, PK                  |                                                                                                                                          |
| `profile_id`               | uuid, FK → `profiles.id`  |                                                                                                                                          |
| `equipment_id`             | uuid, FK → `equipment.id` |                                                                                                                                          |
| `available`                | boolean                   | default `true` — supports temporarily marking equipment unavailable (gym change, travel; `MASTER_SPEC.md` §38) without losing the record |
| `created_at`, `updated_at` | timestamptz               |                                                                                                                                          |

**Constraints:** `unique (profile_id, equipment_id)`.
**Ownership:** `profile_id = auth.uid()`.

---

## 4. Safety

### `health_screenings` — P0

Immutable per submission — a re-screen creates a new row so history is
preserved for audit (`MASTER_SPEC.md` §8.1, §24).

| Column               | Type                     | Notes                                                                                                   |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `id`                 | uuid, PK                 |                                                                                                         |
| `profile_id`         | uuid, FK → `profiles.id` |                                                                                                         |
| `responses`          | jsonb                    | structured screening question/answer set — schema versioned via `screening_version`                     |
| `screening_version`  | text                     | so historic responses remain interpretable as the questionnaire evolves                                 |
| `requires_clearance` | boolean                  | derived flag: true if deterministic rules require professional clearance before certain content unlocks |
| `restriction_flags`  | text[]                   | derived list of restriction codes feeding exercise eligibility (Layer 1)                                |
| `created_at`         | timestamptz              |                                                                                                         |

**Indexes:** `(profile_id, created_at desc)`.
**Ownership:** `profile_id = auth.uid()`, insert-only from client; the
derived flags are written by the Edge Function that processes the
submission, not directly by the client.
**Retention:** kept for the life of the account; contributes to audit trail
for safety-relevant programme decisions.

---

## 5. Exercise Ontology (reference data, P0)

All tables in this section are reference data: readable by any
authenticated user, writable only by a service role/content pipeline (not
end users). This is the structured foundation `MASTER_SPEC.md` §9 requires —
substitution and eligibility logic reads this data; an LLM never
improvises it.

### `muscles`

| Column         | Type         | Notes                                                                         |
| -------------- | ------------ | ----------------------------------------------------------------------------- |
| `id`           | uuid, PK     |                                                                               |
| `key`          | text, unique | e.g. `anterior_deltoid`, `lateral_deltoid`, `lat`, `upper_back`, `quadriceps` |
| `label`        | text         |                                                                               |
| `muscle_group` | text         | coarser grouping for display, e.g. `shoulders`                                |

### `movement_patterns`

| Column  | Type         | Notes                                                                                                                                                                                                                                                                                                                                    |
| ------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`    | uuid, PK     |                                                                                                                                                                                                                                                                                                                                          |
| `key`   | text, unique | one of the fixed set in `MASTER_SPEC.md` §9: `horizontal_push`, `vertical_push`, `horizontal_pull`, `vertical_pull`, `squat`, `hip_hinge`, `lunge_single_leg`, `knee_flexion`, `hip_extension`, `hip_abduction`, `elbow_flexion`, `elbow_extension`, `calf`, `core_anti_extension`, `core_anti_rotation`, `loaded_carry`, `conditioning` |
| `label` | text         |                                                                                                                                                                                                                                                                                                                                          |

### `exercises`

| Column                              | Type                              | Notes                                                                                                                                                                                                                 |
| ----------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | uuid, PK                          |                                                                                                                                                                                                                       |
| `name`                              | text                              |                                                                                                                                                                                                                       |
| `slug`                              | text, unique                      |                                                                                                                                                                                                                       |
| `aliases`                           | text[]                            | alternate names the same exercise is commonly known by (e.g. equipment-brand or regional naming), used for search/import matching, never for eligibility logic                                                        |
| `description`                       | text                              |                                                                                                                                                                                                                       |
| `movement_pattern_id`               | uuid, FK → `movement_patterns.id` |                                                                                                                                                                                                                       |
| `skill_requirement`                 | text                              | `low` \| `moderate` \| `high`                                                                                                                                                                                         |
| `difficulty`                        | text                              | `beginner` \| `intermediate` \| `advanced`                                                                                                                                                                            |
| `stability_requirement`             | text                              | `low` \| `moderate` \| `high`                                                                                                                                                                                         |
| `loading_potential`                 | text                              | `low` \| `moderate` \| `high` — ceiling on progressive overload                                                                                                                                                       |
| `fatigue_profile`                   | text                              | `low` \| `moderate` \| `high` — systemic fatigue cost                                                                                                                                                                 |
| `recommended_rep_range_low`         | smallint                          |                                                                                                                                                                                                                       |
| `recommended_rep_range_high`        | smallint                          |                                                                                                                                                                                                                       |
| `setup_time_seconds`                | integer                           | approximate                                                                                                                                                                                                           |
| `media_url`                         | text                              | nullable, instructional media reference                                                                                                                                                                               |
| `content_version`                   | text                              | version of this specific row's content (bumped on any material edit), independent of the dataset-wide version below                                                                                                   |
| `dataset_version`                   | text                              | version of the exercise dataset this row was last imported/reviewed as part of — referenced by `programme_versions.exercise_dataset_version` (§18) so a historic decision remains interpretable after content changes |
| `source`                            | text                              | provenance of this row's content, e.g. `internal_authoring` \| `licensed_dataset_import` \| `content_partner`; never a fabricated or unverified literature citation (`CLAUDE.md` — no invented medical evidence)      |
| `review_status`                     | text                              | `draft` \| `reviewed` \| `published`; gates whether the row is eligible for selection (§3.1 adds `review_status = 'published'` as an eligibility condition once Phase 4 content review is live)                       |
| `reviewed_at`                       | timestamptz                       | nullable, set when `review_status` moves to `reviewed`/`published`                                                                                                                                                    |
| `contraindication_metadata_version` | text                              | version of the contraindication/restriction tagging methodology applied to this row's `exercise_restrictions` links — allows re-review to be scoped to rows tagged under an outdated methodology version              |
| `locale_ready`                      | boolean                           | default `false`; whether `name`/`description`/media have been reviewed for localisation — MVP ships English-only content but the column exists so future localisation work is additive, not a schema change           |
| `active`                            | boolean                           | default `true`; retired exercises are deactivated, not deleted, to preserve history referencing them                                                                                                                  |
| `created_at`, `updated_at`          | timestamptz                       |                                                                                                                                                                                                                       |

**Indexes:** `(movement_pattern_id)`, `(active)`, `(review_status)`, GIN on
`name`/`description`/`aliases` for search if needed.

**Content governance:** the exercise ontology is a governed dataset, not
freely user-editable content — writable only by the service role/content
pipeline (§ intro to this section), with the `review_status`/`reviewed_at`/
`source`/`dataset_version` fields existing specifically so seed and later
corrections go through a traceable review process rather than an
unreviewed bulk import. None of these fields need to be exposed to end
users — their purpose is internal traceability and safe maintenance
(`RISKS.md` #12), not a user-facing feature. The actual review process
(who reviews, against what checklist) is a Phase 4 content-authoring
deliverable (`IMPLEMENTATION_PLAN.md` Phase 4), not designed further here;
this schema only ensures the process has somewhere to record its outcome.

### `exercise_muscles`

| Column        | Type                      | Notes                    |
| ------------- | ------------------------- | ------------------------ |
| `id`          | uuid, PK                  |                          |
| `exercise_id` | uuid, FK → `exercises.id` |                          |
| `muscle_id`   | uuid, FK → `muscles.id`   |                          |
| `role`        | text                      | `primary` \| `secondary` |

**Constraints:** `unique (exercise_id, muscle_id)`.
**Indexes:** `(exercise_id)`, `(muscle_id, role)`.

### `exercise_equipment`

| Column         | Type                      | Notes                                                                                |
| -------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `id`           | uuid, PK                  |                                                                                      |
| `exercise_id`  | uuid, FK → `exercises.id` |                                                                                      |
| `equipment_id` | uuid, FK → `equipment.id` |                                                                                      |
| `required`     | boolean                   | `true` if the exercise cannot be performed without it; `false` if optional/enhancing |

**Constraints:** `unique (exercise_id, equipment_id)`.
**Indexes:** `(equipment_id)` — used to filter eligible exercises by a
user's available equipment.

### `exercise_substitutions`

Directed, weighted substitution graph consumed by
[`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md) § Substitution Ranking.

| Column                   | Type                      | Notes                                                                              |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------- |
| `id`                     | uuid, PK                  |                                                                                    |
| `exercise_id`            | uuid, FK → `exercises.id` | the exercise being substituted                                                     |
| `substitute_exercise_id` | uuid, FK → `exercises.id` | the candidate replacement                                                          |
| `similarity_score`       | numeric(3,2)              | 0–1, precomputed goal/muscle/pattern overlap; a static prior, not a live recompute |

**Constraints:** `unique (exercise_id, substitute_exercise_id)`,
`check (exercise_id <> substitute_exercise_id)`.
**Indexes:** `(exercise_id, similarity_score desc)`.

### `exercise_restrictions`

Maps restriction/contraindication codes (produced by `health_screenings` and
by runtime pain reports) to exercises they exclude or modify — the
deterministic Layer 1 data source.

| Column             | Type                      | Notes                                                                                 |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------- |
| `id`               | uuid, PK                  |                                                                                       |
| `exercise_id`      | uuid, FK → `exercises.id` |                                                                                       |
| `restriction_code` | text                      | e.g. `shoulder_impingement`, `lower_back_flexion_sensitive`, `knee_loading_sensitive` |
| `effect`           | text                      | `exclude` \| `modify`                                                                 |
| `notes`            | text                      | nullable, plain-language rationale surfaced by Explainable AI                         |

**Indexes:** `(restriction_code)`.

---

## 6. Programme

### `programmes` — P0

The stable "container" for a user's training programme across versions.

| Column                     | Type                                         | Notes                                  |
| -------------------------- | -------------------------------------------- | -------------------------------------- |
| `id`                       | uuid, PK                                     |                                        |
| `profile_id`               | uuid, FK → `profiles.id`                     |                                        |
| `status`                   | text                                         | `active` \| `paused` \| `archived`     |
| `current_version_id`       | uuid, FK → `programme_versions.id`, nullable | points at the currently active version |
| `created_at`, `updated_at` | timestamptz                                  |                                        |

**Indexes:** `(profile_id, status)`.
**Ownership:** `profile_id = auth.uid()`.

### `programme_versions` — P0, **immutable**

Every Level 2+ change (`MASTER_SPEC.md` §16) creates a new row here rather
than mutating the previous one. This is the auditable core of the product.

| Column                     | Type                                          | Notes                                                                                                                        |
| -------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `id`                       | uuid, PK                                      |                                                                                                                              |
| `programme_id`             | uuid, FK → `programmes.id`                    |                                                                                                                              |
| `previous_version_id`      | uuid, FK → `programme_versions.id`, nullable  | null for the first version                                                                                                   |
| `version_number`           | integer                                       | monotonically increasing per programme                                                                                       |
| `structure`                | jsonb                                         | full denormalised programme structure for this version (split, sessions, exercise prescriptions) — see note below            |
| `change_level`             | smallint                                      | 0–4 per `MASTER_SPEC.md` §16                                                                                                 |
| `change_reason`            | text                                          | plain-language summary, shown on "Why did my programme change?"                                                              |
| `decision_id`              | uuid, FK → `programme_decisions.id`, nullable | links to the decision/evidence record that produced this version, where applicable (null for the initial generation)         |
| `engine_version`           | text                                          | version identifier of the Programme Engine (`PROGRAMME_ENGINE.md`) build that produced this version — see § Versioning below |
| `exercise_dataset_version` | text                                          | version identifier of the exercise ontology dataset (`DATABASE_SCHEMA.md` §5) active when this version was generated         |
| `created_at`               | timestamptz                                   |                                                                                                                              |

**Why `structure` is denormalised jsonb, not fully relational:** a
programme version must be reconstructable exactly as it was shown to the
user at that point in time, independent of later edits to the exercise
library (an exercise being deactivated later must not corrupt history). The
authoritative per-session/per-exercise breakdown for the _current_ version
is also materialised relationally in `training_blocks` /
`workout_exercises` (via generated workouts) for query efficiency; `structure`
remains the immutable source of truth for audit and rollback.

**Constraints:** `unique (programme_id, version_number)`.
**Indexes:** `(programme_id, version_number desc)`.
**Ownership:** via `programmes.profile_id = auth.uid()`.
**Retention:** never deleted while the account exists; this is the audit
trail required by `MASTER_SPEC.md` §16 and the "Programme reversions"
safety metric in §31.1.

### `training_blocks` — P0

A scheduling unit within a programme version (e.g. a 4-week block), used for
periodisation and stability-window tracking
([`PROGRAMME_ENGINE.md`](PROGRAMME_ENGINE.md)).

| Column                 | Type                               | Notes                                          |
| ---------------------- | ---------------------------------- | ---------------------------------------------- |
| `id`                   | uuid, PK                           |                                                |
| `programme_version_id` | uuid, FK → `programme_versions.id` |                                                |
| `block_number`         | smallint                           |                                                |
| `starts_on`            | date                               |                                                |
| `ends_on`              | date                               | nullable — open-ended until closed             |
| `focus_summary`        | text                               | plain-language summary of the block's emphasis |
| `created_at`           | timestamptz                        |                                                |

**Indexes:** `(programme_version_id, block_number)`.
**Ownership:** via `programme_versions → programmes.profile_id = auth.uid()`.

### `programme_decisions` — P0, **immutable**

One row per adaptation decision the system makes (or the user explicitly
requests), independent of whether it resulted in a new `programme_versions`
row (a Level 0/1 decision may still be logged for the Coach's "why" answers,
but only Level 2+ decisions attach a version).

| Column                          | Type                     | Notes                                                                                                                                                                                                          |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | uuid, PK                 |                                                                                                                                                                                                                |
| `profile_id`                    | uuid, FK → `profiles.id` |                                                                                                                                                                                                                |
| `change_level`                  | smallint                 | 0–4                                                                                                                                                                                                            |
| `decision_type`                 | text                     | e.g. `load_progression`, `exercise_substitution`, `deload`, `programme_restructure`, `user_requested_change`                                                                                                   |
| `summary`                       | text                     | user-facing explanation (Explainable AI, `MASTER_SPEC.md` §21.2)                                                                                                                                               |
| `confidence`                    | numeric(3,2)             | nullable — from the Evidence & Confidence Engine, where applicable                                                                                                                                             |
| `triggered_by`                  | text                     | `system` \| `user`                                                                                                                                                                                             |
| `outcome`                       | text                     | `applied` \| `abstained` — see § Abstention below; `abstained` decisions are still logged with `change_level = 0` and a `summary` explaining what evidence was missing/conflicting                             |
| `engine_version`                | text                     | Programme Engine version (Layer 2) that evaluated this decision                                                                                                                                                |
| `safety_rules_version`          | text                     | Layer 1 deterministic safety rules version in effect                                                                                                                                                           |
| `personalisation_rules_version` | text                     | nullable — Layer 3 Personalisation Engine rules version, where the decision drew on `personal_response_models`                                                                                                 |
| `evidence_engine_version`       | text                     | nullable — Layer 4 Evidence & Confidence Engine version, where a threshold determination was made                                                                                                              |
| `llm_model_version`             | text                     | nullable — provider/model identifier, only set where an LLM materially contributed to the user-facing explanation (Layer 6 rephrasing per `AI_ARCHITECTURE.md` §2.6), never for the underlying decision itself |
| `created_at`                    | timestamptz              |                                                                                                                                                                                                                |

**Indexes:** `(profile_id, created_at desc)`.
**Ownership:** `profile_id = auth.uid()`, insert-only.

### `decision_evidence` — P0, **immutable**

Line items of evidence supporting a `programme_decisions` row — the
concrete implementation of `MASTER_SPEC.md` §15's requirement to store
evidence behind significant decisions.

| Column          | Type                                | Notes                                                                                                                    |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`            | uuid, PK                            |                                                                                                                          |
| `decision_id`   | uuid, FK → `programme_decisions.id` |                                                                                                                          |
| `evidence_type` | text                                | e.g. `exercise_feedback`, `workout_feedback`, `pain_report`, `adherence_pattern`, `performance_trend`, `readiness_trend` |
| `source_table`  | text                                | the table the evidence row came from, for traceability                                                                   |
| `source_id`     | uuid                                | nullable, the specific row referenced where applicable                                                                   |
| `weight`        | numeric(3,2)                        | contribution to the decision                                                                                             |
| `created_at`    | timestamptz                         |                                                                                                                          |

**Indexes:** `(decision_id)`.
**Ownership:** via `programme_decisions.profile_id = auth.uid()`.

---

## 7. Workouts

### `workouts` — P0

One row per planned/generated session instance (not the same as a
`programme_versions` prescription — this is a concrete, dated occurrence a
user does or skips).

| Column                       | Type                                         | Notes                                                                                                            |
| ---------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`                         | uuid, PK                                     |                                                                                                                  |
| `profile_id`                 | uuid, FK → `profiles.id`                     |                                                                                                                  |
| `programme_version_id`       | uuid, FK → `programme_versions.id`, nullable | null for an ad-hoc/Quick workout not tied to the current plan                                                    |
| `training_block_id`          | uuid, FK → `training_blocks.id`, nullable    |                                                                                                                  |
| `mode`                       | text                                         | `full` \| `quick` \| `minimum`                                                                                   |
| `status`                     | text                                         | `planned` \| `in_progress` \| `completed` \| `skipped`                                                           |
| `scheduled_for`              | date                                         | nullable                                                                                                         |
| `started_at`                 | timestamptz                                  | nullable                                                                                                         |
| `completed_at`               | timestamptz                                  | nullable                                                                                                         |
| `estimated_duration_minutes` | integer                                      |                                                                                                                  |
| `client_generated_id`        | uuid, unique                                 | set by the client at workout-start time; the idempotency key that makes offline sync safe (`ARCHITECTURE.md` §5) |
| `created_at`, `updated_at`   | timestamptz                                  |                                                                                                                  |

**Indexes:** `(profile_id, scheduled_for)`, `(profile_id, status)`,
unique on `client_generated_id`.
**Ownership:** `profile_id = auth.uid()`.

### `workout_exercises` — P0

The prescribed (and, once performed, actual) exercises within a workout.

| Column                         | Type                                | Notes                                                               |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| `id`                           | uuid, PK                            |                                                                     |
| `workout_id`                   | uuid, FK → `workouts.id`            |                                                                     |
| `exercise_id`                  | uuid, FK → `exercises.id`           |                                                                     |
| `order_index`                  | smallint                            | position within the workout                                         |
| `target_sets`                  | smallint                            |                                                                     |
| `target_rep_range_low`         | smallint                            |                                                                     |
| `target_rep_range_high`        | smallint                            |                                                                     |
| `suggested_load_kg`            | numeric(6,2)                        | nullable                                                            |
| `substituted_from_exercise_id` | uuid, FK → `exercises.id`, nullable | set when this row is the result of a substitution, for traceability |
| `client_generated_id`          | uuid, unique                        | offline idempotency key                                             |
| `created_at`, `updated_at`     | timestamptz                         |                                                                     |

**Indexes:** `(workout_id, order_index)`.
**Ownership:** via `workouts.profile_id = auth.uid()`.

### `set_logs` — P0

| Column                | Type                              | Notes                                              |
| --------------------- | --------------------------------- | -------------------------------------------------- |
| `id`                  | uuid, PK                          |                                                    |
| `workout_exercise_id` | uuid, FK → `workout_exercises.id` |                                                    |
| `set_number`          | smallint                          |                                                    |
| `weight_kg`           | numeric(6,2)                      | nullable (bodyweight exercises)                    |
| `reps`                | smallint                          |                                                    |
| `effort_response`     | smallint                          | nullable, 0–3+ mapped scale (`MASTER_SPEC.md` §12) |
| `completed_at`        | timestamptz                       |                                                    |
| `client_generated_id` | uuid, unique                      | offline idempotency key                            |
| `created_at`          | timestamptz                       |                                                    |

**Indexes:** `(workout_exercise_id, set_number)`.
**Ownership:** via `workout_exercises → workouts.profile_id = auth.uid()`.
**Offline note:** this is the highest-write-volume table during a workout;
the idempotent `client_generated_id` is what makes the sync queue in
`ARCHITECTURE.md` §5 safe to retry.

---

## 8. Feedback & Safety Events

### `exercise_feedback` — P0

| Column                | Type                              | Notes                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | uuid, PK                          |                                                                                                                                                                                                                                                                                                                                                |
| `workout_exercise_id` | uuid, FK → `workout_exercises.id` |                                                                                                                                                                                                                                                                                                                                                |
| `enjoyment`           | smallint                          | nullable, 1–5                                                                                                                                                                                                                                                                                                                                  |
| `difficulty`          | text                              | nullable, `too_easy` \| `appropriate` \| `very_hard` \| `too_hard`                                                                                                                                                                                                                                                                             |
| `signal_type`         | text                              | nullable — one of the five distinct signals in `MASTER_SPEC.md` §13.1: `dislike` \| `excessive_difficulty` \| `pain` \| `technical_insecurity` \| `boredom`. Populated when the feedback UI captures more than the bare enjoyment/difficulty scale (e.g. via the "what made this hard?" follow-up), so downstream logic never conflates these. |
| `created_at`          | timestamptz                       |                                                                                                                                                                                                                                                                                                                                                |

**Indexes:** `(workout_exercise_id)`.
**Ownership:** via `workout_exercises → workouts.profile_id = auth.uid()`.
**Note:** actual pain reports use the dedicated `pain_reports` table below,
never only this generic feedback row — `signal_type = 'pain'` here is a
cross-reference marker, not a substitute for the structured pain flow.

### `workout_feedback` — P0

| Column               | Type                             | Notes                                   |
| -------------------- | -------------------------------- | --------------------------------------- |
| `id`                 | uuid, PK                         |                                         |
| `workout_id`         | uuid, FK → `workouts.id`, unique | one per workout                         |
| `enjoyment`          | smallint                         | nullable, 1–5                           |
| `overall_difficulty` | smallint                         | nullable, 1–5                           |
| `energy_afterwards`  | text                             | nullable, `better` \| `same` \| `worse` |
| `would_repeat`       | text                             | nullable, `yes` \| `maybe` \| `no`      |
| `created_at`         | timestamptz                      |                                         |

**Ownership:** via `workouts.profile_id = auth.uid()`.

### `pain_reports` — P0, **immutable**

The dedicated pain/discomfort flow (`MASTER_SPEC.md` §8.2). Never merged
into `exercise_feedback`.

| Column                | Type                                        | Notes                                                                                   |
| --------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `id`                  | uuid, PK                                    |                                                                                         |
| `profile_id`          | uuid, FK → `profiles.id`                    |                                                                                         |
| `workout_exercise_id` | uuid, FK → `workout_exercises.id`, nullable | null if reported outside an active workout                                              |
| `exercise_id`         | uuid, FK → `exercises.id`, nullable         |                                                                                         |
| `body_area`           | text                                        |                                                                                         |
| `severity`            | text                                        | `mild` \| `moderate` \| `significant`                                                   |
| `description`         | text                                        | nullable, free text                                                                     |
| `action_taken`        | text                                        | `paused_progression` \| `exercise_modified` \| `exercise_stopped` \| `escalation_shown` |
| `created_at`          | timestamptz                                 |                                                                                         |

**Indexes:** `(profile_id, created_at desc)`.
**Ownership:** `profile_id = auth.uid()`, insert-only.
**Retention:** kept indefinitely — feeds both the safety metrics in
`MASTER_SPEC.md` §31.1 and the deterministic restriction rules over time.

### `readiness_entries` — P1

Daily readiness check-in (`MASTER_SPEC.md` §19.2). Table specified now so
P1 does not require a schema migration touching workout generation, but the
feature itself is P1.

| Column              | Type                     | Notes                                                    |
| ------------------- | ------------------------ | -------------------------------------------------------- |
| `id`                | uuid, PK                 |                                                          |
| `profile_id`        | uuid, FK → `profiles.id` |                                                          |
| `entry_date`        | date                     |                                                          |
| `readiness`         | text                     | `very_low` \| `low` \| `normal` \| `good` \| `excellent` |
| `sleep_quality`     | smallint                 | nullable                                                 |
| `soreness`          | smallint                 | nullable                                                 |
| `available_minutes` | integer                  | nullable                                                 |
| `created_at`        | timestamptz              |                                                          |

**Constraints:** `unique (profile_id, entry_date)`.
**Ownership:** `profile_id = auth.uid()`.

---

## 9. Measurements & Performance

### `body_measurements` — P0

| Column        | Type                     | Notes                                                                      |
| ------------- | ------------------------ | -------------------------------------------------------------------------- |
| `id`          | uuid, PK                 |                                                                            |
| `profile_id`  | uuid, FK → `profiles.id` |                                                                            |
| `measured_on` | date                     |                                                                            |
| `metric`      | text                     | `weight` \| `waist` \| `chest` \| `hips` \| `arm` \| `thigh` \| `calf`     |
| `value`       | numeric(6,2)             | stored canonically in metric units (kg / cm)                               |
| `source`      | text                     | `manual` \| `bodyscan_derived` (reserved for future; MVP is `manual` only) |
| `created_at`  | timestamptz              |                                                                            |

**Indexes:** `(profile_id, metric, measured_on desc)`.
**Ownership:** `profile_id = auth.uid()`.
**Note on conflicting measurements** (`MASTER_SPEC.md` §38): the schema
does not attempt automatic reconciliation — multiple same-day entries for
the same metric are all retained; trend logic in Progress uses the most
recent entry per day and surfaces the raw series rather than silently
discarding data.

### `performance_metrics` — P0

Derived/aggregated performance signal, computed periodically (not on every
set) to support Progress screens without expensive on-demand aggregation.

| Column         | Type                                | Notes                                                 |
| -------------- | ----------------------------------- | ----------------------------------------------------- |
| `id`           | uuid, PK                            |                                                       |
| `profile_id`   | uuid, FK → `profiles.id`            |                                                       |
| `exercise_id`  | uuid, FK → `exercises.id`, nullable | null for whole-body/aggregate metrics                 |
| `metric_type`  | text                                | `estimated_1rm`, `volume_trend`, `work_capacity`, ... |
| `period_start` | date                                |                                                       |
| `period_end`   | date                                |                                                       |
| `value`        | numeric(10,2)                       |                                                       |
| `created_at`   | timestamptz                         |                                                       |

**Indexes:** `(profile_id, exercise_id, metric_type, period_end desc)`.
**Ownership:** `profile_id = auth.uid()`, written by server-side jobs, not
directly by the client.

### `personal_records` — P0

| Column        | Type                               | Notes                                                   |
| ------------- | ---------------------------------- | ------------------------------------------------------- |
| `id`          | uuid, PK                           |                                                         |
| `profile_id`  | uuid, FK → `profiles.id`           |                                                         |
| `exercise_id` | uuid, FK → `exercises.id`          |                                                         |
| `record_type` | text                               | `max_weight` \| `max_reps_at_weight` \| `estimated_1rm` |
| `value`       | numeric(10,2)                      |                                                         |
| `set_log_id`  | uuid, FK → `set_logs.id`, nullable | the set that produced this record, where applicable     |
| `achieved_at` | timestamptz                        |                                                         |
| `created_at`  | timestamptz                        |                                                         |

**Indexes:** `(profile_id, exercise_id, record_type, achieved_at desc)`.
**Ownership:** `profile_id = auth.uid()`.

---

## 10. BodyScan

### `body_scans` — P0

| Column        | Type                     | Notes                          |
| ------------- | ------------------------ | ------------------------------ |
| `id`          | uuid, PK                 |                                |
| `profile_id`  | uuid, FK → `profiles.id` |                                |
| `captured_on` | date                     |                                |
| `purpose`     | text                     | `baseline` \| `progress_check` |
| `created_at`  | timestamptz              |                                |

**Indexes:** `(profile_id, captured_on desc)`.
**Ownership:** `profile_id = auth.uid()`.

### `body_scan_images` — P0

| Column             | Type                       | Notes                                                                                                             |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`               | uuid, PK                   |                                                                                                                   |
| `body_scan_id`     | uuid, FK → `body_scans.id` |                                                                                                                   |
| `angle`            | text                       | `front` \| `side` \| `back` \| `angle_45`                                                                         |
| `storage_path`     | text                       | path within the private `bodyscans` bucket; never a public URL                                                    |
| `capture_metadata` | jsonb                      | device model, camera height/distance guidance adherence, lighting estimate, timestamp — future CV-alignment input |
| `created_at`       | timestamptz                |                                                                                                                   |

**Indexes:** `(body_scan_id, angle)`.
**Ownership:** via `body_scans.profile_id = auth.uid()`. Storage bucket
policy independently scopes the underlying object to the same owner
(`ARCHITECTURE.md` §9).
**Retention:** deleted immediately (row + storage object) on user-initiated
scan deletion; deleted on account deletion.

### `scan_quality` — P1 (table reserved from P0 schema; not populated until P1)

Reserved now so P1 computer-vision quality scoring does not require a
migration touching `body_scans`/`body_scan_images` (`ARCHITECTURE.md` §9).

| Column               | Type                             | Notes                                                              |
| -------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `id`                 | uuid, PK                         |                                                                    |
| `body_scan_image_id` | uuid, FK → `body_scan_images.id` |                                                                    |
| `reliability`        | text                             | `high` \| `moderate` \| `low`                                      |
| `factors`            | jsonb                            | contributing factor breakdown (alignment, lighting, pose, framing) |
| `created_at`         | timestamptz                      |                                                                    |

**Ownership:** via `body_scan_images → body_scans.profile_id = auth.uid()`.

---

## 11. Personal Response Model

### `personal_response_models` — P0

One row per (profile, attribute) — an inferred attribute with its evidence
metadata, per `MASTER_SPEC.md` §14.

| Column                          | Type                     | Notes                                                                                                                |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `id`                            | uuid, PK                 |                                                                                                                      |
| `profile_id`                    | uuid, FK → `profiles.id` |                                                                                                                      |
| `domain`                        | text                     | `physical` \| `training` \| `preference` \| `behavioural` \| `motivation`                                            |
| `attribute_key`                 | text                     | e.g. `volume_tolerance_upper_body`, `preferred_session_length`, `notification_responsiveness`                        |
| `estimate`                      | jsonb                    | shape depends on `attribute_key` (scalar, category, or distribution)                                                 |
| `confidence`                    | numeric(3,2)             | 0–1                                                                                                                  |
| `evidence_count`                | integer                  |                                                                                                                      |
| `personalisation_rules_version` | text                     | version of the Layer 3 Personalisation Engine aggregation rules that produced this estimate — see § Versioning below |
| `last_updated_at`               | timestamptz              |                                                                                                                      |
| `created_at`                    | timestamptz              |                                                                                                                      |

**Constraints:** `unique (profile_id, attribute_key)`.
**Indexes:** `(profile_id, domain)`.
**Ownership:** `profile_id = auth.uid()`, read-only to the client — written
only by server-side Personalisation Engine jobs
([`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md)).

### `preference_signals` — P0, **immutable**

Raw preference-relevant events, the evidentiary input the Personalisation
Engine aggregates into `personal_response_models` rows. Kept as a
distinct, append-only log so confidence/evidence-count computations are
always re-derivable and auditable.

| Column         | Type                     | Notes                                                                                            |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------ |
| `id`           | uuid, PK                 |                                                                                                  |
| `profile_id`   | uuid, FK → `profiles.id` |                                                                                                  |
| `signal_type`  | text                     | e.g. `exercise_enjoyment`, `exercise_dislike`, `session_length_preference`, `schedule_adherence` |
| `subject_id`   | uuid                     | nullable, e.g. an `exercise_id` when the signal is exercise-specific                             |
| `value`        | jsonb                    |                                                                                                  |
| `source_table` | text                     | traceability back to the originating feedback/log row                                            |
| `source_id`    | uuid                     | nullable                                                                                         |
| `created_at`   | timestamptz              |                                                                                                  |

**Indexes:** `(profile_id, signal_type, created_at desc)`.
**Ownership:** `profile_id = auth.uid()`.

### `motivation_profiles` — P1 (table reserved from P0 schema)

| Column                               | Type                             | Notes    |
| ------------------------------------ | -------------------------------- | -------- |
| `id`                                 | uuid, PK                         |          |
| `profile_id`                         | uuid, FK → `profiles.id`, unique |          |
| `numerical_target_responsiveness`    | numeric(3,2)                     | nullable |
| `encouragement_responsiveness`       | numeric(3,2)                     | nullable |
| `pr_responsiveness`                  | numeric(3,2)                     | nullable |
| `time_minimisation_responsiveness`   | numeric(3,2)                     | nullable |
| `competitive_framing_responsiveness` | numeric(3,2)                     | nullable |
| `preferred_notification_time`        | time                             | nullable |
| `streak_pressure_averse`             | boolean                          | nullable |
| `notification_fatigue_score`         | numeric(3,2)                     | nullable |
| `updated_at`                         | timestamptz                      |          |

**Ownership:** `profile_id = auth.uid()`, read-only to the client.

---

## 12. Coach

### `coach_threads` — P0

| Column                     | Type                     | Notes |
| -------------------------- | ------------------------ | ----- |
| `id`                       | uuid, PK                 |       |
| `profile_id`               | uuid, FK → `profiles.id` |       |
| `created_at`, `updated_at` | timestamptz              |       |

**Ownership:** `profile_id = auth.uid()`.

### `coach_messages` — P0

| Column                        | Type                          | Notes                                                                                                                                                                              |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                          | uuid, PK                      |                                                                                                                                                                                    |
| `thread_id`                   | uuid, FK → `coach_threads.id` |                                                                                                                                                                                    |
| `role`                        | text                          | `user` \| `assistant` \| `system_context`                                                                                                                                          |
| `content`                     | text                          |                                                                                                                                                                                    |
| `structured_context_snapshot` | jsonb                         | nullable — the structured application-data context assembled for this reply, kept for auditability of what the LLM was actually given (`MASTER_SPEC.md` §20, `AI_ARCHITECTURE.md`) |
| `model_version`               | text                          | nullable — provider/model identifier for `role = 'assistant'` rows, e.g. `claude-sonnet-5`; null for `user`/`system_context` rows                                                  |
| `created_at`                  | timestamptz                   |                                                                                                                                                                                    |

**Indexes:** `(thread_id, created_at)`.
**Ownership:** via `coach_threads.profile_id = auth.uid()`.
**Note:** chat content is never treated as source of truth for user state
(`MASTER_SPEC.md` §20) — this table is conversational history only; all
state used to answer a coach message is read live from the structured
tables above.

---

## 13. Notifications

### `notifications` — P0

| Column              | Type                     | Notes                                                                       |
| ------------------- | ------------------------ | --------------------------------------------------------------------------- |
| `id`                | uuid, PK                 |                                                                             |
| `profile_id`        | uuid, FK → `profiles.id` |                                                                             |
| `notification_type` | text                     | `workout_reminder` \| `missed_start` \| `progress` \| `bodyscan_due` \| ... |
| `payload`           | jsonb                    | rendered content + any deep-link target                                     |
| `scheduled_for`     | timestamptz              |                                                                             |
| `sent_at`           | timestamptz              | nullable                                                                    |
| `created_at`        | timestamptz              |                                                                             |

**Indexes:** `(profile_id, scheduled_for)`.
**Ownership:** `profile_id = auth.uid()`, read-only to the client; written
by server-side scheduling jobs.

### `notification_responses` — P0

| Column            | Type                          | Notes                                                                                 |
| ----------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `id`              | uuid, PK                      |                                                                                       |
| `notification_id` | uuid, FK → `notifications.id` |                                                                                       |
| `response_type`   | text                          | `opened` \| `started_workout` \| `quick` \| `rescheduled` \| `skipped` \| `dismissed` |
| `responded_at`    | timestamptz                   |                                                                                       |

**Indexes:** `(notification_id)`.
**Ownership:** via `notifications.profile_id = auth.uid()`.
**Note:** this is the measured input to Motivational Experimentation
(`MASTER_SPEC.md` §20.3, P1) and the base notification-fatigue signal used
in P0.

---

## 14. Subscriptions

### `subscriptions` — P0 (schema present; billing integration itself may land later per `IMPLEMENTATION_PLAN.md`)

| Column                     | Type                             | Notes                                               |
| -------------------------- | -------------------------------- | --------------------------------------------------- |
| `id`                       | uuid, PK                         |                                                     |
| `profile_id`               | uuid, FK → `profiles.id`, unique |                                                     |
| `tier`                     | text                             | `free` \| `premium` \| `premium_plus`               |
| `status`                   | text                             | `active` \| `trialing` \| `past_due` \| `cancelled` |
| `provider`                 | text                             | e.g. `app_store`, `play_store`, `stripe`            |
| `provider_reference`       | text                             | nullable, external subscription ID                  |
| `current_period_end`       | timestamptz                      | nullable                                            |
| `created_at`, `updated_at` | timestamptz                      |                                                     |

**Ownership:** `profile_id = auth.uid()`, read-only to the client; written
by a server-side webhook handler.

---

## 15. Audit

### `audit_logs` — P0, **immutable**

General-purpose audit trail for privileged/sensitive operations not already
covered by a dedicated immutable table above (e.g. consent changes,
account-level actions, data export/delete requests).

| Column       | Type                               | Notes                                                                       |
| ------------ | ---------------------------------- | --------------------------------------------------------------------------- |
| `id`         | uuid, PK                           |                                                                             |
| `profile_id` | uuid, FK → `profiles.id`, nullable | nullable to allow system-level events                                       |
| `event_type` | text                               | e.g. `data_export_requested`, `account_deletion_requested`, `role_elevated` |
| `actor`      | text                               | `user` \| `system` \| `admin`                                               |
| `metadata`   | jsonb                              |                                                                             |
| `created_at` | timestamptz                        |                                                                             |

**Indexes:** `(profile_id, created_at desc)`, `(event_type, created_at desc)`.
**Ownership:** `profile_id = auth.uid()` for `select`; insert-only, no
client update/delete grants; full-table access reserved to service role for
support/compliance.
**Retention:** retained per the account's lifecycle; export/delete request
events specifically are retained even after the account itself is deleted,
as the compliance record that the request was honoured.

---

## 16. RLS Policy Pattern (reference)

Every user-owned table above follows this shape (illustrative, exact SQL
written at Phase 2):

```sql
alter table set_logs enable row level security;

create policy "select own set_logs"
  on set_logs for select
  using (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id
        and w.profile_id = auth.uid()
    )
  );
-- insert/update/delete policies mirror the select policy's ownership check
```

Reference tables (`exercises`, `muscles`, `movement_patterns`, `equipment`,
`goals`, `exercise_*`, `body_area_muscle_map`) use a simpler policy: `select`
allowed for any authenticated role, all writes reserved to the service
role.

Immutable tables additionally omit `update`/`delete` grants entirely for the
authenticated client role, so the "insert-only" property is enforced by
Postgres grants, not just application discipline.

## 17. P0 vs. later scope summary

| Table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Scope                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles`, `consent_records`, `goals`, `user_goals`, `body_area_goals`, `body_area_muscle_map`, `equipment`, `user_equipment`, `health_screenings`, `muscles`, `movement_patterns`, `exercises`, `exercise_muscles`, `exercise_equipment`, `exercise_substitutions`, `exercise_restrictions`, `programmes`, `programme_versions`, `training_blocks`, `programme_decisions`, `decision_evidence`, `workouts`, `workout_exercises`, `set_logs`, `exercise_feedback`, `workout_feedback`, `pain_reports`, `body_measurements`, `performance_metrics`, `personal_records`, `body_scans`, `body_scan_images`, `personal_response_models`, `preference_signals`, `coach_threads`, `coach_messages`, `notifications`, `notification_responses`, `subscriptions`, `audit_logs` | **P0**                                                                                                                                                                         |
| `readiness_entries`, `scan_quality`, `motivation_profiles`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **P1** — schema reserved now per `ARCHITECTURE.md` §9 and `MASTER_SPEC.md` §29.2 so later work does not require a breaking migration, but not populated/used until their phase |

No P2/Research-scope tables are specified in this phase; when that work is
scheduled (`DEFERRED.md`), it is expected to add tables rather than change
the shape of the ones above.

## 18. Versioning of decision systems

Per `CLAUDE.md`'s "significant programme changes must be auditable"
requirement, the system must be able to answer **"what rules and data
produced this recommendation at that time?"** for any significant decision
— not just what the decision was. `programme_decisions` and
`personal_response_models` (§6, §11 above) carry version identifiers for
every engine/dataset that materially contributed:

- `engine_version` — Programme Engine (Layer 2) build version.
- `safety_rules_version` — Layer 1 deterministic safety rules version.
- `exercise_dataset_version` — exercise ontology content version (§5,
  `exercises.dataset_version`), so a decision remains interpretable even
  after exercise content is later corrected or re-tagged.
- `personalisation_rules_version` — Layer 3 Personalisation Engine
  aggregation rules version.
- `evidence_engine_version` — Layer 4 Evidence & Confidence Engine version.
- `llm_model_version` — provider/model identifier, set only where an LLM
  materially contributed to the user-facing explanation text (Layer 6
  rephrasing), never for the underlying decision logic itself, per
  `AI_ARCHITECTURE.md` §8 ("the LLM may only smooth phrasing, never
  originate the justification").

These are simple text identifiers (e.g. a semver string or a content-hash
short ID), not a versioning _system_ to build now — the requirement this
phase resolves is that the **columns exist and are populated at write
time**, so a later audit or support investigation is not reconstructing
"which rules were active on that date" from deploy history. Implementation
of how each version identifier is generated (semver bump, git SHA, content
hash) is an implementation-time decision, recorded in `DECISIONS.md` when
Phase 5/7 build the engines that populate these columns.

## 19. RLS test matrix

`RISKS.md` #5 and `ACCEPTANCE_CRITERIA.md` #1 require RLS to be verified,
not just declared. Every domain below requires, at minimum, the four test
roles in this matrix (Phase 2 establishes the baseline suite; Phase 11
re-runs it as a full audit per `IMPLEMENTATION_PLAN.md`):

| Role                           | Required assertion                                                                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**                      | Can perform every operation the table's policy allows (`select`, and `insert`/`update`/`delete` where the table isn't immutable/insert-only, §16).                                                                                                                                                |
| **Other authenticated user**   | Cannot `select`, `insert`, `update`, or `delete` any row it does not own — asserted as an explicit negative test per table, not inferred from the owner test passing.                                                                                                                             |
| **Unauthenticated**            | Cannot access any private row at all (no session ⇒ `auth.uid()` is null ⇒ every ownership policy above denies by construction) — asserted directly against the anon key, not assumed.                                                                                                             |
| **Privileged server function** | Can perform the specific privileged operation it needs (service-role key, used only inside Edge Functions) — asserted only where a function genuinely requires it (e.g. writing `personal_response_models`, finalising a BodyScan upload); the client role must never have the equivalent access. |

**Domains requiring this matrix at minimum** (one negative test per role
per table, per `IMPLEMENTATION_PLAN.md` Phase 2's "one negative test per
user-owned table minimum"):

- **Profiles** — `profiles`, `consent_records`.
- **Goals** — `user_goals`, `body_area_goals`.
- **Health/safety data** — `health_screenings`, `pain_reports`,
  `exercise_restrictions` (reference-table read path only).
- **Workouts** — `workouts`, `workout_exercises`, `set_logs`.
- **Feedback** — `exercise_feedback`, `workout_feedback`.
- **Measurements** — `body_measurements`, `performance_metrics`,
  `personal_records`.
- **Personal Response Model** — `personal_response_models`,
  `preference_signals`.
- **Coach history** — `coach_threads`, `coach_messages`.
- **BodyScans** — `body_scans`, `body_scan_images`, **plus the underlying
  Storage objects** — object-level access (not just the row) must be
  tested directly: an authenticated other-user request for another user's
  `storage_path`, and an unauthenticated request for the same path, must
  both be denied, mirroring `ACCEPTANCE_CRITERIA.md` #2. Storage-object
  paths are namespaced by owner and by random `scan_id`/`image_id` (not a
  guessable sequential ID), so enumeration does not reduce to guessing
  short integers even if the private-bucket/signed-URL boundary were
  somehow bypassed — this is defence in depth, not a substitute for the
  access-control test itself.

Reference tables (`exercises`, `muscles`, `movement_patterns`, `equipment`,
`goals`, `exercise_*`, `body_area_muscle_map`) only require the
**unauthenticated cannot read** and **service-role can write** halves of
the matrix — any authenticated user is expected to read them (§16), so an
"other authenticated user" negative-read test does not apply.

## 20. Deletion vs. auditability

`CLAUDE.md` requires significant programme changes to be auditable; GDPR-
style deletion rights require personal data to be removable on request.
These are handled by treating retained data as one of four categories,
each with a different deletion behaviour, rather than applying one deletion
rule to the whole account:

| Category                            | Examples                                                                                                | On deletion request                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personally identifiable content** | `profiles`, `body_measurements`, `personal_records`, `coach_messages` content                           | Deleted outright (cascades from `auth.users` deletion, §1) or, where a linked row must be preserved for a legal/security reason, irreversibly de-identified (the personal payload is scrubbed, a non-identifying placeholder row remains only if something else still references it).                                             |
| **Health/body data**                | `health_screenings`, `pain_reports`, `body_scans`/`body_scan_images` (row + storage object)             | Deleted outright, including the underlying storage object — no de-identified retention, since there is no operational/legal reason to keep sensitive body data past a deletion request (§10 `body_scan_images` "deleted immediately... on account deletion").                                                                     |
| **Operational audit records**       | `programme_versions`, `programme_decisions`, `decision_evidence`, `audit_logs`                          | Retained, but with any directly identifying fields already minimal by design (these tables store decision structure/evidence references and IDs, not free-text personal content) — kept as the auditable history `CLAUDE.md` requires, scoped to what's operationally justified, not the account owner's personal content itself. |
| **Legal/security records**          | `consent_records`, the `account_deletion_requested`/`data_export_requested` rows in `audit_logs` itself | Retained as the compliance record that consent was given/withdrawn and that the deletion/export request was made and honoured — this is the minimum legally/operationally justified exception to "delete everything," not a loophole for retaining unrelated personal data.                                                       |

This is an architectural strategy, not a specific retention-period
commitment — **exact retention durations are a legal-review question**
(`OPEN_QUESTIONS.md` #4, #6), not asserted here. What this phase does
commit to: deletion always removes or de-identifies the personal
payload categories above; it never silently also deletes the operational
audit trail (which would violate `CLAUDE.md`'s auditability requirement)
and never silently retains health/body data past a deletion request
(which would violate the privacy requirement). `ACCEPTANCE_CRITERIA.md` #5
requires both halves to be verified by the same automated post-deletion
sweep.
