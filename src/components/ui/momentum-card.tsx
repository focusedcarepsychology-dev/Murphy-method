import { Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useTheme } from '@/hooks/use-theme';

export type MomentumCardProps = {
  completedSessions: number;
  plannedSessions: number;
};

/** "YOUR MOMENTUM" — session-count framing, never a destructive streak. */
export function MomentumCard({ completedSessions, plannedSessions }: MomentumCardProps) {
  const { spacing } = useTheme();
  const ratio = plannedSessions > 0 ? completedSessions / plannedSessions : 0;

  return (
    <Card style={{ gap: spacing.two }}>
      <Caption>YOUR MOMENTUM</Caption>
      <Heading variant="bodyEmphasis">
        {completedSessions} of {plannedSessions} planned sessions this week
      </Heading>
      <ProgressBar
        value={ratio}
        tone="positive"
        accessibilityLabel={`${completedSessions} of ${plannedSessions} planned sessions completed this week`}
      />
    </Card>
  );
}
