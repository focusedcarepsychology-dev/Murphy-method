import { requiredOnboardingStepIds, type OnboardingStepId } from '@/onboarding/steps';
import type { OnboardingSnapshot } from '@/domain/onboarding/types';

/**
 * Per-step "is this required step's minimum data present" predicate.
 * Deliberately mirrors, but does not call, `complete_onboarding`'s
 * server-side validation (supabase/migrations) — this is a client-side UX
 * convenience for the forward-navigation guard and resume logic
 * (`ROUTES.md` §3 rule 2), not the authoritative completion check, which
 * always happens server-side.
 */
const stepCompletionChecks: Record<string, (snapshot: OnboardingSnapshot) => boolean> = {
  basic_profile: (s) => s.dateOfBirth !== null && s.heightCm !== null && s.hasWeightMeasurement,
  main_goal: (s) => s.hasActiveGoals,
  goal_prioritisation: (s) => s.hasActiveGoals,
  training_experience: (s) => s.trainingExperience !== null,
  equipment: (s) => s.hasEquipmentSelection,
  availability: (s) => (s.availableTrainingDays?.length ?? 0) > 0,
  workout_duration: (s) => s.preferredSessionDurationMinutes !== null,
  safety_screening: (s) => s.hasHealthScreening,
  coaching_style: (s) => s.coachingStyle !== null,
};

/**
 * Returns the first required step (in onboarding order) whose minimum
 * input is not yet persisted, or `null` if every required step is
 * satisfied (the user may still be part-way through optional steps or
 * sitting on Programme Preview/Complete — this function only ever
 * constrains *required* steps).
 */
export function computeFirstIncompleteRequiredStep(
  snapshot: OnboardingSnapshot,
): OnboardingStepId | null {
  for (const stepId of requiredOnboardingStepIds) {
    const isComplete = stepCompletionChecks[stepId]?.(snapshot) ?? true;
    if (!isComplete) {
      return stepId;
    }
  }
  return null;
}
