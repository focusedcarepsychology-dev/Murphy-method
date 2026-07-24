/**
 * Shared onboarding domain types (docs/IMPLEMENTATION_PLAN.md Phase 3 §2).
 * Kept independent of any single screen's local form state — screens
 * translate this domain shape to/from their own inputs, they don't define it.
 */

export type UnitPreference = 'metric' | 'imperial';

export type TrainingExperience = 'beginner' | 'recreational' | 'intermediate';

export type CoachingStyle = 'supportive' | 'direct' | 'analytical' | 'competitive' | 'calm_minimal';

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAY_OPTIONS: { key: WeekdayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export const SESSION_DURATION_OPTIONS_MINUTES = [15, 30, 45, 60, 75, 90] as const;

/**
 * Snapshot of exactly the persisted state the onboarding guard/resume logic
 * needs to determine progress — a narrow read, not a full profile export.
 */
export type OnboardingSnapshot = {
  dateOfBirth: string | null;
  heightCm: number | null;
  hasWeightMeasurement: boolean;
  trainingExperience: TrainingExperience | null;
  availableTrainingDays: string[] | null;
  preferredSessionDurationMinutes: number | null;
  coachingStyle: CoachingStyle | null;
  onboardingCompletedAt: string | null;
  hasActiveGoals: boolean;
  hasEquipmentSelection: boolean;
  hasHealthScreening: boolean;
};
