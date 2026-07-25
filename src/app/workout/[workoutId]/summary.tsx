import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { StatChip } from '@/components/ui/stat-chip';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadWorkoutSummary } from '@/services/training/training-repository';

/**
 * Every figure here is counted from the sets the user actually logged for
 * this workout. A session where nothing was logged reports zero, and no
 * personal record is claimed unless a genuine record exists.
 */
export default function WorkoutSummaryScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const { status, data, reload } = useAuthenticatedData(
    (client, userId) => loadWorkoutSummary(client, userId, workoutId ?? ''),
    [workoutId],
  );

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading your session summary" rows={3} />
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

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, gap: spacing.four, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: spacing.two }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.pill,
              backgroundColor: colors.status.positiveSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="checkCircle" color={colors.status.positive} size={36} />
          </View>
          <Heading variant="title" align="center">
            Workout complete
          </Heading>
        </View>

        {data ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.two,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <StatChip
              icon="checkCircle"
              label={`${data.completedExercises} ${data.completedExercises === 1 ? 'exercise' : 'exercises'}`}
            />
            <StatChip
              icon="checkCircle"
              label={`${data.completedSets} ${data.completedSets === 1 ? 'set' : 'sets'}`}
            />
            {data.durationMinutes ? (
              <StatChip icon="timer" label={`${data.durationMinutes} min`} />
            ) : null}
          </View>
        ) : null}

        <PrimaryButton
          label="Done"
          fullWidth={false}
          onPress={() => router.replace('/(tabs)/today')}
        />
      </View>
    </Screen>
  );
}
