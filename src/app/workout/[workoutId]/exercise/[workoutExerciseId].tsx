import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ExerciseVisual } from '@/components/ui/exercise-visual';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { getExerciseById } from '@/services/exercises/exercise-repository';
import { loadWorkoutDetail } from '@/services/training/training-repository';

function InstructionList({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.two }}>
      {items.map((item, index) => (
        <View key={`${index}-${item}`} style={{ flexDirection: 'row', gap: spacing.two }}>
          <AppText variant="bodyEmphasis">{numbered ? `${index + 1}.` : '•'}</AppText>
          <AppText style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>{item}</AppText>
        </View>
      ))}
    </View>
  );
}

export default function WorkoutExerciseScreen() {
  const { workoutId, workoutExerciseId } = useLocalSearchParams<{
    workoutId: string;
    workoutExerciseId: string;
  }>();
  const router = useRouter();
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(
    async (client, userId) => {
      const workout = await loadWorkoutDetail(client, userId, workoutId ?? '');
      const workoutExercise =
        workout?.exercises.find((item) => item.workoutExerciseId === workoutExerciseId) ?? null;
      const exercise = workoutExercise
        ? await getExerciseById(client, workoutExercise.exerciseId)
        : null;
      return { workout, workoutExercise, exercise };
    },
    [workoutId, workoutExerciseId],
  );

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading exercise instructions" rows={5} />
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

  if (!data.workout || !data.workoutExercise || !data.exercise) {
    return (
      <ScrollScreen>
        <Card>
          <EmptyState
            icon="alertCircle"
            title="Exercise not found"
            description="This exercise is no longer part of the selected workout."
            actionLabel="Back to Today"
            onAction={() => router.replace('/(tabs)/today')}
          />
        </Card>
      </ScrollScreen>
    );
  }

  const exercise = data.exercise;

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.two }}>
        <Heading variant="title" style={{ flexShrink: 1 }}>
          {exercise.name}
        </Heading>
        {exercise.visualKey ? (
          <View style={{ alignItems: 'center' }}>
            <ExerciseVisual poseKey={exercise.visualKey} size={180} />
          </View>
        ) : null}
        {exercise.description ? (
          <AppText color="secondary" style={{ flexShrink: 1 }}>
            {exercise.description}
          </AppText>
        ) : null}
      </View>

      <Card style={{ gap: spacing.one }}>
        <Caption>TARGET IN THIS WORKOUT</Caption>
        <AppText variant="bodyEmphasis" style={{ flexShrink: 1 }}>
          {data.workoutExercise.targetSets} sets · {data.workoutExercise.targetRepRangeLow} to{' '}
          {data.workoutExercise.targetRepRangeHigh} reps
        </AppText>
      </Card>

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="Starting position" />
        <Card>
          <AppText style={{ flexShrink: 1 }}>
            {exercise.startingPosition ?? 'Follow the first instruction to set up safely.'}
          </AppText>
        </Card>
      </View>

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="How to do it" />
        <Card>
          {exercise.instructions.length > 0 ? (
            <InstructionList items={exercise.instructions} numbered />
          ) : (
            <Caption>Detailed instructions are not available for this exercise yet.</Caption>
          )}
        </Card>
      </View>

      {exercise.coachingCues.length > 0 ? (
        <View style={{ gap: spacing.two }}>
          <SectionHeader title="Helpful cues" />
          <Card>
            <InstructionList items={exercise.coachingCues} />
          </Card>
        </View>
      ) : null}

      {exercise.commonMistakes.length > 0 ? (
        <View style={{ gap: spacing.two }}>
          <SectionHeader title="Common mistakes" />
          <Card>
            <InstructionList items={exercise.commonMistakes} />
          </Card>
        </View>
      ) : null}

      <PrimaryButton
        label="Continue workout"
        size="large"
        onPress={() =>
          router.replace({
            pathname: '/workout/[workoutId]/active',
            params: { workoutId: data.workout!.id },
          })
        }
      />

      <Caption color="tertiary" style={{ flexShrink: 1 }}>
        Stop if you feel sharp pain, dizziness or unusual shortness of breath.
      </Caption>
    </ScrollScreen>
  );
}
