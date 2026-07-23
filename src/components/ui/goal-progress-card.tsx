import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type GoalTrajectory = 'progressing' | 'building' | 'maintaining' | 'insufficientEvidence';

const trajectoryCopy: Record<GoalTrajectory, string> = {
  progressing: 'Progressing',
  building: 'Building',
  maintaining: 'Maintaining',
  insufficientEvidence: 'Gathering evidence',
};

export type GoalProgressCardProps = {
  goalLabel: string;
  trajectory: GoalTrajectory;
  icon?: IconName;
};

/**
 * Goal Journey row. Trajectory is always one of the defined categorical
 * states — never a fabricated precise percentage (MASTER_SPEC.md §26.1).
 */
export function GoalProgressCard({
  goalLabel,
  trajectory,
  icon = 'trending',
}: GoalProgressCardProps) {
  const { colors, spacing, radius } = useTheme();

  const tone =
    trajectory === 'insufficientEvidence' ? colors.text.tertiary : colors.status.positive;
  const bg =
    trajectory === 'insufficientEvidence' ? colors.surface.sunken : colors.status.positiveSubtle;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.two,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.two }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.sm,
            backgroundColor: colors.surface.sunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} color={colors.text.secondary} size={16} />
        </View>
        <AppText variant="body">{goalLabel}</AppText>
      </View>
      <View
        style={{
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingVertical: spacing.half,
          paddingHorizontal: spacing.two,
        }}
      >
        <AppText variant="supportingEmphasis" style={{ color: tone }}>
          {trajectoryCopy[trajectory]}
        </AppText>
      </View>
    </View>
  );
}
