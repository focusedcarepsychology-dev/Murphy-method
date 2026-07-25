import type { PropsWithChildren } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type CardVariant = 'standard' | 'hero' | 'quiet';

export type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  variant?: CardVariant;
}>;

/** Standard raised surface used across Today/Progress/Plan cards. */
export function Card({ children, style, elevated, variant = 'standard' }: CardProps) {
  const { colors, radius, spacing, elevation } = useTheme();
  const shouldElevate = elevated ?? variant === 'standard';
  const variantStyle: ViewStyle =
    variant === 'hero'
      ? {
          backgroundColor: colors.brand.primarySubtle,
          borderColor: colors.border.subtle,
          borderWidth: 1,
        }
      : variant === 'quiet'
        ? {
            backgroundColor: colors.background.subtle,
            borderWidth: 0,
          }
        : {
            backgroundColor: colors.surface.raised,
            borderColor: colors.border.subtle,
            borderWidth: 1,
          };

  return (
    <View
      style={[
        {
          borderRadius: variant === 'hero' ? radius.lg : radius.md,
          padding: spacing.four,
        },
        variantStyle,
        shouldElevate ? elevation.level1 : null,
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
    variant?: Exclude<CardVariant, 'hero'>;
  }
>;

/** Tappable card variant — navigates or opens a detail view. */
export function InteractiveCard({
  children,
  style,
  showChevron = true,
  accessibilityLabel,
  disabled,
  variant = 'standard',
  ...pressableProps
}: InteractiveCardProps) {
  const { colors, radius, spacing, elevation, motion } = useTheme();
  const quiet = variant === 'quiet';

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled ?? undefined }}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: quiet ? colors.background.subtle : colors.surface.raised,
          borderRadius: radius.md,
          padding: spacing.four,
          borderWidth: quiet ? 0 : 1,
          borderColor: colors.border.subtle,
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? motion.pressScale : 1 }],
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.three,
        },
        quiet ? null : elevation.level1,
        style,
      ]}
    >
      <View style={{ flex: 1 }}>{children}</View>
      {showChevron ? <Icon name="chevronRight" color={colors.text.tertiary} size={20} /> : null}
    </Pressable>
  );
}
