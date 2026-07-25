import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ExerciseCard } from '@/components/ui/exercise-card';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { getExercisesByIds } from '@/services/exercises/exercise-repository';
import { formatPerformance, loadWorkoutDetail } from '@/services/training/training-repository';

export default function WorkoutOverviewScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(
    async (client, userId) => {
      const workout = await loadWorkoutDetail(client, userId, workoutId ?? '');
      const details = workout
        ? await getExercisesByIds(
            client,
            workout.exercises.map((exercise) => exercise.exerciseId),
          )
        : new Map();
      return { workout, details };
    },
    [workoutId],
  );

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

  if (!data.workout) {
    return (
      <ScrollScreen>
        <Card>
          <EmptyState
            icon="alertCircle"
            title="Session not found"
            description="This session is no longer available on your plan."
            actionLabel="Back to Today"
            onAction={() => router.replace('/(tabs)/today')}
          />
        </Card>
      </ScrollScreen>
    );
  }

  const workout = data.workout;

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Your session</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          {[
            workout.estimatedDurationMinutes
              ? `${workout.estimatedDurationMinutes} min`
              : null,
            `${workout.exercises.length} ${
              workout.exercises.length === 1 ? 'exercise' : 'exercises'
            }`,
            workout.mode === 'full'
              ? 'Full version'
              : workout.mode === 'quick'
                ? 'Quick version'
                : 'Minimum version',
          ]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      </View>

      <View style={{ gap: spacing.two }}>
        {workout.exercises.map((exercise) => {
          const detail = data.details.get(exercise.exerciseId);
          return (
            <ExerciseCard
              key={exercise.workoutExerciseId}
              name={detail?.name ?? exercise.name}
              targetSets={exercise.targetSets}
              targetReps={`${exercise.targetRepRangeLow}–${exercise.targetRepRangeHigh} reps`}
              previous={
                exercise.previous
                  ? formatPerformance(exercise.previous.weightKg, exercise.previous.reps)
                  : undefined
              }
              description={detail?.description}
              visualKey={detail?.visualKey}
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
          );
        })}
      </View>

      <PrimaryButton
        label={workout.status === 'in_progress' ? 'Resume Workout' : 'Start Workout'}
        size="large"
        onPress={() =>
          router.replace({
            pathname: '/workout/[workoutId]/active',
            params: { workoutId: workout.id },
          })
        }
      />
    </ScrollScreen>
  );
}
