import {
  describeProgrammeVersion,
  INITIAL_EXERCISE_ENGINE_VERSION,
  STRUCTURE_ONLY_ENGINE_VERSION,
} from '@/domain/programme/version-history';

describe('describeProgrammeVersion (INVARIANT G)', () => {
  it('does not claim the Phase 3 stub generated exercises', () => {
    const description = describeProgrammeVersion(STRUCTURE_ONLY_ENGINE_VERSION);

    expect(description.hasExercises).toBe(false);
    expect(description.title).toBe('Starting structure created');
    expect(description.detail).toMatch(/No exercises were selected/i);
  });

  it('describes the deterministic engine as having selected exercises', () => {
    const description = describeProgrammeVersion(INITIAL_EXERCISE_ENGINE_VERSION);

    expect(description.hasExercises).toBe(true);
    expect(description.detail).toMatch(/equipment/i);
  });

  it('never claims exercises for an unknown engine version', () => {
    expect(describeProgrammeVersion('something-else').hasExercises).toBe(false);
  });
});
