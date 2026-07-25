import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card, InteractiveCard } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { MetricCard } from '@/components/ui/metric-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  loadPersonalRecords,
  loadTrainingHistorySummary,
  loadViewerProfile,
} from '@/services/training/training-repository';
import type { Href } from 'expo-router';

export default function ProgressScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const profile = await loadViewerProfile(client, userId);
    const [history, records] = await Promise.all([
      loadTrainingHistorySummary(client, userId, profile.availableTrainingDays.length),
      loadPersonalRecords(client, userId),
    ]);
    return { history, records };
  });

  const sections: { label: string; icon: IconName; href: Href }[] = [
    { label: 'Strength', icon: 'trending', href: '/(tabs)/progress/strength' },
    { label: 'Measurements', icon: 'measurements', href: '/(tabs)/progress/measurements' },
    { label: 'Consistency', icon: 'checkCircle', href: '/(tabs)/progress/consistency' },
  ];

  return (
    <ScrollScreen>
      <Heading variant="hero">Progress</Heading>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading your progress" rows={2} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.three }}>
          <MetricCard
            label="Sessions done"
            value={String(data.history.completedTotal)}
            caption="all time"
            icon="checkCircle"
          />
          <MetricCard
            label="Personal records"
            value={String(data.records.length)}
            caption={data.records.length === 0 ? 'none yet' : 'all time'}
            icon="trophy"
          />
        </View>
      )}

      <View style={{ gap: spacing.two }}>
        {sections.map((section) => (
          <InteractiveCard
            key={section.label}
            accessibilityLabel={section.label}
            onPress={() => router.push(section.href)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
              <Icon name={section.icon} color={colors.text.secondary} size={20} />
              <Heading variant="bodyEmphasis">{section.label}</Heading>
            </View>
          </InteractiveCard>
        ))}
        <InteractiveCard
          accessibilityLabel="Personal records"
          onPress={() => router.push('/(tabs)/progress/records')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
            <Icon name="trophy" color={colors.text.secondary} size={20} />
            <Heading variant="bodyEmphasis">Personal records</Heading>
          </View>
        </InteractiveCard>
      </View>

      <Card style={{ gap: spacing.two }}>
        <Caption>BODYSCAN</Caption>
        <AppText color="secondary">Track visual progress using standardised photos.</AppText>
        <PrimaryButton
          label="View Timeline"
          fullWidth={false}
          onPress={() => router.push('/(tabs)/progress/bodyscan')}
        />
      </Card>
    </ScrollScreen>
  );
}
