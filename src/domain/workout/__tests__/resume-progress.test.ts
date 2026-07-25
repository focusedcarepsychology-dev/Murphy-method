import { resolveWorkoutResumeProgress } from '@/domain/workout/resume-progress';

const exercises = [
  { workoutExerciseId: 'exercise-1', targetSets: 3, loggedSetNumbers: [1, 2] },
  { workoutExerciseId: 'exercise-2', targetSets: 2, loggedSetNumbers: [] },
];

describe('resolveWorkoutResumeProgress', () => {
  it('resumes at the first missing synced set', () => {
    expect(resolveWorkoutResumeProgress(exercises)).toEqual({
      exerciseIndex: 0,
      setNumber: 3,
      completedSetCount: 2,
      allSetsLogged: false,
    });
  });

  it('counts locally queued sets when choosing where to resume', () => {
    expect(
      resolveWorkoutResumeProgress(exercises, [
        { workoutExerciseId: 'exercise-1', setNumber: 3 },
      ]),
    ).toEqual({
      exerciseIndex: 1,
      setNumber: 1,
      completedSetCount: 3,
      allSetsLogged: false,
    });
  });

  it('does not double-count the same synced and queued set number', () => {
    expect(
      resolveWorkoutResumeProgress(exercises, [
        { workoutExerciseId: 'exercise-1', setNumber: 2 },
      ]),
    ).toEqual({
      exerciseIndex: 0,
      setNumber: 3,
      completedSetCount: 2,
      allSetsLogged: false,
    });
  });

  it('reports when every prescribed set has been logged', () => {
    expect(
      resolveWorkoutResumeProgress(
        [
          { workoutExerciseId: 'exercise-1', targetSets: 2, loggedSetNumbers: [1, 2] },
          { workoutExerciseId: 'exercise-2', targetSets: 1, loggedSetNumbers: [1] },
        ],
        [],
      ),
    ).toEqual({
      exerciseIndex: 1,
      setNumber: 1,
      completedSetCount: 3,
      allSetsLogged: true,
    });
  });
});
