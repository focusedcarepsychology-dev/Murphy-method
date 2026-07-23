import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type LoadingStateProps = {
  accessibilityLabel?: string;
  rows?: number;
};

/**
 * Skeleton placeholders matching content hierarchy, per
 * docs/SCREEN_SPECIFICATIONS.md §0 — not a generic spinner for first load.
 */
export function LoadingState({ accessibilityLabel = 'Loading', rows = 3 }: LoadingStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={{ gap: spacing.three }}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={index}
          style={{
            height: 88,
            borderRadius: radius.lg,
            backgroundColor: colors.surface.sunken,
            opacity: 1 - index * 0.15,
          }}
        />
      ))}
    </View>
  );
}
