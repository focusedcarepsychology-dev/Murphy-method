import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { IconButton, PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ExerciseVisual } from '@/components/ui/exercise-visual';
import { LoadingState } from '@/components/ui/loading-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { StatChip } from '@/components/ui/stat-chip';
import { StatusBadge } from '@/components/ui/status-badge';
import { RestTimer } from '@/components/workout/rest-timer';
import { SetLogger } from '@/components/workout/set-logger';
import { resolveWorkoutResumeProgress } from '@/domain/workout/resume-progress';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { getExercisesByIds, type ExerciseDetail } from '@/services/exercises/exercise-repository';
import { actionFeedback, successFeedback } from '@/services/feedback/haptics';
import { createClientGeneratedId } from '@/services/training/client-id';
import {
  formatPerformance,
  loadWorkoutDetail,
  markWorkoutInProgress,
  type WorkoutDetail,
} from '@/services/training/training-repository';
import {
  cacheActiveWorkout,
  clearCachedActiveWorkout,
  loadCachedActiveWorkout,
} from '@/services/workouts/active-workout-cache';
import {
  flushPendingSetLogs,
  listPendingSetLogs,
  saveSetWithOfflineFallback,
} from '@/services/workouts/offline-set-queue';
import { saveWorkoutCompletionWithOfflineFallback } from '@/services/workouts/offline-workout-completion-queue';

const DEFAULT_REST_SECONDS = 90;

type WorkoutLoadData = {
  workout: WorkoutDetail | null;
  details: Map<string, ExerciseDetail>;
  pending: { workoutExerciseId: string; setNumber: number }[];
  source: 'server' | 'device';
  unsyncedCount: number;
};

type SyncState = 'synced' | 'saved-on-device' | 'restored-on-device';

