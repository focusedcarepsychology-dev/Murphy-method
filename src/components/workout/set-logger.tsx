import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { IconButton, PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WorkoutTouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SetLoggerProps = {
  weightKg: number;
  reps: number;
  onChangeWeight: (weightKg: number) => void;
  onChangeReps: (reps: number) => void;
  onCompleteSet: () => void;
};

/**
 * In-workout set entry. Controls are large-touch-target (docs/DESIGN_SYSTEM.md
 * §7.1) — mid-set, one-handed, sometimes fatigued. Steppers stack full-width
 * (rather than side by side) so the large +/- targets stay reachable and
 * uncrowded even on narrow phone widths.
 */
export function SetLogger({
  weightKg,
  reps,
  onChangeWeight,
  onChangeReps,
  onCompleteSet,
}: SetLoggerProps) {
  const { spacing } = useTheme();

  return (
    <Card style={{ gap: spacing.four }}>
      <View style={{ gap: spacing.three }}>
        <Stepper label="Weight" unit="kg" value={weightKg} onChange={onChangeWeight} step={2.5} />
        <Stepper label="Reps" value={reps} onChange={onChangeReps} step={1} />
      </View>
      <PrimaryButton label="Complete Set" size="large" onPress={onCompleteSet} icon="check" />
      <AppText color="tertiary" align="center" variant="caption">
        Logging writes locally first, always — full offline guarantee lands in Phase 6.
      </AppText>
    </Card>
  );
}

function Stepper({
  label,
  unit,
  value,
  onChange,
  step,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.one }}>
      <Caption>{label.toUpperCase()}</Caption>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton
          icon="minus"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          variant="filled"
          size={WorkoutTouchTarget}
          onPress={() => onChange(Math.max(0, value - step))}
        />
        <AppText variant="title" style={{ textAlign: 'center' }}>
          {value}
          {unit ?? ''}
        </AppText>
        <IconButton
          icon="plus"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          variant="filled"
          size={WorkoutTouchTarget}
          onPress={() => onChange(value + step)}
        />
      </View>
    </View>
  );
}
