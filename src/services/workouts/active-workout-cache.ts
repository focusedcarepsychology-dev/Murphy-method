import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ExerciseDetail } from '@/services/exercises/exercise-repository';
import type { WorkoutDetail } from '@/services/training/training-repository';

const STORAGE_KEY = '@murphy-method/active-workout-cache/v1';

export type CachedActiveWorkout = {
  userId: string;
  workoutId: string;
  workout: WorkoutDetail;
  exerciseDetails: ExerciseDetail[];
  cachedAt: string;
};

function isCachedActiveWorkout(value: unknown): value is CachedActiveWorkout {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CachedActiveWorkout>;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.workoutId === 'string' &&
    typeof candidate.cachedAt === 'string' &&
    Boolean(candidate.workout) &&
    Array.isArray(candidate.exerciseDetails)
  );
}

async function readAll(): Promise<CachedActiveWorkout[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isCachedActiveWorkout) : [];
  } catch {
    return [];
  }
}

async function writeAll(items: CachedActiveWorkout[]): Promise<void> {
  if (items.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function cacheActiveWorkout(
  userId: string,
  workout: WorkoutDetail,
  details: ReadonlyMap<string, ExerciseDetail>,
): Promise<void> {
  const items = await readAll();
  const next: CachedActiveWorkout = {
    userId,
    workoutId: workout.id,
    workout,
    exerciseDetails: Array.from(details.values()),
    cachedAt: new Date().toISOString(),
  };
  const index = items.findIndex((item) => item.userId === userId && item.workoutId === workout.id);
  if (index >= 0) items[index] = next;
  else items.push(next);
  await writeAll(items);
}

export async function loadCachedActiveWorkout(
  userId: string,
  workoutId: string,
): Promise<CachedActiveWorkout | null> {
  const items = await readAll();
  return items.find((item) => item.userId === userId && item.workoutId === workoutId) ?? null;
}

export async function clearCachedActiveWorkout(userId: string, workoutId: string): Promise<void> {
  const items = await readAll();
  await writeAll(items.filter((item) => item.userId !== userId || item.workoutId !== workoutId));
}

export async function clearAllActiveWorkoutCache(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export const clearActiveWorkoutCacheForTests = clearAllActiveWorkoutCache;
