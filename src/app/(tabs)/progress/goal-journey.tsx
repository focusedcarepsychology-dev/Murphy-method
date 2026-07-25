import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GoalProgressCard } from '@/components/ui/goal-progress-card';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadSelectedGoals } from '@/services/onboarding/onboarding-repository';
import {
  loadTrainingHistorySummary,
  loadViewerProfile,
} from '@/services/training/training-repository';

/**
 * Real goals, in the user's own priority order. Trajectory stays
 * "Gathering evidence" for everyone right now: a categorical trajectory
 * has to be derived from real completed sessions and measurements, and
 * that derivation does not exist yet. Showing "Progressing" without it
 * would be an invented progress status.
 */
export default function GoalJourneyScreen() {
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const [goals, profile] = await Promise.all([
      loadSelectedGoals(client, userId),
      loadViewerProfile(client, userId),
    ]);
    const history = await loadTrainingHistorySummary(
      client,
      userId,
      profile.availableTrainingDays.length,
    );
    return { goals, history };
  });

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading your goal journey" rows={3} />
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

  if (data.goals.length === 0) {
    return (
      <ScrollScreen>
        <Card>
          <EmptyState
            icon="flag"
            title="No goals saved yet"
            description="Choose your goals in Profile and they will appear here."
          />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <Card style={{ gap: spacing.one }}>
        {data.goals.map((goal) => (
          <GoalProgressCard
            key={goal.goalKey}
            goalLabel={goal.label}
            trajectory="insufficientEvidence"
          />
        ))}
      </Card>
      <View style={{ gap: spacing.one }}>
        <AppText color="secondary">
          {data.history.completedTotal === 0
            ? 'You have not completed any sessions yet, so there is nothing to measure progress against.'
            : `${data.history.completedTotal} completed ${data.history.completedTotal === 1 ? 'session' : 'sessions'} recorded so far.`}
        </AppText>
        <AppText color="tertiary">
          Trajectory is always one of a few plain categories, never a precise percentage, and it
          stays at &quot;Gathering evidence&quot; until there is enough of your own data to say
          more.
        </AppText>
      </View>
    </ScrollScreen>
  );
}
