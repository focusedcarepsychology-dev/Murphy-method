import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { ExerciseCard } from '@/components/ui/exercise-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { previewTodayWorkout, previewWorkoutExercises } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'full' | 'quick' | 'minimum';

const durationByMode: Record<Mode, number> = {
  full: previewTodayWorkout.durationMinutes,
  quick: previewTodayWorkout.quickDurationMinutes,
  minimum: previewTodayWorkout.minimumDurationMinutes,
};

export default function WorkoutOverviewScreen() {
  const { workoutId, mode: initialMode } = useLocalSearchParams<{
    workoutId: string;
    mode?: Mode;
  }>();
  const router = useRouter();
  const { spacing } = useTheme();
  const [mode, setMode] = useState<Mode>(initialMode ?? 'full');

  const exercises = mode === 'full' ? previewWorkoutExercises : previewWorkoutExercises.slice(0, 3);

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">{previewTodayWorkout.title}</Heading>
        <AppText color="secondary">
          {durationByMode[mode]} min · {exercises.length} exercises
        </AppText>
      </View>

      <SegmentedControl
        accessibilityLabel="Workout mode"
        value={mode}
        onChange={(value) => setMode(value as Mode)}
        options={[
          { value: 'full', label: 'Full' },
          { value: 'quick', label: 'Quick' },
          { value: 'minimum', label: 'Minimum' },
        ]}
      />

      <View style={{ gap: spacing.two }}>
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.name}
            name={exercise.name}
            targetSets={exercise.targetSets}
            targetReps={exercise.targetReps}
            previous={exercise.previous}
          />
        ))}
      </View>

      <PrimaryButton
        label="Start Workout"
        size="large"
        onPress={() =>
          router.replace({
            pathname: '/workout/[workoutId]/active',
            params: { workoutId: workoutId ?? 'preview-workout-1' },
          })
        }
      />
    </ScrollScreen>
  );
}
