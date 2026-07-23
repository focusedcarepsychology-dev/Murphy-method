import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card, InteractiveCard } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

export type ExerciseCardProps = {
  name: string;
  targetSets: number;
  targetReps: string;
  previous?: string;
  onPress?: () => void;
};

/** Exercise list row — Workout Overview, Plan workout detail. */
export function ExerciseCard({
  name,
  targetSets,
  targetReps,
  previous,
  onPress,
}: ExerciseCardProps) {
  const { spacing } = useTheme();

  const body = (
    <View style={{ gap: 2 }}>
      <AppText variant="bodyEmphasis">{name}</AppText>
      <Caption>
        {targetSets} sets · {targetReps} reps
        {previous ? ` · Previous: ${previous}` : ''}
      </Caption>
    </View>
  );

  if (onPress) {
    return (
      <InteractiveCard
        accessibilityLabel={name}
        onPress={onPress}
        style={{ padding: spacing.three }}
      >
        {body}
      </InteractiveCard>
    );
  }

  return <Card style={{ padding: spacing.three }}>{body}</Card>;
}
