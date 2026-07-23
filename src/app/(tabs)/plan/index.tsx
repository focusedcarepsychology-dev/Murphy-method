import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Caption, Heading } from '@/components/ui/app-text';
import { InteractiveCard } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { WorkoutCard } from '@/components/ui/workout-card';
import { previewPlanSummary, previewWeeklyPlan } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function PlanScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">My Plan</Heading>
        <Caption>{previewPlanSummary.daysPerWeek} DAYS / WEEK</Caption>
      </View>

      <View style={{ gap: spacing.three }}>
        {previewWeeklyPlan.map((workout) => (
          <WorkoutCard
            key={workout.day}
            dayLabel={workout.day.toUpperCase()}
            title={workout.title}
            durationMinutes={workout.durationMinutes}
            exerciseCount={workout.exerciseCount}
            status={workout.status}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/plan/workout/[workoutId]',
                params: { workoutId: workout.day.toLowerCase() },
              })
            }
          />
        ))}
      </View>

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
              params: { decisionId: 'initial' },
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
