import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { IconButton, PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WorkoutTouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SetLoggerProps = {
  weightKg: number;
  reps: number;
  saving?: boolean;
  onChangeWeight: (weightKg: number) => void;
  onChangeReps: (reps: number) => void;
  onCompleteSet: () => void;
};

/**
 * In-workout set entry. Controls remain large and vertically stacked so
 * they are usable one-handed and on narrow phones.
 */
export function SetLogger({
  weightKg,
  reps,
  saving = false,
  onChangeWeight,
  onChangeReps,
  onCompleteSet,
}: SetLoggerProps) {
  const { spacing } = useTheme();
  const canComplete = reps > 0 && !saving;

  return (
    <Card style={{ gap: spacing.four }}>
      <View style={{ gap: spacing.three }}>
        <Stepper label="Weight" unit="kg" value={weightKg} onChange={onChangeWeight} step={2.5} />
        <Stepper label="Reps" value={reps} onChange={onChangeReps} step={1} />
      </View>
      <PrimaryButton
        label={reps > 0 ? 'Complete Set' : 'Add at least one rep'}
        size="large"
        onPress={onCompleteSet}
        icon="check"
        loading={saving}
        disabled={!canComplete}
      />
      <AppText color="tertiary" align="center" variant="caption" style={{ flexShrink: 1 }}>
        Completed sets are saved securely to your account. Full offline workout persistence is not
        yet available, so keep the app connected while logging.
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
          disabled={value <= 0}
        />
        <AppText variant="title" style={{ textAlign: 'center', flexShrink: 1 }}>
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
