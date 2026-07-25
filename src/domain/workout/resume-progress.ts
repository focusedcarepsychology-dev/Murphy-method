export type ResumeExercise = {
  workoutExerciseId: string;
  targetSets: number;
  loggedSetNumbers: readonly number[];
};

export type PendingSetReference = {
  workoutExerciseId: string;
  setNumber: number;
};

export type WorkoutResumeProgress = {
  exerciseIndex: number;
  setNumber: number;
  completedSetCount: number;
  allSetsLogged: boolean;
};

function completedSetsForExercise(
  exercise: ResumeExercise,
  pending: readonly PendingSetReference[],
): Set<number> {
  const completed = new Set(
    exercise.loggedSetNumbers.filter(
      (setNumber) => Number.isInteger(setNumber) && setNumber >= 1 && setNumber <= exercise.targetSets,
    ),
  );

  for (const item of pending) {
    if (
      item.workoutExerciseId === exercise.workoutExerciseId &&
      Number.isInteger(item.setNumber) &&
      item.setNumber >= 1 &&
      item.setNumber <= exercise.targetSets
    ) {
      completed.add(item.setNumber);
    }
  }

  return completed;
}

/** Finds the first genuinely unfinished set using synced and queued logs. */
export function resolveWorkoutResumeProgress(
  exercises: readonly ResumeExercise[],
  pending: readonly PendingSetReference[] = [],
): WorkoutResumeProgress {
  if (exercises.length === 0) {
    return { exerciseIndex: 0, setNumber: 1, completedSetCount: 0, allSetsLogged: false };
  }

  let completedSetCount = 0;

  for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
    const exercise = exercises[exerciseIndex];
    const completed = completedSetsForExercise(exercise, pending);
    completedSetCount += completed.size;

    for (let setNumber = 1; setNumber <= exercise.targetSets; setNumber += 1) {
      if (!completed.has(setNumber)) {
        return { exerciseIndex, setNumber, completedSetCount, allSetsLogged: false };
      }
    }
  }

  const finalExercise = exercises[exercises.length - 1];
  return {
    exerciseIndex: exercises.length - 1,
    setNumber: Math.max(1, finalExercise.targetSets),
    completedSetCount,
    allSetsLogged: true,
  };
}
