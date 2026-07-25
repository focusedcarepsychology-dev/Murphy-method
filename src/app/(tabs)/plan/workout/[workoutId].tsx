import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ExerciseCard } from '@/components/ui/exercise-card';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { formatPerformance, loadWorkoutDetail } from '@/services/training/training-repository';

export default function PlanWorkoutDetailScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(
    (client, userId) => loadWorkoutDetail(client, userId, workoutId ?? ''),
    [workoutId],
  );

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

  if (!data) {
    return (
      <ScrollScreen>
        <Card>
          <EmptyState
            icon="alertCircle"
            title="Session not found"
            description="This session is no longer on your plan."
          />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: 'Session' }} />
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Your session</Heading>
        <AppText color="secondary">
          {data.estimatedDurationMinutes ? `${data.estimatedDurationMinutes} min · ` : ''}
          {data.exercises.length} {data.exercises.length === 1 ? 'exercise' : 'exercises'}
        </AppText>
      </View>
      <View style={{ gap: spacing.two }}>
        {data.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.workoutExerciseId}
            name={exercise.name}
            targetSets={exercise.targetSets}
            targetReps={`${exercise.targetRepRangeLow}–${exercise.targetRepRangeHigh}`}
            previous={
              exercise.previous
                ? formatPerformance(exercise.previous.weightKg, exercise.previous.reps)
                : undefined
            }
            onPress={() =>
              router.push({
                pathname: '/(tabs)/plan/exercise/[exerciseId]',
                params: { exerciseId: exercise.exerciseId },
              })
            }
          />
        ))}
      </View>
    </ScrollScreen>
  );
}
