import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

export default function AdaptiveWorkPathwayScreen() {
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <Heading variant="title">Adaptive Work Pathway</Heading>
      <Card style={{ gap: spacing.one }}>
        <Caption>CUMULATIVE WORK</Caption>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          A cumulative training-work visual is not available yet. Your completed workouts and sets
          continue to be stored for future summaries.
        </AppText>
      </Card>
      <AppText color="tertiary" style={{ flexShrink: 1 }}>
        Future estimates should remain motivational guides rather than guarantees.
      </AppText>
    </ScrollScreen>
  );
}