export default function ActiveWorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const { status, data, reload } = useAuthenticatedData<WorkoutLoadData>(
    async (authClient, authenticatedUserId) => {
      const requestedWorkoutId = workoutId ?? '';
      try {
        const flushResult = await flushPendingSetLogs(authClient, authenticatedUserId);
        const workout = await loadWorkoutDetail(
          authClient,
          authenticatedUserId,
          requestedWorkoutId,
        );
        const details = workout
          ? await getExercisesByIds(
              authClient,
              workout.exercises.map((exercise) => exercise.exerciseId),
            )
          : new Map<string, ExerciseDetail>();
        if (workout) {
          await cacheActiveWorkout(authenticatedUserId, workout, details);
        }
        const pending = workout
          ? await listPendingSetLogs(
              authenticatedUserId,
              workout.exercises.map((exercise) => exercise.workoutExerciseId),
            )
          : [];
        return {
          workout,
          details,
          pending,
          source: 'server',
          unsyncedCount: Math.max(flushResult.remaining.length, pending.length),
        };
      } catch (error) {
        const cached = await loadCachedActiveWorkout(authenticatedUserId, requestedWorkoutId);
        if (!cached) throw error;
        const pending = await listPendingSetLogs(
          authenticatedUserId,
          cached.workout.exercises.map((exercise) => exercise.workoutExerciseId),
        );
        return {
          workout: cached.workout,
          details: new Map(cached.exerciseDetails.map((detail) => [detail.id, detail])),
          pending,
          source: 'device',
          unsyncedCount: pending.length,
        };
      }
    },
    [workoutId],
  );

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [completedSetCount, setCompletedSetCount] = useState(0);
  const [allSetsLogged, setAllSetsLogged] = useState(false);
  const [positionReady, setPositionReady] = useState(false);
  const [weightKg, setWeightKg] = useState(0);
  const [reps, setReps] = useState(0);
  const [resting, setResting] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const initialisedWorkoutId = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.workout || initialisedWorkoutId.current === data.workout.id) return;
    const progress = resolveWorkoutResumeProgress(data.workout.exercises, data.pending);
    setExerciseIndex(progress.exerciseIndex);
    setSetNumber(progress.setNumber);
    setCompletedSetCount(progress.completedSetCount);
    setAllSetsLogged(progress.allSetsLogged);
    setSyncState(
      data.source === 'device'
        ? 'restored-on-device'
        : data.unsyncedCount > 0
          ? 'saved-on-device'
          : 'synced',
    );
    setPositionReady(true);
    initialisedWorkoutId.current = data.workout.id;
  }, [data]);

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

  if (status === 'loading' || (status === 'ready' && data?.workout && !positionReady)) {
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
  const workoutProgress = allTargetSets > 0 ? completedSetCount / allTargetSets : 0;

  async function handleCompleteSet() {
    if (reps <= 0 || savingSet || !userId) return;
    setSaveError(null);
    setSavingSet(true);
    try {
      const result = await saveSetWithOfflineFallback(client, userId, {
        workoutExerciseId: exercise.workoutExerciseId,
        setNumber,
        weightKg: weightKg > 0 ? weightKg : null,
        reps,
        clientGeneratedId: createClientGeneratedId(),
      });
      let remaining = result === 'saved-on-device' ? 1 : 0;
      if (result === 'synced') {
        remaining = (await flushPendingSetLogs(client, userId)).remaining.length;
      }
      setSyncState(remaining > 0 ? 'saved-on-device' : 'synced');
      setCompletedSetCount((current) => Math.min(allTargetSets, current + 1));
      void actionFeedback();
      setResting(true);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setSavingSet(false);
    }
  }

  async function finishWorkout() {
    if (!userId || finishing) return;
    setFinishing(true);
    setSaveError(null);
    try {
      const result = await saveWorkoutCompletionWithOfflineFallback(client, {
        userId,
        workoutId: workout.id,
        completedAt: new Date().toISOString(),
        summary: {
          completedExercises: workout.exercises.length,
          completedSets: allTargetSets,
          durationMinutes: null,
        },
      });
      setSyncState(result === 'synced' ? 'synced' : 'saved-on-device');
      await clearCachedActiveWorkout(userId, workout.id);
      void successFeedback();
      router.replace({
        pathname: '/workout/[workoutId]/summary',
        params: { workoutId: workout.id },
      });
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Could not finish the workout.');
    } finally {
      setFinishing(false);
    }
  }

  async function handleRestComplete() {
    setResting(false);
    setWeightKg(0);
    setReps(0);
    if (setNumber < totalSets) {
      setSetNumber((current) => current + 1);
      return;
    }
    if (isLastExercise) {
      setAllSetsLogged(true);
      await finishWorkout();
      return;
    }
    setExerciseIndex((current) => current + 1);
    setSetNumber(1);
  }

  function confirmStopWorkout() {
    Alert.alert(
      'Leave workout?',
      'Completed sets stay saved on this device and sync when a connection is available.',
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

  const syncBadge =
    syncState === 'synced'
      ? { label: 'Synced', tone: 'positive' as const }
      : syncState === 'restored-on-device'
        ? { label: 'Restored from this device', tone: 'warning' as const }
        : { label: 'Saved on this device', tone: 'warning' as const };

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
          accessibilityLabel={`${completedSetCount} of ${allTargetSets} planned sets completed`}
        />
        <StatusBadge label={syncBadge.label} tone={syncBadge.tone} />
      </View>

      <View style={{ flex: 1, gap: spacing.three, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: spacing.two }}>
          {detail?.visualKey ? <ExerciseVisual poseKey={detail.visualKey} size={112} /> : null}
          <View style={{ width: '100%', minWidth: 0, gap: spacing.one, alignItems: 'center' }}>
            <Heading variant="hero" align="center" style={{ flexShrink: 1 }}>
              {detail?.name ?? exercise.name}
            </Heading>
            <AppText color="secondary">
              {allSetsLogged ? 'All prescribed sets logged' : `Set ${setNumber} of ${totalSets}`}
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
            label={`Target: ${exercise.targetRepRangeLow} to ${exercise.targetRepRangeHigh} reps`}
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

        {allSetsLogged ? (
          <Card variant="hero" elevated={false} style={{ gap: spacing.two }}>
            <Heading variant="section" align="center">
              Ready to finish
            </Heading>
            <AppText color="secondary" align="center">
              Every prescribed set is saved. Finish now to update Progress and Momentum Points.
            </AppText>
            <PrimaryButton label="Finish workout" loading={finishing} onPress={finishWorkout} />
          </Card>
        ) : resting ? (
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
