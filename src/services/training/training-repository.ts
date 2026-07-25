/**
 * Authenticated training-data reads.
 *
 * Every authenticated screen that used to render `src/dev/previewData`
 * fixtures reads from here instead. The rule this module exists to enforce
 * is simple: it only ever returns rows that genuinely belong to the
 * calling user, and it returns `null`/`[]`/`0` when there is nothing —
 * never a plausible-looking stand-in (CLAUDE.md, "never fake
 * functionality").
 *
 * Reads go straight to RLS-protected tables. Anything that *derives*
 * programme content lives server-side instead
 * (`src/services/training/programme-repository.ts` wraps those RPCs) —
 * the client is never the programme authority.
 */
import type { CoachingStyle } from '@/domain/onboarding/types';
import type { MurphySupabaseClient } from '@/services/supabase/client';

export class TrainingRepositoryError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'TrainingRepositoryError';
    this.cause = cause;
  }
}

function fail(action: string, error: unknown): never {
  throw new TrainingRepositoryError(
    `Couldn't ${action}. Check your connection and try again.`,
    error,
  );
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday-start week containing `reference`, as inclusive ISO dates. */
export function trainingWeekBounds(reference: Date = new Date()): { start: string; end: string } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: isoDate(start), end: isoDate(end) };
}

export function todayIsoDate(reference: Date = new Date()): string {
  return isoDate(reference);
}

// --- Viewer profile --------------------------------------------------------

export type ViewerProfile = {
  /**
   * `profiles.display_name`, normalised: whitespace trimmed, and empty
   * treated as absent. Never substituted with a placeholder name — an
   * absent name means the UI drops the name, not that it invents one.
   */
  displayName: string | null;
  availableTrainingDays: string[];
  preferredSessionDurationMinutes: number | null;
  coachingStyle: CoachingStyle | null;
};

export function normaliseDisplayName(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function loadViewerProfile(
  client: MurphySupabaseClient,
  userId: string,
): Promise<ViewerProfile> {
  const { data, error } = await client
    .from('profiles')
    .select(
      'display_name, available_training_days, preferred_session_duration_minutes, coaching_style',
    )
    .eq('id', userId)
    .single();
  if (error) fail('load your profile', error);
  return {
    displayName: normaliseDisplayName(data.display_name),
    availableTrainingDays: data.available_training_days ?? [],
    preferredSessionDurationMinutes: data.preferred_session_duration_minutes,
    coachingStyle: data.coaching_style,
  };
}

export async function updateDisplayName(
  client: MurphySupabaseClient,
  userId: string,
  displayName: string | null,
): Promise<void> {
  const { error } = await client
    .from('profiles')
    .update({ display_name: normaliseDisplayName(displayName) })
    .eq('id', userId);
  if (error) fail('save your name', error);
}

// --- Programme -------------------------------------------------------------

export type ProgrammeVersionSummary = {
  id: string;
  versionNumber: number;
  changeReason: string;
  engineVersion: string;
  createdAt: string;
  structure: Record<string, unknown>;
};

export type CurrentProgramme = {
  id: string;
  status: 'active' | 'paused' | 'archived';
  currentVersion: ProgrammeVersionSummary | null;
};

export async function loadCurrentProgramme(
  client: MurphySupabaseClient,
  userId: string,
): Promise<CurrentProgramme | null> {
  const { data: programmes, error } = await client
    .from('programmes')
    .select('id, status, current_version_id')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) fail('load your programme', error);

  const programme = programmes?.[0];
  if (!programme) return null;
  if (!programme.current_version_id) {
    return { id: programme.id, status: programme.status, currentVersion: null };
  }

  const { data: versions, error: versionError } = await client
    .from('programme_versions')
    .select('id, version_number, change_reason, engine_version, created_at, structure')
    .eq('id', programme.current_version_id)
    .limit(1);
  if (versionError) fail('load your programme', versionError);

  const version = versions?.[0];
  return {
    id: programme.id,
    status: programme.status,
    currentVersion: version
      ? {
          id: version.id,
          versionNumber: version.version_number,
          changeReason: version.change_reason,
          engineVersion: version.engine_version,
          createdAt: version.created_at,
          structure: (version.structure ?? {}) as Record<string, unknown>,
        }
      : null,
  };
}

