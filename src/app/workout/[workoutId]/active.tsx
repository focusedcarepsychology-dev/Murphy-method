import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { StatChip } from '@/components/ui/stat-chip';
import { RestTimer } from '@/components/workout/rest-timer';
import { SetLogger } from '@/components/workout/set-logger';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { createClientGeneratedId } from '@/services/training/client-id';
import {
  formatPerformance,
  loadWorkoutDetail,
  logSet,
  markWorkoutCompleted,
  markWorkoutInProgress,
} from '@/services/training/training-repository';

const DEFAULT_REST_SECONDS = 90;

export default function ActiveWorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { spacing } = useTheme();
  const { client } = useAuthenticatedClient();

  const { status, data, reload } = useAuthenticatedData(
    (c, userId) => loadWorkoutDetail(c, userId, workoutId ?? ''),
    [workoutId],
  );

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [weightKg, setWeightKg] = useState(0);
  const [reps, setReps] = useState(0);
  const [resting, setResting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startedWorkoutId = data?.status === 'planned' ? data.id : null;
  useEffect(() => {
    if (!startedWorkoutId) return;
    markWorkoutInProgress(client, startedWorkoutId).catch(() => {
      // A failed status flip is not worth blocking training over — the
      // sets themselves are what carry the user's real data.
    });
  }, [client, startedWorkoutId]);

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading this session" rows={4} />
      </ScrollScreen>
    );
  }

  if (status === 'error') {
    return (
      <ScrollScreen>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  if (!data || data.exercises.length === 0) {
    return (
      <ScrollScreen>
        <Card>
          <EmptyState
            icon="alertCircle"
            title="Nothing to train here"
            description="This session has no exercises on it."
            actionLabel="Back to Today"
            onAction={() => router.replace('/(tabs)/today')}
          />
        </Card>
      </ScrollScreen>
    );
  }

  const workout = data;
  const exercise = workout.exercises[Math.min(exerciseIndex, workout.exercises.length - 1)];
  const totalSets = exercise.targetSets;
  const isLastExercise = exerciseIndex >= workout.exercises.length - 1;

  async function handleCompleteSet() {
    setSaveError(null);
    try {
      await logSet(client, {
        workoutExerciseId: exercise.workoutExerciseId,
        setNumber,
        weightKg: weightKg > 0 ? weightKg : null,
        reps,
        clientGeneratedId: createClientGeneratedId(),
      });
      setResting(true);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Something went wrong.');
    }
  }

  async function handleRestComplete() {
    setResting(false);
    if (setNumber < totalSets) {
      setSetNumber((current) => current + 1);
      return;
    }
    if (isLastExercise) {
      await markWorkoutCompleted(client, workout.id).catch(() => undefined);
      router.replace({
        pathname: '/workout/[workoutId]/summary',
        params: { workoutId: workout.id },
      });
      return;
    }
    setExerciseIndex((current) => current + 1);
    setSetNumber(1);
  }

  function confirmStopWorkout() {
    Alert.alert('Stop workout?', 'Your progress so far will still be saved.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Stop workout',
        style: 'destructive',
        onPress: () => router.replace('/(tabs)/today'),
      },
    ]);
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="close" accessibilityLabel="Stop workout" onPress={confirmStopWorkout} />
        <Caption>
          EXERCISE {exerciseIndex + 1} OF {workout.exercises.length}
        </Caption>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1, gap: spacing.four, justifyContent: 'center' }}>
        <View style={{ gap: spacing.one }}>
          <Heading variant="hero">{exercise.name}</Heading>
          <AppText color="secondary">
            Set {setNumber} of {totalSets}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.two }}>
          <StatChip
            label={`Target: ${exercise.targetRepRangeLow}–${exercise.targetRepRangeHigh} reps`}
            icon="checkCircle"
          />
          {exercise.previous ? (
            <StatChip
              label={`Previous: ${formatPerformance(exercise.previous.weightKg, exercise.previous.reps)}`}
              icon="history"
            />
          ) : null}
        </View>

        {saveError ? <AppText color="critical">{saveError}</AppText> : null}

        {resting ? (
          <Card>
            <RestTimer
              totalSeconds={DEFAULT_REST_SECONDS}
              onComplete={() => {
                void handleRestComplete();
              }}
            />
          </Card>
        ) : (
          <SetLogger
            weightKg={weightKg}
            reps={reps}
            onChangeWeight={setWeightKg}
            onChangeReps={setReps}
            onCompleteSet={() => {
              void handleCompleteSet();
            }}
          />
        )}
      </View>
    </Screen>
  );
}
