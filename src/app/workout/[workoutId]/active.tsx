import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { IconButton, SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ExerciseVisual } from '@/components/ui/exercise-visual';
import { LoadingState } from '@/components/ui/loading-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { StatChip } from '@/components/ui/stat-chip';
import { RestTimer } from '@/components/workout/rest-timer';
import { SetLogger } from '@/components/workout/set-logger';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { getExercisesByIds } from '@/services/exercises/exercise-repository';
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
    async (authClient, userId) => {
      const workout = await loadWorkoutDetail(authClient, userId, workoutId ?? '');
      const details = workout
        ? await getExercisesByIds(
            authClient,
            workout.exercises.map((exercise) => exercise.exerciseId),
          )
        : new Map();
      return { workout, details };
    },
    [workoutId],
  );

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [weightKg, setWeightKg] = useState(0);
  const [reps, setReps] = useState(0);
  const [resting, setResting] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startedWorkoutId = data?.workout?.status === 'planned' ? data.workout.id : null;
  useEffect(() => {
    if (!startedWorkoutId) return;
    markWorkoutInProgress(client, startedWorkoutId).catch(() => undefined);
  }, [client, startedWorkoutId]);

  const completedWorkoutId = data?.workout?.status === 'completed' ? data.workout.id : null;
  useEffect(() => {
    if (!completedWorkoutId) return;
    router.replace({
      pathname: '/workout/[workoutId]/summary',
      params: { workoutId: completedWorkoutId },
    });
  }, [completedWorkoutId, router]);

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading this session" rows={4} />
      </ScrollScreen>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ScrollScreen>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  if (!data.workout || data.workout.exercises.length === 0) {
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

  const workout = data.workout;
  const exercise = workout.exercises[Math.min(exerciseIndex, workout.exercises.length - 1)];
  const detail = data.details.get(exercise.exerciseId);
  const totalSets = exercise.targetSets;
  const isLastExercise = exerciseIndex >= workout.exercises.length - 1;
  const allTargetSets = workout.exercises.reduce((total, item) => total + item.targetSets, 0);
  const completedBeforeCurrentExercise = workout.exercises
    .slice(0, exerciseIndex)
    .reduce((total, item) => total + item.targetSets, 0);
  const completedSetPosition = completedBeforeCurrentExercise + Math.max(0, setNumber - 1);
  const workoutProgress = allTargetSets > 0 ? completedSetPosition / allTargetSets : 0;

  async function handleCompleteSet() {
    if (reps <= 0 || savingSet) return;
    setSaveError(null);
    setSavingSet(true);
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
    } finally {
      setSavingSet(false);
    }
  }

  async function handleRestComplete() {
    setResting(false);
    if (setNumber < totalSets) {
      setSetNumber((current) => current + 1);
      return;
    }
    if (isLastExercise) {
      try {
        await markWorkoutCompleted(client, workout.id);
        router.replace({
          pathname: '/workout/[workoutId]/summary',
          params: { workoutId: workout.id },
        });
      } catch (caught) {
        setSaveError(caught instanceof Error ? caught.message : 'Could not finish the workout.');
      }
      return;
    }
    setExerciseIndex((current) => current + 1);
    setSetNumber(1);
    setWeightKg(0);
    setReps(0);
  }

  function confirmStopWorkout() {
    Alert.alert(
      'Leave workout?',
      'Completed sets remain saved and you can resume this workout later.',
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Leave workout',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)/today'),
        },
      ],
    );
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ gap: spacing.two }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <IconButton
            icon="close"
            accessibilityLabel="Leave workout"
            onPress={confirmStopWorkout}
          />
          <Caption>
            EXERCISE {exerciseIndex + 1} OF {workout.exercises.length}
          </Caption>
          <View style={{ width: 44 }} />
        </View>
        <ProgressBar
          value={workoutProgress}
          accessibilityLabel={`${completedSetPosition} of ${allTargetSets} planned sets reached`}
        />
      </View>

      <View style={{ flex: 1, gap: spacing.three, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: spacing.two }}>
          {detail?.visualKey ? <ExerciseVisual poseKey={detail.visualKey} size={112} /> : null}
          <View style={{ width: '100%', minWidth: 0, gap: spacing.one, alignItems: 'center' }}>
            <Heading variant="hero" align="center" style={{ flexShrink: 1 }}>
              {detail?.name ?? exercise.name}
            </Heading>
            <AppText color="secondary">
              Set {setNumber} of {totalSets}
            </AppText>
          </View>
        </View>

        {detail?.description ? (
          <AppText color="secondary" align="center" style={{ flexShrink: 1 }}>
            {detail.description}
          </AppText>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: spacing.two,
          }}
        >
          <StatChip
            label={`Target: ${exercise.targetRepRangeLow}–${exercise.targetRepRangeHigh} reps`}
            icon="checkCircle"
          />
          {exercise.previous ? (
            <StatChip
              label={`Previous: ${formatPerformance(
                exercise.previous.weightKg,
                exercise.previous.reps,
              )}`}
              icon="history"
            />
          ) : null}
        </View>

        <SecondaryButton
          label="View instructions"
          fullWidth={false}
          containerStyle={{ alignSelf: 'center' }}
          onPress={() =>
            router.push({
              pathname: '/workout/[workoutId]/exercise/[workoutExerciseId]',
              params: {
                workoutId: workout.id,
                workoutExerciseId: exercise.workoutExerciseId,
              },
            })
          }
        />

        {saveError ? (
          <AppText
            color="critical"
            align="center"
            accessibilityLiveRegion="polite"
            style={{ flexShrink: 1 }}
          >
            {saveError}
          </AppText>
        ) : null}

        {resting ? (
          <Card variant="hero" elevated={false}>
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
            saving={savingSet}
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