export async function loadProgrammeVersionHistory(
  client: MurphySupabaseClient,
  programmeId: string,
): Promise<ProgrammeVersionSummary[]> {
  const { data, error } = await client
    .from('programme_versions')
    .select('id, version_number, change_reason, engine_version, created_at, structure')
    .eq('programme_id', programmeId)
    .order('version_number', { ascending: false });
  if (error) fail('load your programme history', error);
  return (data ?? []).map((row) => ({
    id: row.id,
    versionNumber: row.version_number,
    changeReason: row.change_reason,
    engineVersion: row.engine_version,
    createdAt: row.created_at,
    structure: (row.structure ?? {}) as Record<string, unknown>,
  }));
}

// --- Completed-training history -------------------------------------------

export type TrainingHistorySummary = {
  /** Workouts this user actually completed in the current Monday-start week. */
  completedThisWeek: number;
  /** Planned sessions this week, from persisted availability. Never invented. */
  plannedThisWeek: number;
  /** Total completed workouts, ever. Zero for a user who has not trained yet. */
  completedTotal: number;
};

export async function loadTrainingHistorySummary(
  client: MurphySupabaseClient,
  userId: string,
  plannedThisWeek: number,
  reference: Date = new Date(),
): Promise<TrainingHistorySummary> {
  const week = trainingWeekBounds(reference);

  const { count: weekCount, error: weekError } = await client
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .eq('status', 'completed')
    .gte('scheduled_for', week.start)
    .lte('scheduled_for', week.end);
  if (weekError) fail('load your training history', weekError);

  const { count: totalCount, error: totalError } = await client
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .eq('status', 'completed');
  if (totalError) fail('load your training history', totalError);

  return {
    completedThisWeek: weekCount ?? 0,
    plannedThisWeek,
    completedTotal: totalCount ?? 0,
  };
}

/**
 * Completed workouts per week for the last `weeks` Monday-start weeks,
 * oldest first. Every entry is a real count; weeks before the user
 * started training are genuine zeros, not omitted to flatter the chart.
 */
export async function loadWeeklyCompletionCounts(
  client: MurphySupabaseClient,
  userId: string,
  weeks: number,
  reference: Date = new Date(),
): Promise<{ weekStart: string; completed: number }[]> {
  const currentWeek = trainingWeekBounds(reference);
  const earliestStart = new Date(currentWeek.start);
  earliestStart.setDate(earliestStart.getDate() - (weeks - 1) * 7);

  const { data, error } = await client
    .from('workouts')
    .select('scheduled_for, completed_at')
    .eq('profile_id', userId)
    .eq('status', 'completed')
    .gte('scheduled_for', isoDate(earliestStart))
    .lte('scheduled_for', currentWeek.end);
  if (error) fail('load your consistency history', error);

  const buckets: { weekStart: string; completed: number }[] = [];
  for (let index = 0; index < weeks; index += 1) {
    const start = new Date(earliestStart);
    start.setDate(start.getDate() + index * 7);
    buckets.push({ weekStart: isoDate(start), completed: 0 });
  }

  for (const row of data ?? []) {
    if (!row.scheduled_for) continue;
    const bucket = trainingWeekBounds(new Date(`${row.scheduled_for}T00:00:00`)).start;
    const target = buckets.find((entry) => entry.weekStart === bucket);
    if (target) target.completed += 1;
  }

  return buckets;
}

// --- Logged performance ----------------------------------------------------

export type LoggedSet = {
  exerciseId: string;
  weightKg: number | null;
  reps: number;
  completedAt: string;
};

/**
 * Every set the user has logged against a *completed* workout, newest
 * first. This is the only source of "previous performance" and "personal
 * record" anywhere in the app: no set logs means no previous performance
 * and no records, full stop (INVARIANTS B and C).
 */
