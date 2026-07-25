import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MurphySupabaseClient } from '@/services/supabase/client';
import {
  logSet,
  TrainingRepositoryError,
  type LogSetInput,
} from '@/services/training/training-repository';
import {
  clearPendingSetLogsForTests,
  enqueuePendingSetLog,
  flushPendingSetLogs,
  listPendingSetLogs,
  saveSetWithOfflineFallback,
} from '@/services/workouts/offline-set-queue';

jest.mock('@/services/training/training-repository', () => {
  const actual = jest.requireActual('@/services/training/training-repository');
  return { ...actual, logSet: jest.fn() };
});

const client = {} as MurphySupabaseClient;
const input: LogSetInput = {
  workoutExerciseId: 'exercise-row-1',
  setNumber: 1,
  weightKg: 20,
  reps: 10,
  clientGeneratedId: '11111111-1111-4111-8111-111111111111',
};

describe('offline set queue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await clearPendingSetLogsForTests();
  });

  it('returns synced without writing a local queue when the server accepts the set', async () => {
    jest.mocked(logSet).mockResolvedValueOnce(undefined);

    await expect(saveSetWithOfflineFallback(client, 'user-1', input)).resolves.toBe('synced');
    await expect(listPendingSetLogs('user-1')).resolves.toEqual([]);
  });

  it('durably queues a set when the network request fails', async () => {
    jest.mocked(logSet).mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(saveSetWithOfflineFallback(client, 'user-1', input)).resolves.toBe(
      'saved-on-device',
    );

    expect(await listPendingSetLogs('user-1')).toEqual([
      expect.objectContaining({
        ...input,
        userId: 'user-1',
      }),
    ]);
  });

  it('coalesces retries carrying the same client-generated id', async () => {
    await enqueuePendingSetLog('user-1', input);
    await enqueuePendingSetLog('user-1', { ...input, reps: 12 });

    expect(await listPendingSetLogs('user-1')).toEqual([
      expect.objectContaining({ reps: 12, clientGeneratedId: input.clientGeneratedId }),
    ]);
  });

  it('replays queued sets with the same id and removes successful entries', async () => {
    await enqueuePendingSetLog('user-1', input);
    jest.mocked(logSet).mockResolvedValueOnce(undefined);

    await expect(flushPendingSetLogs(client, 'user-1')).resolves.toEqual({
      syncedCount: 1,
      remaining: [],
    });
    await expect(listPendingSetLogs('user-1')).resolves.toEqual([]);
    expect(logSet).toHaveBeenCalledWith(client, expect.objectContaining(input));
  });

  it('does not hide a non-retryable permission or validation error in the queue', async () => {
    jest
      .mocked(logSet)
      .mockRejectedValueOnce(
        new TrainingRepositoryError('Could not save', { code: '42501', message: 'not permitted' }),
      );

    await expect(saveSetWithOfflineFallback(client, 'user-1', input)).rejects.toThrow(
      'Could not save',
    );
    await expect(listPendingSetLogs('user-1')).resolves.toEqual([]);
  });
});
