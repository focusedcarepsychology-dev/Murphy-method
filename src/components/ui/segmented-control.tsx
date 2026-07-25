import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MinTouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentedControlOption<T extends string = string> = {
  value: T;
  label: string;
  accessibilityLabel?: string;
};

export type SegmentedControlProps<T extends string = string> = {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Compact, single-choice control for mode and view selection. */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const { colors, radius, spacing, motion } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          gap: spacing.one,
          backgroundColor: colors.surface.sunken,
          borderRadius: radius.md,
          padding: spacing.one,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              minHeight: MinTouchTarget,
              paddingHorizontal: spacing.two,
              paddingVertical: spacing.two,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              backgroundColor: selected ? colors.surface.raised : 'transparent',
              opacity: pressed ? 0.78 : 1,
              transform: [{ scale: pressed ? motion.pressScale : 1 }],
            })}
          >
            <AppText
              variant="supportingEmphasis"
              color={selected ? 'primary' : 'secondary'}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
