import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card, InteractiveCard } from '@/components/ui/card';
import { ExerciseVisual } from '@/components/ui/exercise-visual';
import { useTheme } from '@/hooks/use-theme';

export type ExerciseCardProps = {
  name: string;
  targetSets: number;
  targetReps: string;
  previous?: string;
  description?: string | null;
  visualKey?: string | null;
  why?: string;
  onPress?: () => void;
};

/**
 * Exercise list row used across Plan and Workout. Optional content fields
 * are rendered only when genuine ontology data exists; there are no dash
 * placeholders or invented descriptions.
 */
export function ExerciseCard({
  name,
  targetSets,
  targetReps,
  previous,
  description,
  visualKey,
  why,
  onPress,
}: ExerciseCardProps) {
  const { spacing } = useTheme();
  const targetParts = [`${targetSets} ${targetSets === 1 ? 'set' : 'sets'}`, targetReps];
  if (previous) targetParts.push(`Previous: ${previous}`);

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.three }}>
      {visualKey ? <ExerciseVisual poseKey={visualKey} size={64} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: spacing.one }}>
        <AppText variant="bodyEmphasis" style={{ flexShrink: 1 }}>
          {name}
        </AppText>
        <Caption style={{ flexShrink: 1 }}>{targetParts.join(' · ')}</Caption>
        {description ? (
          <AppText color="secondary" style={{ flexShrink: 1 }}>
            {description}
          </AppText>
        ) : null}
        {why ? (
          <Caption color="tertiary" style={{ flexShrink: 1 }}>
            Why it is included: {why}
          </Caption>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <InteractiveCard
        accessibilityLabel={`${name}. Open exercise instructions`}
        onPress={onPress}
        style={{ padding: spacing.three, alignItems: 'flex-start' }}
      >
        {body}
      </InteractiveCard>
    );
  }

  return <Card style={{ padding: spacing.three }}>{body}</Card>;
}
