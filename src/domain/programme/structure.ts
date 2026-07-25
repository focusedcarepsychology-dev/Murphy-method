/**
 * Typed view over the `programme_versions.structure` jsonb produced by
 * `build_real_programme_structure` (supabase/migrations/20260724090300_real_programme_engine_v1.sql).
 * The server is the sole authority for what this contains — this module
 * only reads and presents it, it never invents or recomputes selection
 * logic client-side (remediation Part 8: "do not make the client the
 * programme authority").
 */
import type { WeekdayKey } from '@/domain/onboarding/types';
import { WEEKDAY_OPTIONS } from '@/domain/onboarding/types';

export type ProgrammeSessionExercise = {
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
  movementPattern: string;
  whyIncluded: string;
};

export type ProgrammeSession = {
  sessionIndex: number;
  label: string;
  focusSummary: string;
  exercises: ProgrammeSessionExercise[];
};

export type ProgrammeGoalPriority = {
  goalKey: string;
  label: string;
  priority: number;
};

export type RealProgrammeStructure = {
  engineVersion: 'deterministic-v1';
  splitType: 'full_body' | 'upper_lower';
  weeklyFrequencyDays: WeekdayKey[];
  sessionDurationMinutes: number | null;
  requiresClearance: boolean;
  restrictionFlags: string[];
  goalPriorities: ProgrammeGoalPriority[];
  limitationNotes: string[];
  sessions: ProgrammeSession[];
  summary: string;
};

/** True for any structure produced by the real engine (as opposed to the historical Phase 3 stub). */
export function isRealProgrammeStructure(structure: unknown): structure is RealProgrammeStructure {
  return (
    typeof structure === 'object' &&
    structure !== null &&
    (structure as { engineVersion?: unknown }).engineVersion === 'deterministic-v1' &&
    Array.isArray((structure as { sessions?: unknown }).sessions)
  );
}

const WEEKDAY_ORDER: WeekdayKey[] = WEEKDAY_OPTIONS.map((option) => option.key);

/**
 * Deterministically pairs each session with a day the user said they train
 * (sorted into calendar-week order — sessions are generated in that same
 * order, one per available day), then resolves which session (if any)
 * corresponds to `todayKey`. Returns `null` on a day with no scheduled
 * session (a genuine rest day, not an error state).
 */
export function resolveTodaysSession(
  structure: RealProgrammeStructure,
  todayKey: WeekdayKey,
): ProgrammeSession | null {
  const sortedDays = [...structure.weeklyFrequencyDays].sort(
    (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b),
  );
  const dayIndex = sortedDays.indexOf(todayKey);
  if (dayIndex === -1) return null;

  return structure.sessions.find((session) => session.sessionIndex === dayIndex) ?? null;
}

export function todaysWeekdayKey(date: Date = new Date()): WeekdayKey {
  const jsDay = date.getDay(); // 0 = Sunday
  const index = (jsDay + 6) % 7; // rotate so 0 = Monday, matching WEEKDAY_ORDER
  return WEEKDAY_ORDER[index] ?? 'mon';
}

/** Total working sets in a session — the basis for the duration estimate shown in the UI. */
export function totalSets(session: ProgrammeSession): number {
  return session.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);
}

/**
 * Mirrors the server's start_workout set/exercise reduction
 * (supabase/migrations/20260724090400_start_workout_v1.sql) for display
 * purposes only (e.g. showing "Quick · 12 min" before the user taps
 * Start) — the server remains authoritative for what actually gets
 * written once a workout starts.
 */
export function previewModeSummary(
  session: ProgrammeSession,
  mode: 'full' | 'quick' | 'minimum',
): { exerciseCount: number; estimatedMinutes: number } {
  const n = session.exercises.length;
  if (n === 0) return { exerciseCount: 0, estimatedMinutes: 0 };

  const keepCount =
    mode === 'full' ? n : mode === 'quick' ? Math.max(1, Math.ceil(n * 0.6)) : Math.max(1, Math.ceil(n * 0.34));
  const setDelta = mode === 'full' ? 0 : mode === 'quick' ? -1 : -2;

  let minutes = 0;
  for (let i = 0; i < keepCount; i += 1) {
    const sets = Math.max(1, session.exercises[i].targetSets + setDelta);
    minutes += sets * 3;
  }

  return { exerciseCount: keepCount, estimatedMinutes: Math.round(minutes) };
}
