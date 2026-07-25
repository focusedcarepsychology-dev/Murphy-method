import { exercisesForMode, parseProgrammeStructure } from '@/domain/programme/structure';

describe('parseProgrammeStructure', () => {
  it('reads the deterministic-v1 server shape without losing real exercises', () => {
    const parsed = parseProgrammeStructure({
      engineVersion: 'deterministic-v1',
      weeklyFrequencyDays: ['Monday', 'Thursday'],
      sessionDurationMinutes: 30,
      limitationNotes: ['A resistance band would enable a pulling movement.'],
      sessions: [
        {
          sessionIndex: 0,
          label: 'Full Body A',
          focusSummary: 'Full-body training.',
          exercises: [
            {
              exerciseId: 'exercise-1',
              orderIndex: 0,
              targetSets: 3,
              targetRepRangeLow: 8,
              targetRepRangeHigh: 12,
              whyIncluded: 'Supports your primary goal.',
            },
            {
              exerciseId: 'exercise-2',
              orderIndex: 1,
              targetSets: 2,
              targetRepRangeLow: 10,
              targetRepRangeHigh: 15,
              whyIncluded: 'Matches your available equipment.',
            },
          ],
        },
      ],
    });

    expect(parsed.hasExercises).toBe(true);
    expect(parsed.limitations).toEqual(['A resistance band would enable a pulling movement.']);
    expect(parsed.sessions[0]).toMatchObject({
      sessionIndex: 0,
      name: 'Full Body A',
      dayOfWeek: 'Monday',
      focus: 'Full-body training.',
      estimatedMinutes: 30,
    });
    expect(parsed.sessions[0].exercises[0]).toMatchObject({
      exerciseId: 'exercise-1',
      orderIndex: 0,
      sets: 3,
      repRangeLow: 8,
      repRangeHigh: 12,
      rationale: ['Supports your primary goal.'],
    });
  });

  it('continues to read the presentation-rich structure shape', () => {
    const parsed = parseProgrammeStructure({
      trainingDays: ['Tuesday'],
      limitations: [],
      sessions: [
        {
          key: 'upper-a',
          name: 'Upper A',
          dayOfWeek: 'Tuesday',
          estimatedMinutes: 40,
          exercises: [
            {
              exerciseId: 'exercise-3',
              slug: 'incline-push-up',
              name: 'Incline Push-up',
              orderIndex: 0,
              sets: 3,
              repRangeLow: 8,
              repRangeHigh: 12,
              rationale: ['Appropriate for your experience level.'],
              inQuick: true,
              inMinimum: true,
            },
          ],
        },
      ],
    });

    expect(parsed.sessions[0].exercises[0].name).toBe('Incline Push-up');
    expect(exercisesForMode(parsed.sessions[0], 'minimum')).toHaveLength(1);
  });

  it('derives quick and minimum subsets using the same ratios as start_workout', () => {
    const parsed = parseProgrammeStructure({
      sessions: [
        {
          sessionIndex: 0,
          exercises: Array.from({ length: 6 }, (_, index) => ({
            exerciseId: `exercise-${index}`,
            orderIndex: index,
            targetSets: 3,
          })),
        },
      ],
    });

    expect(exercisesForMode(parsed.sessions[0], 'full')).toHaveLength(6);
    expect(exercisesForMode(parsed.sessions[0], 'quick')).toHaveLength(4);
    expect(exercisesForMode(parsed.sessions[0], 'minimum')).toHaveLength(3);
  });

  it('returns a truthful empty state for a structure-only programme', () => {
    const parsed = parseProgrammeStructure({ standInVersion: 'phase3-stub-1' });
    expect(parsed.hasExercises).toBe(false);
    expect(parsed.sessions).toEqual([]);
    expect(parsed.limitations).toEqual([]);
  });
});
