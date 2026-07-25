/**
 * Typed reader for `programme_versions.structure`.
 *
 * The column is `jsonb`, written by the server-side programme engine. Real
 * user data can contain the Phase 3 structure-only stand-in, the first
 * deterministic-v1 engine shape, or the newer presentation-rich shape.
 * This reader accepts all three without inventing personal data.
 */
export type ProgrammeGoalPriority = {
  goalKey: string;
  label: string;
  priority: number;
};

export type ProgrammeSessionExercise = {
  exerciseId: string;
  slug: string;
  /** May be empty in deterministic-v1 and is then enriched from `exercises`. */
  name: string;
  orderIndex: number;
  sets: number;
  repRangeLow: number | null;
  repRangeHigh: number | null;
  holdSeconds: number | null;
  restSeconds: number | null;
  rationale: string[];
  inQuick: boolean;
  inMinimum: boolean;
};

export type ProgrammeSession = {
  /** Zero-based server session index used by `start_workout`. */
  sessionIndex: number;
  key: string;
  name: string;
  dayOfWeek: string | null;
  focus: string | null;
  estimatedMinutes: number | null;
  exercises: ProgrammeSessionExercise[];
};

export type ProgrammeStructure = {
  hasExercises: boolean;
  trainingDays: string[];
  sessionDurationMinutes: number | null;
  requiresClearance: boolean;
  restrictionFlags: string[];
  goalPriorities: ProgrammeGoalPriority[];
  equipmentKeys: string[];
  sessions: ProgrammeSession[];
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

function asNonNegativeInt(value: unknown, fallback: number): number {
  const parsed = asNumber(value);
  return parsed !== null && parsed >= 0 ? Math.round(parsed) : fallback;
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

function parseRationale(record: Record<string, unknown>): string[] {
  const explicit = asStringArray(record.rationale);
  if (explicit.length > 0) return explicit;
  return typeof record.whyIncluded === 'string' && record.whyIncluded.trim().length > 0
    ? [record.whyIncluded.trim()]
    : [];
}

function parseExercise(value: unknown, index: number): ProgrammeSessionExercise | null {
  const record = asRecord(value);
  if (typeof record.exerciseId !== 'string') return null;

  return {
    exerciseId: record.exerciseId,
    slug: typeof record.slug === 'string' ? record.slug : '',
    name: typeof record.name === 'string' ? record.name : '',
    orderIndex: asNonNegativeInt(record.orderIndex, index),
    sets: asPositiveInt(record.sets ?? record.targetSets, 1),
    repRangeLow: asNumber(record.repRangeLow ?? record.targetRepRangeLow),
    repRangeHigh: asNumber(record.repRangeHigh ?? record.targetRepRangeHigh),
    holdSeconds: asNumber(record.holdSeconds ?? record.targetHoldSeconds),
    restSeconds: asNumber(record.restSeconds),
    rationale: parseRationale(record),
    inQuick: record.inQuick === true,
    inMinimum: record.inMinimum === true,
  };
}

function parseSession(
  value: unknown,
  index: number,
  trainingDays: string[],
  rootDuration: number | null,
): ProgrammeSession {
  const record = asRecord(value);
  const sessionIndex = asNonNegativeInt(record.sessionIndex, index);
  const parsed = Array.isArray(record.exercises)
    ? record.exercises
        .map((entry, exerciseIndex) => parseExercise(entry, exerciseIndex))
        .filter((entry): entry is ProgrammeSessionExercise => entry !== null)
        .sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  const quickCount = parsed.length > 0 ? Math.max(1, Math.ceil(parsed.length * 0.6)) : 0;
  const minimumCount = parsed.length > 0 ? Math.max(1, Math.ceil(parsed.length * 0.34)) : 0;
  const hasExplicitModeFlags = parsed.some((exercise) => exercise.inQuick || exercise.inMinimum);
  const exercises = parsed.map((exercise, exerciseIndex) =>
    hasExplicitModeFlags
      ? exercise
      : {
          ...exercise,
          inQuick: exerciseIndex < quickCount,
          inMinimum: exerciseIndex < minimumCount,
        },
  );

  return {
    sessionIndex,
    key:
      typeof record.key === 'string'
        ? record.key
        : `session-${sessionIndex + 1}`,
    name:
      typeof record.name === 'string'
        ? record.name
        : typeof record.label === 'string'
          ? record.label
          : `Session ${sessionIndex + 1}`,
    dayOfWeek:
      typeof record.dayOfWeek === 'string'
        ? record.dayOfWeek
        : trainingDays[sessionIndex] ?? null,
    focus:
      typeof record.focus === 'string'
        ? record.focus
        : typeof record.focusSummary === 'string'
          ? record.focusSummary
          : null,
    estimatedMinutes: asNumber(record.estimatedMinutes) ?? rootDuration,
    exercises,
  };
}

export function parseProgrammeStructure(raw: unknown): ProgrammeStructure {
  const record = asRecord(raw);
  const trainingDays = asStringArray(record.weeklyFrequencyDays ?? record.trainingDays);
  const sessionDurationMinutes = asNumber(record.sessionDurationMinutes);
  const sessions = Array.isArray(record.sessions)
    ? record.sessions.map((entry, index) =>
        parseSession(entry, index, trainingDays, sessionDurationMinutes),
      )
    : [];

  return {
    hasExercises: sessions.some((session) => session.exercises.length > 0),
    trainingDays,
    sessionDurationMinutes,
    requiresClearance: record.requiresClearance === true,
    restrictionFlags: asStringArray(record.restrictionFlags),
    goalPriorities: parseGoalPriorities(record.goalPriorities),
    equipmentKeys: asStringArray(record.equipmentKeys),
    sessions,
    limitations: asStringArray(record.limitations ?? record.limitationNotes),
  };
}

export type SessionMode = 'full' | 'quick' | 'minimum';

export function exercisesForMode(
  session: ProgrammeSession,
  mode: SessionMode,
): ProgrammeSessionExercise[] {
  if (mode === 'full') return session.exercises;
  if (mode === 'quick') return session.exercises.filter((exercise) => exercise.inQuick);
  return session.exercises.filter((exercise) => exercise.inMinimum);
}
