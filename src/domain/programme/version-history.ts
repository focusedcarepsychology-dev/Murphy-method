/**
 * Truthful Programme History copy (INVARIANT G: Programme History cannot
 * claim a preview/demo exercise list was generated from onboarding).
 *
 * `programme_versions` rows are immutable audit records, so the historical
 * `change_reason` text written by an earlier engine is never rewritten.
 * What this module does instead is derive the *displayed* description from
 * `engine_version`, which is the authoritative record of what actually ran:
 *
 *  - `phase3-stub-1` created a programme **structure** only, training
 *    days, session length, goal priorities and safety state. It selected
 *    no exercises at all. Its stored reason ("Initial programme created
 *    from your onboarding responses") reads as though it did, so the UI
 *    must not repeat it unqualified.
 *  - `deterministic-initial-v1` is the first version that genuinely
 *    selected exercises, from persisted onboarding inputs.
 */
export type ProgrammeVersionDescription = {
  title: string;
  detail: string;
  /** True when this version genuinely contains selected exercises. */
  hasExercises: boolean;
};

export const STRUCTURE_ONLY_ENGINE_VERSION = 'phase3-stub-1';
export const INITIAL_EXERCISE_ENGINE_VERSION = 'deterministic-initial-v1';

export function describeProgrammeVersion(engineVersion: string): ProgrammeVersionDescription {
  if (engineVersion === STRUCTURE_ONLY_ENGINE_VERSION) {
    return {
      title: 'Starting structure created',
      detail:
        'Built from your onboarding preferences: training days, session length, goal order and safety answers. No exercises were selected at this version.',
      hasExercises: false,
    };
  }

  if (engineVersion === INITIAL_EXERCISE_ENGINE_VERSION) {
    return {
      title: 'Initial exercise programme generated',
      detail:
        'Exercises selected from your goals, available equipment, training days, session length and safety answers.',
      hasExercises: true,
    };
  }

  return {
    title: 'Programme updated',
    detail: 'Recorded by the programme engine.',
    hasExercises: false,
  };
}

/** Short, unambiguous date for a history row. Never a relative fiction. */
export function formatVersionDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
