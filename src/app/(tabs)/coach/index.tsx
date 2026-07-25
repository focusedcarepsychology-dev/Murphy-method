import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { buildWeeklyObservation } from '@/domain/coach/weekly-observation';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadGamificationDashboard } from '@/services/gamification/gamification-repository';
import {
  loadPersonalRecords,
  loadTrainingHistorySummary,
  loadViewerProfile,
} from '@/services/training/training-repository';

export default function CoachScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const profile = await loadViewerProfile(client, userId);
    const [history, records, momentum] = await Promise.all([
      loadTrainingHistorySummary(client, userId, profile.availableTrainingDays.length),
      loadPersonalRecords(client, userId),
      loadGamificationDashboard(client),
    ]);
    return { profile, history, records, momentum };
  });

  const observation = data
    ? buildWeeklyObservation(
        data.profile.coachingStyle,
        data.history.completedThisWeek,
        data.history.plannedThisWeek,
      )
    : null;

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">Coach</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Clear observations based only on your real sessions, sets and saved preferences.
        </AppText>
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading coach observations" rows={4} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : data.history.completedTotal === 0 ? (
        <Card variant="hero" elevated={false}>
          <EmptyState
            icon="coach"
            title="Nothing to report yet"
            description="Complete a session and the coach can reflect on what actually happened, without inventing progress or performance."
            actionLabel="View today's session"
            onAction={() => router.push('/(tabs)/today')}
          />
        </Card>
      ) : (
        <>
          <Card variant="hero" elevated={false} style={{ gap: spacing.two }}>
            <Caption color="brand">THIS WEEK</Caption>
            <Heading variant="section">{observation?.title}</Heading>
            <AppText color="secondary" style={{ flexShrink: 1 }}>
              {observation?.body}
            </AppText>
            <PrimaryButton
              label="Open today's training"
              fullWidth={false}
              onPress={() => router.push('/(tabs)/today')}
            />
          </Card>

          <Card variant="quiet" elevated={false} style={{ gap: spacing.two }}>
            <Caption>YOUR EVIDENCE</Caption>
            <AppText variant="bodyEmphasis">
              {data.history.completedTotal} completed{' '}
              {data.history.completedTotal === 1 ? 'session' : 'sessions'} · {data.records.length}{' '}
              genuine {data.records.length === 1 ? 'record' : 'records'}
            </AppText>
            <AppText color="secondary" style={{ flexShrink: 1 }}>
              {data.momentum.lifetimePoints} Momentum Points across {data.momentum.scoredDays}{' '}
              scored {data.momentum.scoredDays === 1 ? 'day' : 'days'}. Public competition remains
              optional.
            </AppText>
            <SecondaryButton
              label="Review progress"
              fullWidth={false}
              onPress={() => router.push('/(tabs)/progress')}
            />
          </Card>
        </>
      )}

      <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
        <Caption>TRUST BOUNDARY</Caption>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Coach does not diagnose, estimate unrecorded performance or replace professional advice.
          It stays quiet when there is not enough genuine evidence.
        </AppText>
      </Card>
    </ScrollScreen>
  );
}
