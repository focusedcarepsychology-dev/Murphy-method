/**
 * Onboarding step registry — drives the shared progress indicator
 * (`OnboardingScaffold`) and the resume/forward-guard logic
 * (`src/domain/onboarding/progress.ts`). `required` marks steps a user
 * cannot skip (`ROUTES.md` §3 rule 2, `SCREEN_SPECIFICATIONS.md` §2);
 * optional steps (Body Goal Map, Baseline Measurements, BodyScan) never
 * block forward progress or `completeOnboarding`.
 */
export const onboardingSteps = [
  {
    id: 'introduction',
    path: '/(onboarding)/introduction',
    label: 'Introduction',
    required: false,
  },
  {
    id: 'basic_profile',
    path: '/(onboarding)/basic-profile',
    label: 'Basic Profile',
    required: true,
  },
  { id: 'main_goal', path: '/(onboarding)/main-goal', label: 'Main Goal', required: true },
  {
    id: 'goal_prioritisation',
    path: '/(onboarding)/goal-prioritisation',
    label: 'Goal Prioritisation',
    required: true,
  },
  {
    id: 'body_goal_map',
    path: '/(onboarding)/body-goal-map',
    label: 'Body Goal Map',
    required: false,
  },
  {
    id: 'training_experience',
    path: '/(onboarding)/training-experience',
    label: 'Training Experience',
    required: true,
  },
  { id: 'equipment', path: '/(onboarding)/equipment', label: 'Equipment', required: true },
  { id: 'availability', path: '/(onboarding)/availability', label: 'Availability', required: true },
  {
    id: 'workout_duration',
    path: '/(onboarding)/workout-duration',
    label: 'Workout Duration',
    required: true,
  },
  {
    id: 'safety_screening',
    path: '/(onboarding)/safety-screening',
    label: 'Safety Screening',
    required: true,
  },
  {
    id: 'baseline_measurements',
    path: '/(onboarding)/baseline-measurements',
    label: 'Baseline Measurements',
    required: false,
  },
  {
    id: 'bodyscan_intro',
    path: '/(onboarding)/bodyscan-intro',
    label: 'BodyScan Intro',
    required: false,
  },
  {
    id: 'bodyscan_baseline',
    path: '/(onboarding)/bodyscan-baseline',
    label: 'BodyScan Baseline',
    required: false,
  },
  {
    id: 'coaching_style',
    path: '/(onboarding)/coaching-style',
    label: 'Coaching Style',
    required: true,
  },
  {
    id: 'programme_preview',
    path: '/(onboarding)/programme-preview',
    label: 'Programme Preview',
    required: false,
  },
  { id: 'complete', path: '/(onboarding)/complete', label: 'Complete', required: false },
] as const;

export type OnboardingStepPath = (typeof onboardingSteps)[number]['path'];
export type OnboardingStepId = (typeof onboardingSteps)[number]['id'];

/** The ordered subset of steps a user cannot skip past (`ROUTES.md` §3 rule 2). */
export const requiredOnboardingStepIds: OnboardingStepId[] = onboardingSteps
  .filter((step) => step.required)
  .map((step) => step.id);

export function stepIndexById(id: OnboardingStepId): number {
  return onboardingSteps.findIndex((step) => step.id === id);
}

export function pathForStepId(id: OnboardingStepId): OnboardingStepPath {
  return onboardingSteps[stepIndexById(id)].path;
}

export function stepIdForPath(path: string): OnboardingStepId | null {
  const match = onboardingSteps.find((step) => step.path === path);
  return match ? match.id : null;
}
