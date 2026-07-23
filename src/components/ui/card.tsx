import type { PropsWithChildren } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}>;

/** Standard raised surface used across Today/Progress/Plan cards. */
export function Card({ children, style, elevated = true }: CardProps) {
  const { colors, radius, spacing, elevation } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface.raised,
          borderRadius: radius.lg,
          padding: spacing.four,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        },
        elevated ? elevation.level1 : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export type InteractiveCardProps = PropsWithChildren<
  Omit<PressableProps, 'style' | 'children'> & {
    style?: StyleProp<ViewStyle>;
    showChevron?: boolean;
    accessibilityLabel: string;
  }
>;

/** Tappable card variant — navigates or opens a detail view. */
export function InteractiveCard({
  children,
  style,
  showChevron = true,
  accessibilityLabel,
  disabled,
  ...pressableProps
}: InteractiveCardProps) {
  const { colors, radius, spacing, elevation } = useTheme();

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled ?? undefined }}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface.raised,
          borderRadius: radius.lg,
          padding: spacing.four,
          borderWidth: 1,
          borderColor: colors.border.subtle,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.three,
        },
        elevation.level1,
        style,
      ]}
    >
      <View style={{ flex: 1 }}>{children}</View>
      {showChevron ? <Icon name="chevronRight" color={colors.text.tertiary} size={20} /> : null}
    </Pressable>
  );
}
