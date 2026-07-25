import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MurphySupabaseClient } from '@/services/supabase/client';
import { markWorkoutCompleted, type WorkoutSummary } from '@/services/training/training-repository';
import { isRetryableSetLogError } from '@/services/workouts/offline-set-queue';

const STORAGE_KEY = '@murphy-method/pending-workout-completions/v1';

export type PendingWorkoutCompletion = {
  userId: string;
  workoutId: string;
  completedAt: string;
  summary: WorkoutSummary;
};

function isPendingCompletion(value: unknown): value is PendingWorkoutCompletion {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PendingWorkoutCompletion>;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.workoutId === 'string' &&
    typeof candidate.completedAt === 'string' &&
    Boolean(candidate.summary) &&
    typeof candidate.summary?.completedExercises === 'number' &&
    typeof candidate.summary?.completedSets === 'number'
  );
}

async function readQueue(): Promise<PendingWorkoutCompletion[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isPendingCompletion) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: PendingWorkoutCompletion[]): Promise<void> {
  if (items.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function listPendingWorkoutCompletions(
  userId: string,
): Promise<PendingWorkoutCompletion[]> {
  return (await readQueue()).filter((item) => item.userId === userId);
}

export async function loadPendingWorkoutCompletion(
  userId: string,
  workoutId: string,
): Promise<PendingWorkoutCompletion | null> {
  return (
    (await readQueue()).find((item) => item.userId === userId && item.workoutId === workoutId) ??
    null
  );
}

export async function saveWorkoutCompletionWithOfflineFallback(
  client: MurphySupabaseClient,
  input: PendingWorkoutCompletion,
): Promise<'synced' | 'saved-on-device'> {
  try {
    await markWorkoutCompleted(client, input.workoutId);
    const queue = await readQueue();
    await writeQueue(
      queue.filter((item) => item.userId !== input.userId || item.workoutId !== input.workoutId),
    );
    return 'synced';
  } catch (error) {
    if (!isRetryableSetLogError(error)) throw error;
    const queue = await readQueue();
    const index = queue.findIndex(
      (item) => item.userId === input.userId && item.workoutId === input.workoutId,
    );
    if (index >= 0) queue[index] = input;
    else queue.push(input);
    await writeQueue(queue);
    return 'saved-on-device';
  }
}

export async function flushPendingWorkoutCompletions(
  client: MurphySupabaseClient,
  userId: string,
): Promise<{ syncedCount: number; remaining: PendingWorkoutCompletion[] }> {
  const queue = await readQueue();
  const retained: PendingWorkoutCompletion[] = [];
  let syncedCount = 0;

  for (const item of queue) {
    if (item.userId !== userId) {
      retained.push(item);
      continue;
    }
    try {
      await markWorkoutCompleted(client, item.workoutId);
      syncedCount += 1;
    } catch {
      retained.push(item);
    }
  }

  await writeQueue(retained);
  return {
    syncedCount,
    remaining: retained.filter((item) => item.userId === userId),
  };
}

export async function clearAllPendingWorkoutCompletions(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export const clearPendingWorkoutCompletionsForTests = clearAllPendingWorkoutCompletions;
