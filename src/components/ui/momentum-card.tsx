import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useTheme } from '@/hooks/use-theme';

export type MomentumCardProps = {
  completedSessions: number;
  plannedSessions: number;
};

/** Session-count framing without destructive streak pressure. */
export function MomentumCard({ completedSessions, plannedSessions }: MomentumCardProps) {
  const { spacing } = useTheme();
  const ratio = plannedSessions > 0 ? completedSessions / plannedSessions : 0;

  return (
    <Card variant="quiet" elevated={false} style={{ gap: spacing.two }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: spacing.two,
        }}
      >
        <Caption>THIS WEEK</Caption>
        <AppText variant="supportingEmphasis" style={{ flexShrink: 1 }}>
          {plannedSessions > 0
            ? `${completedSessions} of ${plannedSessions}`
            : `${completedSessions} completed`}
        </AppText>
      </View>
      <ProgressBar
        value={ratio}
        tone="positive"
        accessibilityLabel={`${completedSessions} of ${plannedSessions} planned sessions completed this week`}
      />
      <Caption color="tertiary" style={{ flexShrink: 1 }}>
        {plannedSessions > 0
          ? 'Progress is measured by completed sessions, not an all-or-nothing streak.'
          : 'Your weekly target will appear when a programme schedule is available.'}
      </Caption>
    </Card>
  );
}
