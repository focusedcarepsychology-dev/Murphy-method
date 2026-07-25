# Murphy Method remediation traceability report

Date: 25 July 2026  
Branch: `agent/murphy-method-complete-remediation`  
Pull request: #19  
Stage 1 validated code head: `48e72227211bd85ab95d52309389687bcb9542e9`

## 1. Purpose

This report records how the two requested change documents, the real-device/APK observations and the independent repository audit were consolidated into one remediation branch.

The governing principle for the work was:

> A signed-in user must never be shown fictional personal data, fabricated progress, fake performance or functionality that appears complete when it is not.

The report also separates completed implementation from items that still require hosted deployment, EAS credentials or physical-device testing.

## 2. Consolidation decision

Three overlapping draft pull requests existed before the remediation branch:

- PR #15 contained the strongest exercise content, owned illustrations and deterministic programme-engine work.
- PR #16 contained the strongest truthful-data foundation, real user-state handling and authenticated-screen remediation.
- PR #17 was a smaller incomplete restart that duplicated part of #15.

PR #19 preserves the safer real-data foundation from #16, integrates the compatible programme, exercise and visual work from #15, and retains only non-duplicative improvements. The branches were not blindly merged because their programme structures, equipment handling and generated database types conflicted.

## 3. Traceability matrix

