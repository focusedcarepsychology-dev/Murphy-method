import { computeFirstIncompleteRequiredStep } from '@/domain/onboarding/progress';
import type { OnboardingSnapshot } from '@/domain/onboarding/types';

const COMPLETE_SNAPSHOT: OnboardingSnapshot = {
  dateOfBirth: '1990-01-01',
  heightCm: 180,
  hasWeightMeasurement: true,
  trainingExperience: 'beginner',
  availableTrainingDays: ['mon', 'wed', 'fri'],
  preferredSessionDurationMinutes: 45,
  coachingStyle: 'supportive',
  onboardingCompletedAt: null,
  hasActiveGoals: true,
  hasEquipmentSelection: true,
  hasHealthScreening: true,
};

const EMPTY_SNAPSHOT: OnboardingSnapshot = {
  dateOfBirth: null,
  heightCm: null,
  hasWeightMeasurement: false,
  trainingExperience: null,
  availableTrainingDays: null,
  preferredSessionDurationMinutes: null,
  coachingStyle: null,
  onboardingCompletedAt: null,
  hasActiveGoals: false,
  hasEquipmentSelection: false,
  hasHealthScreening: false,
};

describe('computeFirstIncompleteRequiredStep (docs/ROUTES.md §3 rule 2)', () => {
  it('sends a fresh user to basic_profile first', () => {
    expect(computeFirstIncompleteRequiredStep(EMPTY_SNAPSHOT)).toBe('basic_profile');
  });

  it('returns null once every required step is satisfied', () => {
    expect(computeFirstIncompleteRequiredStep(COMPLETE_SNAPSHOT)).toBeNull();
  });

  it('walks required steps in order as each is completed', () => {
    let snapshot = EMPTY_SNAPSHOT;
    expect(computeFirstIncompleteRequiredStep(snapshot)).toBe('basic_profile');

    snapshot = {
      ...snapshot,
      dateOfBirth: '1990-01-01',
      heightCm: 180,
      hasWeightMeasurement: true,
    };
    expect(computeFirstIncompleteRequiredStep(snapshot)).toBe('main_goal');

    snapshot = { ...snapshot, hasActiveGoals: true };
    expect(computeFirstIncompleteRequiredStep(snapshot)).toBe('training_experience');

    snapshot = { ...snapshot, trainingExperience: 'beginner' };
    expect(computeFirstIncompleteRequiredStep(snapshot)).toBe('equipment');

    snapshot = { ...snapshot, hasEquipmentSelection: true };
    expect(computeFirstIncompleteRequiredStep(snapshot)).toBe('availability');

    snapshot = { ...snapshot, availableTrainingDays: ['tue'] };
    expect(computeFirstIncompleteRequiredStep(snapshot)).toBe('workout_duration');

    snapshot = { ...snapshot, preferredSessionDurationMinutes: 30 };
    expect(computeFirstIncompleteRequiredStep(snapshot)).toBe('safety_screening');

    snapshot = { ...snapshot, hasHealthScreening: true };
    expect(computeFirstIncompleteRequiredStep(snapshot)).toBe('coaching_style');

    snapshot = { ...snapshot, coachingStyle: 'direct' };
    expect(computeFirstIncompleteRequiredStep(snapshot)).toBeNull();
  });

  it('never blocks on optional data (body-area goals, measurements, BodyScan)', () => {
    // COMPLETE_SNAPSHOT never sets anything body-area/measurement/BodyScan
    // related in the first place — optional steps have no representation
    // in OnboardingSnapshot at all, which is itself the guarantee that
    // they can never gate this calculation.
    expect(computeFirstIncompleteRequiredStep(COMPLETE_SNAPSHOT)).toBeNull();
  });
});