async function loadCompletedSetLogs(
  client: MurphySupabaseClient,
  userId: string,
): Promise<LoggedSet[]> {
  const { data: workouts, error: workoutError } = await client
    .from('workouts')
    .select('id')
    .eq('profile_id', userId)
    .eq('status', 'completed');
  if (workoutError) fail('load your training history', workoutError);
  const workoutIds = (workouts ?? []).map((row) => row.id);
  if (workoutIds.length === 0) return [];

  const { data: workoutExercises, error: workoutExerciseError } = await client
    .from('workout_exercises')
    .select('id, exercise_id')
    .in('workout_id', workoutIds);
  if (workoutExerciseError) fail('load your training history', workoutExerciseError);
  const exerciseByWorkoutExerciseId = new Map(
    (workoutExercises ?? []).map((row) => [row.id, row.exercise_id]),
  );
  if (exerciseByWorkoutExerciseId.size === 0) return [];

  const { data: setLogs, error: setLogError } = await client
    .from('set_logs')
    .select('workout_exercise_id, weight_kg, reps, completed_at')
    .in('workout_exercise_id', Array.from(exerciseByWorkoutExerciseId.keys()))
    .order('completed_at', { ascending: false });
  if (setLogError) fail('load your training history', setLogError);

  return (setLogs ?? [])
    .map((row) => {
      const exerciseId = exerciseByWorkoutExerciseId.get(row.workout_exercise_id);
      if (!exerciseId) return null;
      return {
        exerciseId,
        weightKg: row.weight_kg,
        reps: row.reps,
        completedAt: row.completed_at,
      };
    })
    .filter((row): row is LoggedSet => row !== null);
}

async function loadExerciseNames(
  client: MurphySupabaseClient,
  exerciseIds: string[],
): Promise<Map<string, string>> {
  if (exerciseIds.length === 0) return new Map();
  const { data, error } = await client
    .from('exercises')
    .select('id, name')
    .in('id', Array.from(new Set(exerciseIds)));
  if (error) fail('load exercise details', error);
  return new Map((data ?? []).map((row) => [row.id, row.name]));
}

export type PreviousPerformance = {
  weightKg: number | null;
  reps: number;
  completedAt: string;
};

/**
 * The most recent logged set per exercise. Exercises the user has never
 * logged are simply absent from the map, so callers omit the "Previous"
 * line rather than guessing a starting weight.
 */
export async function loadPreviousPerformance(
  client: MurphySupabaseClient,
  userId: string,
): Promise<Map<string, PreviousPerformance>> {
  const logs = await loadCompletedSetLogs(client, userId);
  const byExercise = new Map<string, PreviousPerformance>();
  for (const log of logs) {
    // `logs` is already newest-first, so the first entry per exercise wins.
    if (byExercise.has(log.exerciseId)) continue;
    byExercise.set(log.exerciseId, {
      weightKg: log.weightKg,
      reps: log.reps,
      completedAt: log.completedAt,
    });
  }
  return byExercise;
}

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  weightKg: number | null;
  reps: number;
  achievedAt: string;
};

/**
 * Best logged set per exercise: heaviest load first, then most reps at
 * that load. For unloaded work (no weight recorded) the record is simply
 * the highest rep count. Returns `[]` for a user with no logged sets.
 */
export async function loadPersonalRecords(
  client: MurphySupabaseClient,
  userId: string,
): Promise<PersonalRecord[]> {
  const logs = await loadCompletedSetLogs(client, userId);
  if (logs.length === 0) return [];

  const best = new Map<string, LoggedSet>();
  for (const log of logs) {
    const current = best.get(log.exerciseId);
    if (!current) {
      best.set(log.exerciseId, log);
      continue;
    }
    const currentWeight = current.weightKg ?? 0;
    const candidateWeight = log.weightKg ?? 0;
    if (
      candidateWeight > currentWeight ||
      (candidateWeight === currentWeight && log.reps > current.reps)
    ) {
      best.set(log.exerciseId, log);
    }
  }

  const names = await loadExerciseNames(client, Array.from(best.keys()));
  return Array.from(best.entries())
    .map(([exerciseId, log]) => ({
      exerciseId,
      exerciseName: names.get(exerciseId) ?? 'Exercise',
      weightKg: log.weightKg,
      reps: log.reps,
      achievedAt: log.completedAt,
    }))
    .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt));
}