| Requirement or audit finding                                                    | Implementation                                                                                                                                                                              | Validation                                                                                                                      | Status                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Remove the fictional name “Alex”                                                | Deleted authenticated preview-data use; greeting now reads `profiles.display_name` through `src/services/training/training-repository.ts` and `src/domain/profile/greeting.ts`.             | `src/app/__tests__/new-user-zero-state.test.tsx`; `src/domain/profile/__tests__/greeting.test.ts`; static fictional-data audit. | Complete                                          |
| Add real name entry                                                             | Optional “What should we call you?” field in `src/app/(tabs)/profile/personal-details.tsx`; blank names remain valid and are never replaced with a fictional value.                         | New-user greeting tests and TypeScript checks.                                                                                  | Complete                                          |
| Remove fabricated workouts, percentages, records, weights and programme history | Deleted `src/dev/previewData.ts`; authenticated Today, Plan, Progress, Coach, Profile and workout routes now read owner-scoped repositories and return truthful `null`, `[]` or `0` states. | `src/__tests__/no-fictional-user-data.test.ts`; new-user zero-state tests; ESLint restriction against `@/dev/*`.                | Complete                                          |
| Remove unexplained dashes and misleading placeholders                           | Conditional rendering and truthful empty/error states replace fake values; user-facing roadmap/phase language was removed or replaced with honest unavailable states.                       | Static source audit, lint and route smoke tests.                                                                                | Complete                                          |
| Fix broken mobile wrapping and cramped layouts                                  | Goal-priority controls stack safely; metric cards and exercise/workout target chips wrap; shared cards use shrink-safe text.                                                                | TypeScript, Expo export and component/route tests. Physical-device visual confirmation remains a release gate.                  | Implemented; device confirmation pending          |
| Honour no-equipment/bodyweight selection                                        | Added mutually exclusive bodyweight semantics, an atomic `set_user_equipment` RPC and revoked direct authenticated writes to `user_equipment`.                                              | `supabase/tests/database/14_equipment_semantics.sql`; onboarding equipment tests.                                               | Complete                                          |
| Prevent equipment-only exercises in bodyweight programmes                       | Programme generation applies equipment requirements as a hard filter rather than a preference.                                                                                              | `supabase/tests/database/15_real_programme_engine.sql`; exercise-ontology tests.                                                | Complete                                          |
| Give every exercise a visual and explanation                                    | Added the exercise ontology/content fields, a seeded v1 catalogue, `src/components/ui/exercise-visual.tsx`, shared exercise cards and ontology-backed detail screens.                       | Exercise visual tests, seed verification, TypeScript and Expo export.                                                           | Complete for the seeded v1 catalogue              |
| Provide starting position, instructions, cues and common mistakes               | `src/services/exercises/exercise-repository.ts` loads description, starting position, instructions, coaching cues, mistakes, muscles, equipment and substitutions.                          | `supabase/tests/database/14_exercise_ontology_seed.sql`; programme and workout screen compilation/tests.                        | Complete                                          |
| Explain why an exercise was selected                                            | Deterministic programme structure stores a rationale/`whyIncluded`; Plan and workout teaching layers display it.                                                                            | Programme structure tests and real-programme pgTAP suite.                                                                       | Complete                                          |
| Generate a real personalised programme                                          | Added server-authoritative deterministic programme engine using goals, body areas, experience, equipment, availability, duration and safety restrictions.                                   | `supabase/tests/database/15_real_programme_engine.sql`; parser compatibility tests.                                             | Complete locally; hosted deployment pending       |
| Upgrade old structure-only programmes                                           | Programme repository recognises older structure shapes and calls the upgrade path where needed.                                                                                             | Programme structure/version tests and engine tests.                                                                             | Complete                                          |
| Wire Today and Plan to real programmes                                          | `src/app/(tabs)/today/index.tsx`, Plan index, schedule, workout and exercise routes load real programme versions and exercise content.                                                      | New-user route tests, tab-shell smoke tests and Expo export.                                                                    | Complete                                          |
| Show actual weekly schedule                                                     | `src/app/(tabs)/plan/schedule.tsx` maps real programme sessions to the user’s selected days with real focus and duration.                                                                   | TypeScript, lint, format and Expo export.                                                                                       | Complete                                          |
| Start full, quick and minimum workouts                                          | Added `start_workout_v1` RPC and client repositories; Today and Plan start real sessions in the selected mode.                                                                              | `supabase/tests/database/16_start_workout.sql`; workout repository compilation/tests.                                           | Complete locally; hosted deployment pending       |
| Log sets and complete workouts truthfully                                       | Active workout routes write real `set_logs`, block zero-rep/double submission and complete real workout rows.                                                                               | Existing workout tests, database RLS tests and Expo export.                                                                     | Complete                                          |
| Resume an unfinished workout                                                    | Today and Plan detect an owner-scoped in-progress workout, show Resume and prevent creation of a competing session.                                                                         | Active-workout repository logic, route compilation and database constraints.                                                    | Complete                                          |
| Replace the dead programme-reset action                                         | Added versioned server-authoritative regeneration that preserves history and blocks restructure during an active workout.                                                                   | `supabase/tests/database/17_regenerate_programme.sql`.                                                                          | Complete                                          |
| Add BodyScan capture guidance                                                   | Added consent-led front/side/back capture instructions, centre/body guides, shoulder/hip references and foot-placement markers on pre-capture and stored-image views.                       | BodyScan repository tests, TypeScript and Expo export.                                                                          | Complete within current image-picker architecture |
| Add BodyScan history and comparison                                             | Added owner-scoped timeline, expiring signed image URLs, angle selection, side-by-side comparison and 25/50/75% opacity overlay.                                                            | `src/services/bodyscan/__tests__/bodyscan-repository.test.ts`; database BodyScan/RLS tests.                                     | Complete locally; device confirmation pending     |
| Protect BodyScan privacy                                                        | Existing private bucket model retained; no public URLs; signed URLs are short-lived; privacy screen shows real counts and supports owner-authorised permanent deletion.                     | RLS/BodyScan database tests, secret scan and repository tests.                                                                  | Complete                                          |
| Avoid medical/body-fat claims                                                   | BodyScan copy is limited to positioning and visual progress comparison; no automated diagnosis or body-composition claim is made.                                                           | Manual copy audit and static source guard.                                                                                      | Complete                                          |
| Improve accessibility                                                           | Added accessible labels, large touch targets, screen-reader-hidden decorative illustrations and wrap-safe controls.                                                                         | Component tests, lint and Expo export. Full TalkBack/device assessment remains pending.                                         | Implemented; device confirmation pending          |
| Preserve authentication and routing                                             | Auth provider, route guards, deep-link handling, password recovery, session restoration and sign-out behaviour were retained and regression-tested.                                         | Route-guard tests, splash/configuration tests and tab-shell smoke tests.                                                        | Complete in automated validation                  |
| Prevent demo data from returning                                                | ESLint bans `@/dev/*` imports; static tests reject hard-coded fictional names, performance values, tallies and internal roadmap copy in authenticated source.                               | `src/__tests__/no-fictional-user-data.test.ts`; CI lint/test steps.                                                             | Complete                                          |
| Improve CI diagnosis                                                            | CI records typecheck, lint, format, test, export, secret-scan and database logs as artifacts, including on failure.                                                                         | `.github/workflows/ci.yml`; successful Stage 1 run.                                                                             | Complete                                          |

