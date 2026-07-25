import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MurphySupabaseClient } from '@/services/supabase/client';
import {
  logSet,
  TrainingRepositoryError,
  type LogSetInput,
} from '@/services/training/training-repository';

const STORAGE_KEY = '@murphy-method/pending-set-logs/v1';

export type PendingSetLog = LogSetInput & {
  userId: string;
  queuedAt: string;
};

export type SetSaveResult = 'synced' | 'saved-on-device';

async function readQueue(): Promise<PendingSetLog[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is PendingSetLog => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Partial<PendingSetLog>;
      return (
        typeof candidate.userId === 'string' &&
        typeof candidate.workoutExerciseId === 'string' &&
        typeof candidate.setNumber === 'number' &&
        (typeof candidate.weightKg === 'number' || candidate.weightKg === null) &&
        typeof candidate.reps === 'number' &&
        typeof candidate.clientGeneratedId === 'string' &&
        typeof candidate.queuedAt === 'string'
      );
    });
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingSetLog[]): Promise<void> {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function retryableCause(error: unknown): unknown {
  return error instanceof TrainingRepositoryError ? error.cause : error;
}

export function isRetryableSetLogError(error: unknown): boolean {
  const cause = retryableCause(error);
  if (cause instanceof TypeError) return true;

  const candidate = cause as
    | { message?: unknown; code?: unknown; status?: unknown; statusCode?: unknown }
    | null
    | undefined;
  const message = typeof candidate?.message === 'string' ? candidate.message.toLowerCase() : '';
  const code = typeof candidate?.code === 'string' ? candidate.code : '';
  const status =
    typeof candidate?.status === 'number'
      ? candidate.status
      : typeof candidate?.statusCode === 'number'
        ? candidate.statusCode
        : null;

  return (
    /network|fetch|offline|connection|timeout|timed out|socket/.test(message) ||
    code.startsWith('08') ||
    code === 'PGRST000' ||
    (status !== null && status >= 500)
  );
}

export async function listPendingSetLogs(
  userId: string,
  workoutExerciseIds?: readonly string[],
): Promise<PendingSetLog[]> {
  const allowed = workoutExerciseIds ? new Set(workoutExerciseIds) : null;
  return (await readQueue()).filter(
    (item) => item.userId === userId && (!allowed || allowed.has(item.workoutExerciseId)),
  );
}

export async function enqueuePendingSetLog(userId: string, input: LogSetInput): Promise<void> {
  const queue = await readQueue();
  const next: PendingSetLog = { ...input, userId, queuedAt: new Date().toISOString() };
  const existingIndex = queue.findIndex(
    (item) => item.userId === userId && item.clientGeneratedId === input.clientGeneratedId,
  );

  if (existingIndex >= 0) queue[existingIndex] = next;
  else queue.push(next);

  await writeQueue(queue);
}

export async function saveSetWithOfflineFallback(
  client: MurphySupabaseClient,
  userId: string,
  input: LogSetInput,
): Promise<SetSaveResult> {
  try {
    await logSet(client, input);
    return 'synced';
  } catch (error) {
    if (!isRetryableSetLogError(error)) throw error;
    await enqueuePendingSetLog(userId, input);
    return 'saved-on-device';
  }
}

export async function flushPendingSetLogs(
  client: MurphySupabaseClient,
  userId: string,
): Promise<{ syncedCount: number; remaining: PendingSetLog[] }> {
  const queue = await readQueue();
  const retained: PendingSetLog[] = [];
  let syncedCount = 0;

  for (const item of queue) {
    if (item.userId !== userId) {
      retained.push(item);
      continue;
    }

    try {
      await logSet(client, item);
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

export async function clearAllPendingSetLogs(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export const clearPendingSetLogsForTests = clearAllPendingSetLogs;
