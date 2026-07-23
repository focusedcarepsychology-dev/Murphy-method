import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

/**
 * Deep-link-addressable exercise route (docs/ROUTES.md) — resumes directly
 * into the Active Workout screen for this workout, which owns the actual
 * set-logging UI (docs/SCREEN_SPECIFICATIONS.md §3).
 */
export default function WorkoutExerciseScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.three }}>
        <Heading variant="title">Resume workout</Heading>
        <AppText color="secondary" align="center">
          Deep links resume directly into your active session.
        </AppText>
        <PrimaryButton
          label="Continue"
          fullWidth={false}
          onPress={() =>
            router.replace({
              pathname: '/workout/[workoutId]/active',
              params: { workoutId: workoutId ?? 'preview-workout-1' },
            })
          }
        />
      </View>
    </Screen>
  );
}
