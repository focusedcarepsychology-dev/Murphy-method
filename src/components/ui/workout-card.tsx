import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card, InteractiveCard } from '@/components/ui/card';
import { StatChip } from '@/components/ui/stat-chip';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { useTheme } from '@/hooks/use-theme';

export type WorkoutCardStatus = 'scheduled' | 'completed' | 'inProgress' | 'rest';

const statusCopy: Record<WorkoutCardStatus, { label: string; tone: StatusTone }> = {
  scheduled: { label: 'Scheduled', tone: 'neutral' },
  inProgress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'positive' },
  rest: { label: 'Rest day', tone: 'neutral' },
};

export type WorkoutCardProps = {
  dayLabel?: string;
  title: string;
  durationMinutes: number;
  exerciseCount?: number;
  status?: WorkoutCardStatus;
  onPress?: () => void;
};

/** Plan/Today workout summary card — duration, focus, status. */
export function WorkoutCard({
  dayLabel,
  title,
  durationMinutes,
  exerciseCount,
  status,
  onPress,
}: WorkoutCardProps) {
  const { spacing } = useTheme();

  const body = (
    <View style={{ gap: spacing.two }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <View style={{ gap: 2, flex: 1 }}>
          {dayLabel ? <Caption>{dayLabel}</Caption> : null}
          <AppText variant="section">{title}</AppText>
        </View>
        {status ? (
          <StatusBadge label={statusCopy[status].label} tone={statusCopy[status].tone} />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.two }}>
        <StatChip icon="timer" label={`${durationMinutes} min`} />
        {typeof exerciseCount === 'number' ? (
          <StatChip icon="checkCircle" label={`${exerciseCount} exercises`} />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <InteractiveCard
        accessibilityLabel={`${title}, ${durationMinutes} minutes`}
        onPress={onPress}
      >
        {body}
      </InteractiveCard>
    );
  }

  return <Card>{body}</Card>;
}
