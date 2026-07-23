/** Onboarding step order, used only to drive the shared progress indicator. */
export const onboardingSteps = [
  { path: '/(onboarding)/introduction', label: 'Introduction' },
  { path: '/(onboarding)/basic-profile', label: 'Basic Profile' },
  { path: '/(onboarding)/main-goal', label: 'Main Goal' },
  { path: '/(onboarding)/goal-prioritisation', label: 'Goal Prioritisation' },
  { path: '/(onboarding)/body-goal-map', label: 'Body Goal Map' },
  { path: '/(onboarding)/training-experience', label: 'Training Experience' },
  { path: '/(onboarding)/equipment', label: 'Equipment' },
  { path: '/(onboarding)/availability', label: 'Availability' },
  { path: '/(onboarding)/workout-duration', label: 'Workout Duration' },
  { path: '/(onboarding)/safety-screening', label: 'Safety Screening' },
  { path: '/(onboarding)/baseline-measurements', label: 'Baseline Measurements' },
  { path: '/(onboarding)/bodyscan-intro', label: 'BodyScan Intro' },
  { path: '/(onboarding)/bodyscan-baseline', label: 'BodyScan Baseline' },
  { path: '/(onboarding)/coaching-style', label: 'Coaching Style' },
  { path: '/(onboarding)/programme-preview', label: 'Programme Preview' },
  { path: '/(onboarding)/complete', label: 'Complete' },
] as const;

export type OnboardingStepPath = (typeof onboardingSteps)[number]['path'];
