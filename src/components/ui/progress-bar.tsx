import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type ProgressBarProps = {
  /** 0–1 */
  value: number;
  tone?: 'brand' | 'positive' | 'warning' | 'critical';
  accessibilityLabel: string;
};

export function ProgressBar({ value, tone = 'brand', accessibilityLabel }: ProgressBarProps) {
  const { colors, radius } = useTheme();
  const clamped = Math.min(1, Math.max(0, value));

  const fillColor =
    tone === 'positive'
      ? colors.status.positive
      : tone === 'warning'
        ? colors.status.warning
        : tone === 'critical'
          ? colors.status.critical
          : colors.brand.primary;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height: 8,
        borderRadius: radius.pill,
        backgroundColor: colors.surface.sunken,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
}
