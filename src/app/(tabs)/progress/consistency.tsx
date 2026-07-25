import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { MomentumCard } from '@/components/ui/momentum-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  loadTrainingHistorySummary,
  loadViewerProfile,
  loadWeeklyCompletionCounts,
} from '@/services/training/training-repository';

const WEEKS_SHOWN = 6;

/**
 * Only counts the user genuinely produced. Sessions planned in past weeks
 * are not stored retroactively, so no "% of planned sessions completed"
 * figure is shown here: inventing a denominator would be exactly the kind
 * of fake precision this screen previously displayed, where a fixed
 * completion percentage was rendered for every user regardless of what
 * they had actually done.
 */
export default function ConsistencyScreen() {
  const { colors, spacing, radius } = useTheme();

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const profile = await loadViewerProfile(client, userId);
    const [history, weeks] = await Promise.all([
      loadTrainingHistorySummary(client, userId, profile.availableTrainingDays.length),
      loadWeeklyCompletionCounts(client, userId, WEEKS_SHOWN),
    ]);
    return { history, weeks };
  });

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading your consistency" rows={3} />
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

  const maxWeek = Math.max(...data.weeks.map((week) => week.completed), 1);
  const totalInWindow = data.weeks.reduce((sum, week) => sum + week.completed, 0);

  return (
    <ScrollScreen>
      <MomentumCard
        completedSessions={data.history.completedThisWeek}
        plannedSessions={data.history.plannedThisWeek}
      />
      <Card style={{ gap: spacing.two }}>
        <Caption>LAST {WEEKS_SHOWN} WEEKS</Caption>
        <View
          style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.two, height: 96 }}
        >
          {data.weeks.map((week) => (
            <View key={week.weekStart} style={{ flex: 1, alignItems: 'center', gap: spacing.one }}>
              <View
                style={{
                  width: '100%',
                  height: Math.max(4, (week.completed / maxWeek) * 72),
                  borderRadius: radius.sm,
                  backgroundColor:
                    week.completed > 0 ? colors.status.positive : colors.surface.sunken,
                }}
              />
              <Caption>{week.completed}</Caption>
            </View>
          ))}
        </View>
        <AppText color="secondary">
          {totalInWindow === 0
            ? `No sessions completed in the last ${WEEKS_SHOWN} weeks yet.`
            : `${totalInWindow} ${totalInWindow === 1 ? 'session' : 'sessions'} completed in the last ${WEEKS_SHOWN} weeks.`}
        </AppText>
      </Card>
    </ScrollScreen>
  );
}
