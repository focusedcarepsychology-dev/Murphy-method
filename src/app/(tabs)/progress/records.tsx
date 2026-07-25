import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { formatPerformance, loadPersonalRecords } from '@/services/training/training-repository';

function formatDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * INVARIANT C: a user with no logged sets sees an empty state, never a
 * sample record. Each row below is the user's own best logged set for
 * that exercise.
 */
export default function PersonalRecordsScreen() {
  const { spacing } = useTheme();
  const { status, data, reload } = useAuthenticatedData((client, userId) =>
    loadPersonalRecords(client, userId),
  );

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading your personal records" rows={3} />
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

  if (data.length === 0) {
    return (
      <ScrollScreen>
        <Card>
          <EmptyState
            icon="trophy"
            title="No records yet"
            description="Complete a workout and log your sets to set your first record."
          />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.two }}>
        {data.map((record) => (
          <Card key={record.exerciseId} style={{ gap: 2 }}>
            <AppText variant="bodyEmphasis">{record.exerciseName}</AppText>
            <AppText color="secondary">{formatPerformance(record.weightKg, record.reps)}</AppText>
            <Caption>{formatDate(record.achievedAt)}</Caption>
          </Card>
        ))}
      </View>
    </ScrollScreen>
  );
}
