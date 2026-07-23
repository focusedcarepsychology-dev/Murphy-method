import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card, InteractiveCard } from '@/components/ui/card';
import { GoalProgressCard } from '@/components/ui/goal-progress-card';
import { Icon, type IconName } from '@/components/ui/icon';
import { MetricCard } from '@/components/ui/metric-card';
import { PrimaryButton } from '@/components/ui/button';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { previewConsistencyPercent, previewGoals, previewPersonalRecords } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';
import type { Href } from 'expo-router';

export default function ProgressScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const sections: { label: string; icon: IconName; href: Href }[] = [
    { label: 'Strength', icon: 'trending', href: '/(tabs)/progress/strength' },
    { label: 'Measurements', icon: 'measurements', href: '/(tabs)/progress/measurements' },
    { label: 'Consistency', icon: 'checkCircle', href: '/(tabs)/progress/consistency' },
  ];

  return (
    <ScrollScreen>
      <Heading variant="hero">Progress</Heading>

      <View style={{ gap: spacing.two }}>
        <SectionHeader
          title="Goal journey"
          actionLabel="See all"
          onActionPress={() => router.push('/(tabs)/progress/goal-journey')}
        />
        <Card style={{ gap: spacing.one }}>
          {previewGoals.map((goal) => (
            <GoalProgressCard
              key={goal.label}
              goalLabel={goal.label}
              trajectory={goal.trajectory}
              icon={goal.icon}
            />
          ))}
        </Card>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.three }}>
        <MetricCard
          label="Consistency"
          value={`${previewConsistencyPercent}%`}
          icon="checkCircle"
        />
        <MetricCard
          label="Personal records"
          value={String(previewPersonalRecords.length)}
          caption="last 8 weeks"
          icon="trophy"
        />
      </View>

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