/**
 * Renders a logged set as "<weight> kg × <reps>", or just "<reps> reps"
 * for unloaded work. Only ever called with a set the user actually logged.
 */
export function formatPerformance(weightKg: number | null, reps: number): string {
  if (weightKg === null || weightKg === 0) return `${reps} reps`;
  return `${weightKg} kg × ${reps}`;
}

// --- Workouts --------------------------------------------------------------

export type WorkoutExerciseDetail = {
  workoutExerciseId: string;
  exerciseId: string;
  name: string;
  slug: string;
  orderIndex: number;
  targetSets: number;
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
  /** Only present when the user has genuinely logged this exercise before. */
  previous: PreviousPerformance | null;
  /** Sets genuinely logged for this exercise in the current workout. */
  loggedSetNumbers: number[];
};

export type WorkoutDetail = {
  id: string;
  mode: 'full' | 'quick' | 'minimum';
  status: 'planned' | 'in_progress' | 'completed' | 'skipped';
  scheduledFor: string | null;
  estimatedDurationMinutes: number | null;
  programmeVersionId: string | null;
  exercises: WorkoutExerciseDetail[];
};

/**
 * One real workout belonging to the caller. RLS already scopes `workouts`
 * to `auth.uid()`, so an id belonging to somebody else simply returns no
 * row and this resolves to `null` — the screen then says the workout could
 * not be found rather than rendering a stand-in.
 */
export async function loadWorkoutDetail(
  client: MurphySupabaseClient,
  userId: string,
  workoutId: string,
): Promise<WorkoutDetail | null> {
  const { data: workouts, error } = await client
    .from('workouts')
    .select(
      'id, mode, status, scheduled_for, estimated_duration_minutes, programme_version_id, profile_id',
    )
    .eq('id', workoutId)
    .limit(1);
  if (error) fail('load that workout', error);

  const workout = workouts?.[0];
  if (!workout || workout.profile_id !== userId) return null;

  const { data: workoutExercises, error: exerciseError } = await client
    .from('workout_exercises')
    .select(
      'id, exercise_id, order_index, target_sets, target_rep_range_low, target_rep_range_high',
    )
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: true });
  if (exerciseError) fail('load that workout', exerciseError);

  const exerciseIds = (workoutExercises ?? []).map((row) => row.exercise_id);
  const [names, previous] = await Promise.all([
    loadExerciseNamesAndSlugs(client, exerciseIds),
    loadPreviousPerformance(client, userId),
  ]);

  const workoutExerciseIds = (workoutExercises ?? []).map((row) => row.id);
  const loggedSetNumbers = new Map<string, number[]>();
  if (workoutExerciseIds.length > 0) {
    const { data: currentSetLogs, error: currentSetError } = await client
      .from('set_logs')
      .select('workout_exercise_id, set_number')
      .in('workout_exercise_id', workoutExerciseIds)
      .order('set_number', { ascending: true });
    if (currentSetError) fail('load completed sets for that workout', currentSetError);

    for (const row of currentSetLogs ?? []) {
      const values = loggedSetNumbers.get(row.workout_exercise_id) ?? [];
      if (!values.includes(row.set_number)) values.push(row.set_number);
      loggedSetNumbers.set(row.workout_exercise_id, values);
    }
  }

  return {
    id: workout.id,
    mode: workout.mode,
    status: workout.status,
    scheduledFor: workout.scheduled_for,
    estimatedDurationMinutes: workout.estimated_duration_minutes,
    programmeVersionId: workout.programme_version_id,
    exercises: (workoutExercises ?? []).map((row) => ({
      workoutExerciseId: row.id,
      exerciseId: row.exercise_id,
      name: names.get(row.exercise_id)?.name ?? 'Exercise',
      slug: names.get(row.exercise_id)?.slug ?? '',
      orderIndex: row.order_index,
      targetSets: row.target_sets,
      targetRepRangeLow: row.target_rep_range_low,
      targetRepRangeHigh: row.target_rep_range_high,
      previous: previous.get(row.exercise_id) ?? null,
      loggedSetNumbers: loggedSetNumbers.get(row.id) ?? [],
    })),
  };
}

