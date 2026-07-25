import {
  clearPendingWorkoutCompletionsForTests,
  listPendingWorkoutCompletions,
  saveWorkoutCompletionWithOfflineFallback,
} from '@/services/workouts/offline-workout-completion-queue';

const completion = {
  userId: 'user-1',
  workoutId: 'workout-1',
  completedAt: '2026-07-25T10:00:00.000Z',
  summary: { completedExercises: 2, completedSets: 5, durationMinutes: 20 },
};

function clientWithError(error: unknown) {
  return {
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ data: null, error }),
      }),
    }),
  } as any;
}

describe('offline workout completion queue', () => {
  beforeEach(clearPendingWorkoutCompletionsForTests);

  it('durably queues a completion after a retryable connection failure', async () => {
    const result = await saveWorkoutCompletionWithOfflineFallback(
      clientWithError({ message: 'network request failed' }),
      completion,
    );

    expect(result).toBe('saved-on-device');
    expect(await listPendingWorkoutCompletions('user-1')).toEqual([completion]);
  });
});
