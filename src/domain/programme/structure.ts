/**
 * Typed reader for `programme_versions.structure`.
 *
 * The column is `jsonb`, written by the server-side programme engine, and
 * two shapes exist in real user data:
 *
 *  - the Phase 3 structure-only stand-in (`standInVersion: 'phase3-stub-1'`),
 *    which recorded preferences but selected no exercises;
 *  - the deterministic initial exercise programme (`engineVersion:
 *    'deterministic-initial-v1'`), which contains real sessions.
 *
 * Everything here is a *read* of what the server already decided. Nothing
 * is inferred, defaulted to a flattering value, or invented: a field the
 * server did not write comes back `null`/`[]`, and callers render a
 * truthful empty state rather than a plausible number.
 */
export type ProgrammeGoalPriority = {
  goalKey: string;
  label: string;
  priority: number;
};

export type ProgrammeSessionExercise = {
  exerciseId: string;
  slug: string;
  name: string;
  orderIndex: number;
  sets: number;
  repRangeLow: number | null;
  repRangeHigh: number | null;
  holdSeconds: number | null;
  restSeconds: number | null;
  /** Deterministic selection facts, used to build "Why this exercise?". */
  rationale: string[];
  /** Smallest coherent subset flags, used for QUICK / MINIMUM. */
  inQuick: boolean;
  inMinimum: boolean;
};

export type ProgrammeSession = {
  key: string;
  name: string;
  dayOfWeek: string | null;
  focus: string | null;
  estimatedMinutes: number | null;
  exercises: ProgrammeSessionExercise[];
};

export type ProgrammeStructure = {
  /** True only when a real exercise-selection engine produced this version. */
  hasExercises: boolean;
  trainingDays: string[];
  sessionDurationMinutes: number | null;
  requiresClearance: boolean;
  restrictionFlags: string[];
  goalPriorities: ProgrammeGoalPriority[];
  equipmentKeys: string[];
  sessions: ProgrammeSession[];
  /**
   * Honest constraints the engine hit (for example: no equipment that can
   * load a horizontal pull). Written by the engine, never softened here.
   */
  limitations: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asPositiveInt(value: unknown, fallback: number): number {
  const parsed = asNumber(value);
  return parsed !== null && parsed > 0 ? Math.round(parsed) : fallback;
}

function parseGoalPriorities(value: unknown): ProgrammeGoalPriority[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.goalKey === 'string')
    .map((entry, index) => ({
      goalKey: String(entry.goalKey),
      label: typeof entry.label === 'string' ? entry.label : String(entry.goalKey),
      priority: asPositiveInt(entry.priority, index + 1),
    }))
    .sort((a, b) => a.priority - b.priority);
}

function parseExercise(value: unknown, index: number): ProgrammeSessionExercise | null {
  const record = asRecord(value);
  if (typeof record.exerciseId !== 'string' || typeof record.name !== 'string') return null;
  return {
    exerciseId: record.exerciseId,
    slug: typeof record.slug === 'string' ? record.slug : '',
    name: record.name,
    orderIndex: asPositiveInt(record.orderIndex, index + 1) - 1,
    sets: asPositiveInt(record.sets, 1),
    repRangeLow: asNumber(record.repRangeLow),
    repRangeHigh: asNumber(record.repRangeHigh),
    holdSeconds: asNumber(record.holdSeconds),
    restSeconds: asNumber(record.restSeconds),
    rationale: asStringArray(record.rationale),
    inQuick: record.inQuick === true,
    inMinimum: record.inMinimum === true,
  };
}

function parseSession(value: unknown, index: number): ProgrammeSession {
  const record = asRecord(value);
  const exercises = Array.isArray(record.exercises)
    ? record.exercises
        .map((entry, exerciseIndex) => parseExercise(entry, exerciseIndex))
        .filter((entry): entry is ProgrammeSessionExercise => entry !== null)
        .sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  return {
    key: typeof record.key === 'string' ? record.key : `session-${index + 1}`,
    name: typeof record.name === 'string' ? record.name : `Session ${index + 1}`,
    dayOfWeek: typeof record.dayOfWeek === 'string' ? record.dayOfWeek : null,
    focus: typeof record.focus === 'string' ? record.focus : null,
    estimatedMinutes: asNumber(record.estimatedMinutes),
    exercises,
  };
}

export function parseProgrammeStructure(raw: unknown): ProgrammeStructure {
  const record = asRecord(raw);
  const sessions = Array.isArray(record.sessions)
    ? record.sessions.map((entry, index) => parseSession(entry, index))
    : [];

  return {
    hasExercises: sessions.some((session) => session.exercises.length > 0),
    trainingDays: asStringArray(record.weeklyFrequencyDays ?? record.trainingDays),
    sessionDurationMinutes: asNumber(record.sessionDurationMinutes),
    requiresClearance: record.requiresClearance === true,
    restrictionFlags: asStringArray(record.restrictionFlags),
    goalPriorities: parseGoalPriorities(record.goalPriorities),
    equipmentKeys: asStringArray(record.equipmentKeys),
    sessions,
    limitations: asStringArray(record.limitations),
  };
}

/**
 * The exercises that make up a session in a given mode. FULL is the whole
 * session; QUICK and MINIMUM are subsets of that same real session, chosen
 * by the server-side engine — never a different, shorter fiction.
 */
export type SessionMode = 'full' | 'quick' | 'minimum';

export function exercisesForMode(
  session: ProgrammeSession,
  mode: SessionMode,
): ProgrammeSessionExercise[] {
  if (mode === 'full') return session.exercises;
  if (mode === 'quick') return session.exercises.filter((exercise) => exercise.inQuick);
  return session.exercises.filter((exercise) => exercise.inMinimum);
}
