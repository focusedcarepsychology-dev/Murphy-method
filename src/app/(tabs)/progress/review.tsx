import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { GoalProgressCard } from '@/components/ui/goal-progress-card';
import { Card } from '@/components/ui/card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { previewGoals } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function ProgressReviewScreen() {
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <Heading variant="title">Your progress review</Heading>
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
      <View style={{ gap: spacing.one }}>
        <AppText color="secondary">
          A fuller narrative combining strength trends, consistency, measurements, and BodyScan
          evidence lands in Phase 10.
        </AppText>
      </View>
    </ScrollScreen>
  );
}
