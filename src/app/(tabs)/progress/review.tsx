import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  loadTrainingHistorySummary,
  loadViewerProfile,
} from '@/services/training/training-repository';

export default function ProgressReviewScreen() {
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const profile = await loadViewerProfile(client, userId);
    return loadTrainingHistorySummary(client, userId, profile.availableTrainingDays.length);
  });

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <Heading variant="title">Your progress review</Heading>
        <LoadingState accessibilityLabel="Loading your progress review" rows={3} />
      </ScrollScreen>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ScrollScreen>
        <Heading variant="title">Your progress review</Heading>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <Heading variant="title">Your progress review</Heading>
      {data.completedTotal === 0 ? (
        <Card>
          <EmptyState
            icon="progress"
            title="Nothing to review yet"
            description="A review needs completed sessions to look back on. Yours will appear here once you have trained."
          />
        </Card>
      ) : (
        <Card style={{ gap: spacing.one }}>
          <AppText variant="bodyEmphasis">
            {data.completedTotal} {data.completedTotal === 1 ? 'session' : 'sessions'} completed
          </AppText>
          <AppText color="secondary">
            {data.completedThisWeek} of those {data.completedThisWeek === 1 ? 'was' : 'were'} this
            week.
          </AppText>
        </Card>
      )}
      <View style={{ gap: spacing.one }}>
        <AppText color="tertiary">
          A fuller review that combines strength trends, consistency, measurements and BodyScan
          evidence is future work. Nothing here is estimated or filled in on your behalf.
        </AppText>
      </View>
    </ScrollScreen>
  );
}
