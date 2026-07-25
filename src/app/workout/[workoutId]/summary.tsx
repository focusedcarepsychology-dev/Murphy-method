import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { StatChip } from '@/components/ui/stat-chip';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadWorkoutSummary } from '@/services/training/training-repository';
import { loadPendingWorkoutCompletion } from '@/services/workouts/offline-workout-completion-queue';

/** Every figure is counted from genuinely logged sets, including locally queued sets. */
export default function WorkoutSummaryScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const { status, data, reload } = useAuthenticatedData(
    async (client, userId) => {
      const pending = await loadPendingWorkoutCompletion(userId, workoutId ?? '');
      if (pending) return { summary: pending.summary, pendingSync: true };
      const summary = await loadWorkoutSummary(client, userId, workoutId ?? '');
      return { summary, pendingSync: false };
    },
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
          {data?.pendingSync ? (
            <>
              <StatusBadge label="Saved on this device" tone="warning" />
              <AppText color="secondary" align="center" style={{ flexShrink: 1 }}>
                Your workout will sync automatically when the app next has a connection.
              </AppText>
            </>
          ) : (
            <StatusBadge label="Synced" tone="positive" />
          )}
        </View>

        {data?.summary ? (
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
              label={`${data.summary.completedExercises} ${
                data.summary.completedExercises === 1 ? 'exercise' : 'exercises'
              }`}
            />
            <StatChip
              icon="checkCircle"
              label={`${data.summary.completedSets} ${
                data.summary.completedSets === 1 ? 'set' : 'sets'
              }`}
            />
            {data.summary.durationMinutes ? (
              <StatChip icon="timer" label={`${data.summary.durationMinutes} min`} />
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
