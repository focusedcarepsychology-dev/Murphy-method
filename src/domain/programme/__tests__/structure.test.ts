import {
  isRealProgrammeStructure,
  previewModeSummary,
  resolveTodaysSession,
  todaysWeekdayKey,
  type ProgrammeSession,
  type RealProgrammeStructure,
} from '@/domain/programme/structure';

const baseStructure: RealProgrammeStructure = {
  engineVersion: 'deterministic-v1',
  splitType: 'full_body',
  weeklyFrequencyDays: ['fri', 'mon', 'wed'],
  sessionDurationMinutes: 30,
  requiresClearance: false,
  restrictionFlags: [],
  goalPriorities: [],
  limitationNotes: [],
  summary: 'test',
  sessions: [
    { sessionIndex: 0, label: 'Full Body A', focusSummary: '', exercises: [] },
    { sessionIndex: 1, label: 'Full Body B', focusSummary: '', exercises: [] },
    { sessionIndex: 2, label: 'Full Body C', focusSummary: '', exercises: [] },
  ],
};

describe('isRealProgrammeStructure', () => {
  it('recognises a real deterministic-v1 structure', () => {
    expect(isRealProgrammeStructure(baseStructure)).toBe(true);
  });

  it('rejects the legacy phase3-stub-1 structure shape', () => {
    expect(isRealProgrammeStructure({ standInVersion: 'phase3-stub-1' })).toBe(false);
  });

  it('rejects null/undefined without throwing', () => {
    expect(isRealProgrammeStructure(null)).toBe(false);
    expect(isRealProgrammeStructure(undefined)).toBe(false);
  });
});

describe('resolveTodaysSession', () => {
  it('sorts unsorted weeklyFrequencyDays into calendar order before pairing with sessions', () => {
    // weeklyFrequencyDays is ['fri','mon','wed'] (entry order); sorted
    // calendar order is mon(0), wed(1), fri(2).
    expect(resolveTodaysSession(baseStructure, 'mon')?.sessionIndex).toBe(0);
    expect(resolveTodaysSession(baseStructure, 'wed')?.sessionIndex).toBe(1);
    expect(resolveTodaysSession(baseStructure, 'fri')?.sessionIndex).toBe(2);
  });

  it('returns null (a genuine rest day) for a day not in weeklyFrequencyDays', () => {
    expect(resolveTodaysSession(baseStructure, 'sun')).toBeNull();
  });
});

describe('todaysWeekdayKey', () => {
  it('maps JS Sunday (0) to "sun" and Monday (1) to "mon"', () => {
    expect(todaysWeekdayKey(new Date('2026-07-20T12:00:00Z'))).toBe('mon');
    expect(todaysWeekdayKey(new Date('2026-07-26T12:00:00Z'))).toBe('sun');
  });
});

describe('previewModeSummary', () => {
  const session: ProgrammeSession = {
    sessionIndex: 0,
    label: 'Full Body A',
    focusSummary: '',
    exercises: [
      { exerciseId: 'a', orderIndex: 0, targetSets: 3, targetRepRangeLow: 8, targetRepRangeHigh: 12, movementPattern: 'squat', whyIncluded: '' },
      { exerciseId: 'b', orderIndex: 1, targetSets: 3, targetRepRangeLow: 8, targetRepRangeHigh: 12, movementPattern: 'hip_hinge', whyIncluded: '' },
      { exerciseId: 'c', orderIndex: 2, targetSets: 3, targetRepRangeLow: 8, targetRepRangeHigh: 12, movementPattern: 'horizontal_push', whyIncluded: '' },
    ],
  };

  it('FULL keeps every exercise at full sets', () => {
    expect(previewModeSummary(session, 'full')).toEqual({ exerciseCount: 3, estimatedMinutes: 27 });
  });

  it('QUICK reduces both exercise count and sets', () => {
    const result = previewModeSummary(session, 'quick');
    expect(result.exerciseCount).toBeLessThan(3);
    expect(result.estimatedMinutes).toBeLessThan(27);
  });

  it('MINIMUM is the shortest of the three', () => {
    const full = previewModeSummary(session, 'full');
    const quick = previewModeSummary(session, 'quick');
    const minimum = previewModeSummary(session, 'minimum');
    expect(minimum.estimatedMinutes).toBeLessThanOrEqual(quick.estimatedMinutes);
    expect(quick.estimatedMinutes).toBeLessThanOrEqual(full.estimatedMinutes);
  });

  it('returns zero for an empty session rather than throwing', () => {
    expect(previewModeSummary({ ...session, exercises: [] }, 'full')).toEqual({
      exerciseCount: 0,
      estimatedMinutes: 0,
    });
  });
});
