import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Caption, Heading } from '@/components/ui/app-text';
import { ExerciseCard } from '@/components/ui/exercise-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { previewTodayWorkout, previewWorkoutExercises } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function PlanWorkoutDetailScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: previewTodayWorkout.title }} />
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">{previewTodayWorkout.title}</Heading>
        <Caption>
          {previewTodayWorkout.durationMinutes} min · {previewWorkoutExercises.length} exercises
        </Caption>
      </View>
      <View style={{ gap: spacing.two }}>
        {previewWorkoutExercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.name}
            name={exercise.name}
            targetSets={exercise.targetSets}
            targetReps={exercise.targetReps}
            previous={exercise.previous}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/plan/exercise/[exerciseId]',
                params: { exerciseId: `${workoutId}-${index}`, name: exercise.name },
              })
            }
          />
        ))}
      </View>
    </ScrollScreen>
  );
}