## 4. Database changes

The branch adds or updates the following permanent migrations:

- `20260724090000_exercise_content_fields.sql`
- `20260724090100_exercise_seed_v1.sql`
- `20260724090200_body_area_muscle_map_seed.sql`
- `20260724090300_real_programme_engine_v1.sql`
- `20260724090400_start_workout_v1.sql`
- `20260725090000_equipment_no_equipment_semantics.sql`
- `20260725091000_regenerate_current_programme.sql`

The migration set was applied from a clean local Supabase database in CI before the complete pgTAP suite ran.

## 5. Stage 1 validation record

Validated commit: `48e72227211bd85ab95d52309389687bcb9542e9`  
GitHub Actions run: `30149929032`  
Result: success

### Application job

- TypeScript: passed
- ESLint: passed
- Prettier check: passed
- Jest: **38 suites / 197 tests passed**
- Expo web export: passed
- Secret scan of source and exported bundle: passed

The configuration-warning output in the Jest log is intentional coverage of the unconfigured-environment screen; it is not a failing assertion.

### Database job

- Local Supabase stack: started successfully
- Clean database reset: all migrations applied successfully
- pgTAP: **19 files / 513 tests passed**
- Result: PASS

The suite includes owner isolation, grants, consent, health/safety, workouts, BodyScan, equipment semantics, exercise seed integrity, deterministic programme generation, workout creation and programme regeneration.

## 6. Security and privacy outcomes

- Authenticated screens query owner-scoped rows and rely on RLS.
- Direct authenticated writes to protected equipment state are revoked in favour of an atomic RPC.
- Programme generation and restructure remain server-authoritative.
- BodyScan files remain private and are viewed with short-lived signed URLs.
- No privileged credentials were found in source or the exported application bundle.
- CI diagnostic artifacts may contain local development defaults generated by Supabase; these are temporary local-test values and are not production credentials.

## 7. Known limitations and deferred release work

The following are deliberately **not** claimed as complete:

1. **No new Android APK has been built from PR #19.** EAS requires an authorised Expo token/environment configuration.
2. **No physical-device acceptance test has been performed on this branch.** Automated export validates bundling, not real Android camera, keyboard, permission or small-screen behaviour.
3. **The new migrations have not been deployed to a hosted staging or production Supabase project.** Local clean-reset and pgTAP validation passed.
4. **The positioning guide is not drawn inside the live native camera.** `expo-image-picker` cannot host a custom live overlay. The guide appears before capture and on captured previews/comparisons. A live overlay requires a separate `expo-camera` integration and real-device testing.
5. **Offline-first set persistence is not implemented.** The app no longer claims that it writes locally first; network failure is handled truthfully.
6. **Some future product areas remain unavailable.** Those screens now state their availability honestly and do not display simulated personalisation or no-op success messages.
7. **No medical or body-composition inference is provided.** BodyScan remains a private visual comparison tool.

## 8. Release gates

PR #19 should not be merged into `main` until all of the following are complete:

1. Create or select a separate hosted Supabase staging project.
2. Deploy migrations to staging through an auditable workflow.
3. Run hosted structural and owner-isolation verification.
4. Configure EAS build credentials through encrypted repository/environment secrets.
5. Build an installable preview APK pointing to staging.
6. Complete the real-device acceptance checklist on Android.
7. Correct any device-only issues and rerun CI/builds.
8. Obtain explicit approval to deploy production migrations and merge.

## 9. Superseded pull requests

PRs #15, #16 and #17 are superseded by PR #19. They should remain closed and unmerged because each contains only a partial or conflicting subset of the final implementation.

## 10. Current recommendation

Keep PR #19 in draft while staging deployment and real-device testing are outstanding. It is technically validated at source/database level and is suitable to proceed to the controlled staging stage, but it is not yet a production-release candidate.
