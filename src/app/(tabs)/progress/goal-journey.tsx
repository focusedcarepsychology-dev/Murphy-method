import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { GoalProgressCard } from '@/components/ui/goal-progress-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { previewConsistencyPercent, previewGoals } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function GoalJourneyScreen() {
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <Card style={{ gap: spacing.one }}>
        {previewGoals.map((goal) => (
          <GoalProgressCard
            key={goal.label}
            goalLabel={goal.label}
            trajectory={goal.trajectory}
            icon={goal.icon}
          />
        ))}
        <GoalProgressCard goalLabel="Consistency" trajectory="progressing" icon="checkCircle" />
      </Card>
      <View style={{ gap: spacing.one }}>
        <AppText color="secondary">
          {previewConsistencyPercent}% of planned sessions completed over the last 8 weeks.
        </AppText>
        <AppText color="tertiary">
          Trajectory is always shown as one of these categories — never a fabricated precise
          percentage.
        </AppText>
      </View>
    </ScrollScreen>
  );
}
