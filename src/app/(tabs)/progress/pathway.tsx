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
        <AppText color="secondary">
          A motivational view of your cumulative training work over time lands here in Phase 10.
        </AppText>
      </Card>
      <AppText color="tertiary">
        Estimates adapt as you train — this view is a motivational guide, not a guarantee.
      </AppText>
    </ScrollScreen>
  );
}
