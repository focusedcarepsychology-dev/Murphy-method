import { useRouter, type Href } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card, InteractiveCard } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadGamificationDashboard } from '@/services/gamification/gamification-repository';
import {
  loadPersonalRecords,
  loadTrainingHistorySummary,
  loadViewerProfile,
} from '@/services/training/training-repository';

function SnapshotMetric({
  label,
  value,
  supporting,
}: {
  label: string;
  value: string;
  supporting: string;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ flex: 1, minWidth: 110, gap: spacing.one }}>
      <Caption>{label.toUpperCase()}</Caption>
      <Heading variant="title">{value}</Heading>
      <Caption color="tertiary">{supporting}</Caption>
    </View>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, spacing } = useTheme();
  const narrow = width < 430;

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const profile = await loadViewerProfile(client, userId);
    const [history, records, gamification] = await Promise.all([
      loadTrainingHistorySummary(client, userId, profile.availableTrainingDays.length),
      loadPersonalRecords(client, userId),
      loadGamificationDashboard(client),
    ]);
    return { history, records, gamification };
  });

  const sections: {
    label: string;
    supporting: string;
    icon: IconName;
    href: Href;
  }[] = [
    {
      label: 'Momentum Cup',
      supporting: 'Join an optional monthly consistency tournament.',
      icon: 'trophy',
      href: '/(tabs)/progress/league',
    },
    {
      label: 'Achievements',
      supporting: 'Positive milestones that never disappear after a missed day.',
      icon: 'star',
      href: '/(tabs)/progress/achievements',
    },
    {
      label: 'Strength',
      supporting: 'Review logged performance by exercise.',
      icon: 'trending',
      href: '/(tabs)/progress/strength',
    },
    {
      label: 'Measurements',
      supporting: 'Keep optional measurements separate from performance.',
      icon: 'measurements',
      href: '/(tabs)/progress/measurements',
    },
    {
      label: 'Consistency',
      supporting: 'See completed sessions without streak pressure.',
      icon: 'checkCircle',
      href: '/(tabs)/progress/consistency',
    },
    {
      label: 'Personal records',
      supporting: 'Records appear only after a genuine improvement.',
      icon: 'trophy',
      href: '/(tabs)/progress/records',
    },
  ];

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">Progress</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Evidence from workouts you have actually completed.
        </AppText>
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading your progress" rows={2} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : (
        <Card variant="hero" elevated={false} style={{ gap: spacing.three }}>
          <Caption color="brand">YOUR SNAPSHOT</Caption>
          <View
            style={{
              flexDirection: narrow ? 'column' : 'row',
              flexWrap: narrow ? 'nowrap' : 'wrap',
              gap: spacing.four,
            }}
          >
            <SnapshotMetric
              label="Sessions"
              value={String(data.history.completedTotal)}
              supporting="completed all time"
            />
            <SnapshotMetric
              label="Momentum"
              value={String(data.gamification.lifetimePoints)}
              supporting="consistency points"
            />
            <SnapshotMetric
              label="Achievements"
              value={String(
                data.gamification.achievements.filter((achievement) => achievement.achievedAt)
                  .length,
              )}
              supporting="positive milestones"
            />
            <SnapshotMetric
              label="Records"
              value={String(data.records.length)}
              supporting="genuine improvements"
            />
          </View>
          {data.history.completedTotal === 0 ? (
            <Caption color="tertiary" style={{ flexShrink: 1 }}>
              Your progress view will become more useful as you complete and log real sessions.
            </Caption>
          ) : null}
        </Card>
      )}

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="Explore" />
        {sections.map((section) => (
          <InteractiveCard
            variant="quiet"
            key={section.label}
            accessibilityLabel={section.label}
            onPress={() => router.push(section.href)}
          >
            <View
              style={{
                minWidth: 0,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.three,
              }}
            >
              <Icon name={section.icon} color={colors.text.secondary} size={20} />
              <View style={{ flex: 1, minWidth: 0, gap: spacing.half }}>
                <Heading variant="bodyEmphasis" style={{ flexShrink: 1 }}>
                  {section.label}
                </Heading>
                <Caption color="tertiary" style={{ flexShrink: 1 }}>
                  {section.supporting}
                </Caption>
              </View>
            </View>
          </InteractiveCard>
        ))}
      </View>

      <Card variant="hero" elevated={false} style={{ gap: spacing.two }}>
        <Caption color="brand">PRIVATE BODYSCAN</Caption>
        <Heading variant="section">Compare visual progress</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Use standardised photos, private storage and expiring image links. BodyScan does not
          estimate body fat or make clinical claims.
        </AppText>
        <PrimaryButton
          label="Open BodyScan"
          fullWidth={false}
          onPress={() => router.push('/(tabs)/progress/bodyscan')}
        />
      </Card>
    </ScrollScreen>
  );
}
