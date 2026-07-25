import {
  cacheActiveWorkout,
  clearActiveWorkoutCacheForTests,
  loadCachedActiveWorkout,
} from '@/services/workouts/active-workout-cache';

const workout = {
  id: 'workout-1',
  mode: 'quick' as const,
  status: 'in_progress' as const,
  scheduledFor: '2026-07-25',
  estimatedDurationMinutes: 20,
  programmeVersionId: 'version-1',
  exercises: [],
};

describe('active workout cache', () => {
  beforeEach(clearActiveWorkoutCacheForTests);

  it('restores only the matching user and workout', async () => {
    await cacheActiveWorkout('user-1', workout, new Map());

    expect((await loadCachedActiveWorkout('user-1', 'workout-1'))?.workout.id).toBe('workout-1');
    expect(await loadCachedActiveWorkout('user-2', 'workout-1')).toBeNull();
  });
});