async function loadExerciseNamesAndSlugs(
  client: MurphySupabaseClient,
  exerciseIds: string[],
): Promise<Map<string, { name: string; slug: string }>> {
  if (exerciseIds.length === 0) return new Map();
  const { data, error } = await client
    .from('exercises')
    .select('id, name, slug')
    .in('id', Array.from(new Set(exerciseIds)));
  if (error) fail('load exercise details', error);
  return new Map((data ?? []).map((row) => [row.id, { name: row.name, slug: row.slug }]));
}

// --- Workout logging -------------------------------------------------------

/**
 * Records one genuinely completed set. This is the only way performance
 * data ever enters the app: "Previous", personal records and completion
 * counts all read back from rows written here.
 */
export type LogSetInput = {
  workoutExerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number;
  clientGeneratedId: string;
};

export async function logSet(client: MurphySupabaseClient, input: LogSetInput): Promise<void> {
  const { error } = await client.from('set_logs').upsert(
    {
      workout_exercise_id: input.workoutExerciseId,
      set_number: input.setNumber,
      weight_kg: input.weightKg,
      reps: input.reps,
      client_generated_id: input.clientGeneratedId,
    },
    { onConflict: 'client_generated_id' },
  );
  if (error) fail('save that set', error);
}

export async function markWorkoutInProgress(
  client: MurphySupabaseClient,
  workoutId: string,
): Promise<void> {
  const { error } = await client
    .from('workouts')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', workoutId)
    .eq('status', 'planned');
  if (error) fail('start that workout', error);
}

export async function markWorkoutCompleted(
  client: MurphySupabaseClient,
  workoutId: string,
): Promise<void> {
  const { error } = await client
    .from('workouts')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', workoutId);
  if (error) fail('finish that workout', error);
}

export type WorkoutSummary = {
  completedExercises: number;
  completedSets: number;
  durationMinutes: number | null;
};

/** Counts what was genuinely logged for this workout. Never estimated. */
export async function loadWorkoutSummary(
  client: MurphySupabaseClient,
  userId: string,
  workoutId: string,
): Promise<WorkoutSummary | null> {
  const { data: workouts, error } = await client
    .from('workouts')
    .select('id, profile_id, started_at, completed_at')
    .eq('id', workoutId)
    .limit(1);
  if (error) fail('load your session summary', error);
  const workout = workouts?.[0];
  if (!workout || workout.profile_id !== userId) return null;

  const { data: workoutExercises, error: exerciseError } = await client
    .from('workout_exercises')
    .select('id')
    .eq('workout_id', workoutId);
  if (exerciseError) fail('load your session summary', exerciseError);

  const workoutExerciseIds = (workoutExercises ?? []).map((row) => row.id);
  if (workoutExerciseIds.length === 0) {
    return { completedExercises: 0, completedSets: 0, durationMinutes: null };
  }

  const { data: setLogs, error: setLogError } = await client
    .from('set_logs')
    .select('workout_exercise_id')
    .in('workout_exercise_id', workoutExerciseIds);
  if (setLogError) fail('load your session summary', setLogError);

  const exercisesWithSets = new Set((setLogs ?? []).map((row) => row.workout_exercise_id));
  const durationMinutes =
    workout.started_at && workout.completed_at
      ? Math.max(
          1,
          Math.round(
            (new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) /
              60000,
          ),
        )
      : null;

  return {
    completedExercises: exercisesWithSets.size,
    completedSets: setLogs?.length ?? 0,
    durationMinutes,
  };
}

/** The next planned workout on or after today, if one exists. */
export async function loadNextPlannedWorkout(
  client: MurphySupabaseClient,
  userId: string,
  reference: Date = new Date(),
): Promise<{ id: string; scheduledFor: string | null } | null> {
  const { data, error } = await client
    .from('workouts')
    .select('id, scheduled_for')
    .eq('profile_id', userId)
    .in('status', ['planned', 'in_progress'])
    .gte('scheduled_for', todayIsoDate(reference))
    .order('scheduled_for', { ascending: true })
    .limit(1);
  if (error) fail('load your next session', error);
  const workout = data?.[0];
  return workout ? { id: workout.id, scheduledFor: workout.scheduled_for } : null;
}
