/**
 * Workout domain service (remediation Part 10/11). Real workouts only, * no preview/PREVIEW_WORKOUT_ID routing reaches this module.
 */
import type { MurphySupabaseClient } from '@/services/supabase/client';
import { generateClientId } from '@/services/id';

export class WorkoutRepositoryError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'WorkoutRepositoryError';
    this.cause = cause;
  }
}

function fail(action: string, error: unknown): never {
  throw new WorkoutRepositoryError(
    `Couldn't ${action}. Check your connection and try again.`,
    error,
  );
}

export type WorkoutMode = 'full' | 'quick' | 'minimum';

/**
 * Materialises a real workout via the server-authoritative start_workout
 * RPC (supabase/migrations/20260724090400_start_workout_v1.sql). The
 * client only ever chooses which session/mode; the server decides which
 * exercises/sets that produces.
 */
export async function startWorkout(
  client: MurphySupabaseClient,
  params: { programmeVersionId: string; sessionIndex: number; mode: WorkoutMode },
): Promise<{ workoutId: string; created: boolean }> {
  const { data, error } = await client.rpc('start_workout', {
    p_programme_version_id: params.programmeVersionId,
    p_session_index: params.sessionIndex,
    p_mode: params.mode,
    p_client_generated_id: generateClientId(),
  });
  if (error) fail('start this workout', error);
  return data as { workoutId: string; created: boolean };
}

export type WorkoutExerciseRow = {
  id: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
};

export type WorkoutDetail = {
  id: string;
  mode: WorkoutMode;
  status: 'planned' | 'in_progress' | 'completed' | 'skipped';
  estimatedDurationMinutes: number | null;
  exercises: WorkoutExerciseRow[];
};

export async function getWorkout(
  client: MurphySupabaseClient,
  workoutId: string,
): Promise<WorkoutDetail> {
  const { data: workout, error: workoutError } = await client
    .from('workouts')
    .select('id, mode, status, estimated_duration_minutes')
    .eq('id', workoutId)
    .single();
  if (workoutError) fail('load this workout', workoutError);

  const { data: exercises, error: exercisesError } = await client
    .from('workout_exercises')
    .select(
      'id, exercise_id, order_index, target_sets, target_rep_range_low, target_rep_range_high',
    )
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: true });
  if (exercisesError) fail('load this workout', exercisesError);

  return {
    id: workout.id,
    mode: workout.mode,
    status: workout.status,
    estimatedDurationMinutes: workout.estimated_duration_minutes,
    exercises: (exercises ?? []).map((row) => ({
      id: row.id,
      exerciseId: row.exercise_id,
      orderIndex: row.order_index,
      targetSets: row.target_sets,
      targetRepRangeLow: row.target_rep_range_low,
      targetRepRangeHigh: row.target_rep_range_high,
    })),
  };
}

export async function logSet(
  client: MurphySupabaseClient,
  params: { workoutExerciseId: string; setNumber: number; weightKg: number | null; reps: number },
): Promise<void> {
  const { error } = await client.from('set_logs').insert({
    workout_exercise_id: params.workoutExerciseId,
    set_number: params.setNumber,
    weight_kg: params.weightKg,
    reps: params.reps,
    client_generated_id: generateClientId(),
  });
  if (error) fail('log that set', error);
}

export async function completeWorkout(
  client: MurphySupabaseClient,
  workoutId: string,
): Promise<void> {
  const { error } = await client
    .from('workouts')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', workoutId);
  if (error) fail('finish this workout', error);
}

/**
 * The caller's most recent completed set for this exercise, or null if
 * they have never completed it (remediation Part 4: only ever show a
 * genuine persisted set, never an inferred/fabricated one).
 */
export async function getPreviousPerformance(
  client: MurphySupabaseClient,
  userId: string,
  exerciseId: string,
): Promise<{ weightKg: number | null; reps: number } | null> {
  const { data: completedWorkouts, error: workoutsError } = await client
    .from('workouts')
    .select('id')
    .eq('profile_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(25);
  if (workoutsError) fail('load your previous performance', workoutsError);

  const workoutIds = (completedWorkouts ?? []).map((row) => row.id);
  if (workoutIds.length === 0) return null;

  const { data: matchingExercises, error: weError } = await client
    .from('workout_exercises')
    .select('id, workout_id')
    .eq('exercise_id', exerciseId)
    .in('workout_id', workoutIds);
  if (weError) fail('load your previous performance', weError);
  if (!matchingExercises || matchingExercises.length === 0) return null;

  const recencyRank = new Map(workoutIds.map((id, index) => [id, index]));
  const mostRecent = [...matchingExercises].sort(
    (a, b) => (recencyRank.get(a.workout_id) ?? 0) - (recencyRank.get(b.workout_id) ?? 0),
  )[0];

  const { data: setLog, error: setError } = await client
    .from('set_logs')
    .select('weight_kg, reps')
    .eq('workout_exercise_id', mostRecent.id)
    .order('set_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (setError) fail('load your previous performance', setError);
  if (!setLog) return null;

  return { weightKg: setLog.weight_kg, reps: setLog.reps };
}

export type PersonalRecordRow = {
  exerciseId: string;
  recordType: 'max_weight' | 'max_reps_at_weight' | 'estimated_1rm';
  value: number;
  achievedAt: string;
};

/** Genuine persisted PRs only, never a fabricated/example record (remediation Part 4). */
export async function getPersonalRecords(
  client: MurphySupabaseClient,
  userId: string,
): Promise<PersonalRecordRow[]> {
  const { data, error } = await client
    .from('personal_records')
    .select('exercise_id, record_type, value, achieved_at')
    .eq('profile_id', userId)
    .order('achieved_at', { ascending: false });
  if (error) fail('load your personal records', error);

  return (data ?? []).map((row) => ({
    exerciseId: row.exercise_id,
    recordType: row.record_type,
    value: row.value,
    achievedAt: row.achieved_at,
  }));
}

/**
 * Genuine count of workouts actually completed within [weekStartIso,
 * weekEndIso) (remediation Part 3: no fabricated momentum). "Planned
 * sessions this week" is not derived here, it comes directly from the
 * real programme structure's weeklyFrequencyDays, since a future day this
 * week has no workouts row until the user starts it.
 */
export async function getCompletedSessionsThisWeek(
  client: MurphySupabaseClient,
  userId: string,
  weekStartIso: string,
  weekEndIso: string,
): Promise<number> {
  const { count, error } = await client
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .eq('status', 'completed')
    .gte('scheduled_for', weekStartIso)
    .lt('scheduled_for', weekEndIso);
  if (error) fail('load your weekly progress', error);
  return count ?? 0;
}
