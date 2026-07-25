import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Caption, Heading } from '@/components/ui/app-text';
import { Card, InteractiveCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadCurrentProgramme, loadViewerProfile } from '@/services/training/training-repository';

export default function PlanScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const [profile, programme] = await Promise.all([
      loadViewerProfile(client, userId),
      loadCurrentProgramme(client, userId),
    ]);
    return { profile, programme };
  });

  const daysPerWeek = data?.profile.availableTrainingDays.length ?? 0;

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">My Plan</Heading>
        {status === 'ready' && daysPerWeek > 0 ? (
          <Caption>{daysPerWeek} DAYS / WEEK</Caption>
        ) : null}
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading your plan" rows={3} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="plan"
            title={data.programme ? 'Your sessions are being built' : 'No programme yet'}
            description={
              data.programme
                ? 'Your starting structure is saved from onboarding. Your exercise sessions are built from it next.'
                : 'Finish onboarding and your plan will be built from your goals, equipment and availability.'
            }
          />
        </Card>
      )}

      <View style={{ gap: spacing.two }}>
        <SectionHeader
          title="More"
          actionLabel="Weekly schedule"
          onActionPress={() => router.push('/(tabs)/plan/schedule')}
        />
        <InteractiveCard
          accessibilityLabel="Why this plan?"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/plan/why-changed/[decisionId]',
              params: { decisionId: 'current' },
            })
          }
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
            <Icon name="help" color={colors.text.secondary} size={20} />
            <Heading variant="bodyEmphasis">Why this plan?</Heading>
          </View>
        </InteractiveCard>
        <InteractiveCard
          accessibilityLabel="Programme change history"
          onPress={() => router.push('/(tabs)/plan/history')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
            <Icon name="history" color={colors.text.secondary} size={20} />
            <Heading variant="bodyEmphasis">Programme history</Heading>
          </View>
        </InteractiveCard>
        <InteractiveCard
          accessibilityLabel="Reset or restructure plan"
          onPress={() => router.push('/(tabs)/plan/reset')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
            <Icon name="sync" color={colors.text.secondary} size={20} />
            <Heading variant="bodyEmphasis">Reset / restructure plan</Heading>
          </View>
        </InteractiveCard>
      </View>
    </ScrollScreen>
  );
}
