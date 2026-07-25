import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { MomentumCard } from '@/components/ui/momentum-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { greetingWithName } from '@/domain/profile/greeting';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useGreeting } from '@/hooks/use-greeting';
import { useTheme } from '@/hooks/use-theme';
import { loadSelectedGoals } from '@/services/onboarding/onboarding-repository';
import {
  loadCurrentProgramme,
  loadTrainingHistorySummary,
  loadViewerProfile,
} from '@/services/training/training-repository';

export default function TodayScreen() {
  const router = useRouter();
  const greeting = useGreeting();
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const [profile, programme, goals] = await Promise.all([
      loadViewerProfile(client, userId),
      loadCurrentProgramme(client, userId),
      loadSelectedGoals(client, userId),
    ]);
    const history = await loadTrainingHistorySummary(
      client,
      userId,
      profile.availableTrainingDays.length,
    );
    return { profile, programme, goals, history };
  });

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Caption>{greetingWithName(greeting, data?.profile.displayName)}</Caption>
        <Heading variant="hero">What&apos;s next</Heading>
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading today's session" />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : (
        <>
          <Card>
            <EmptyState
              icon="plan"
              title={data.programme ? 'Your programme is being prepared' : 'No programme yet'}
              description={
                data.programme
                  ? 'Your starting structure is saved. Your exercise sessions are being built from it.'
                  : 'Finish onboarding and your plan will be built from your goals, equipment and availability.'
              }
              actionLabel="Go to Plan"
              onAction={() => router.push('/(tabs)/plan')}
            />
          </Card>

          <MomentumCard
            completedSessions={data.history.completedThisWeek}
            plannedSessions={data.history.plannedThisWeek}
          />

          <View style={{ gap: spacing.two }}>
            <SectionHeader
              title="Goal journey"
              actionLabel="See all"
              onActionPress={() => router.push('/(tabs)/progress/goal-journey')}
            />
            <Card style={{ gap: spacing.one }}>
              {data.goals.length === 0 ? (
                <Caption>No goals saved yet.</Caption>
              ) : (
                <>
                  {data.goals.map((goal) => (
                    <Caption key={goal.goalKey}>
                      {goal.priority}. {goal.label}
                    </Caption>
                  ))}
                  <Caption color="tertiary">
                    {data.history.completedTotal === 0
                      ? 'Progress towards each goal appears once you have completed sessions to measure.'
                      : `Based on ${data.history.completedTotal} completed ${
                          data.history.completedTotal === 1 ? 'session' : 'sessions'
                        } so far.`}
                  </Caption>
                </>
              )}
            </Card>
          </View>
        </>
      )}
    </ScrollScreen>
  );
}
