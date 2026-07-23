import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { MinTouchTarget, WorkoutTouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'brand' | 'critical';
type Size = 'default' | 'large';

type BaseButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  tone?: Tone;
  size?: Size;
  loading?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  /** Escape hatch for a button placed on a non-default-coloured surface. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Inverts to a light-on-brand treatment for buttons placed on a brand-coloured card. */
  onColor?: boolean;
};

function useToneColors(tone: Tone) {
  const { colors } = useTheme();
  return tone === 'critical'
    ? {
        solid: colors.status.critical,
        onSolid: colors.text.inverse,
        outline: colors.status.critical,
        subtleText: colors.status.critical,
      }
    : {
        solid: colors.brand.primary,
        onSolid: colors.brand.onPrimary,
        outline: colors.brand.primary,
        subtleText: colors.brand.primary,
      };
}

/**
 * `{...pressableProps}` is spread *before* our own `accessibilityRole`/
 * `disabled`/`style` on every Pressable below, deliberately — `expo-router`'s
 * `Link asChild` clones its child and injects its own (often `undefined`)
 * `style`/`onPress`, and if that spread lands after ours it silently wins
 * and blanks out the button's visual styling (verified: a `Link asChild`-
 * wrapped `PrimaryButton` rendered with no background at all until this was
 * reordered). Callers should never pass `style` directly anyway — layout
 * overrides go through `containerStyle`.
 */

export function PrimaryButton({
  label,
  tone = 'brand',
  size = 'default',
  loading,
  icon,
  fullWidth = true,
  disabled,
  containerStyle,
  onColor = false,
  ...pressableProps
}: BaseButtonProps) {
  const { radius, spacing, colors } = useTheme();
  const toneColors = useToneColors(tone);
  const isDisabled = disabled || loading;
  const minHeight = size === 'large' ? WorkoutTouchTarget : MinTouchTarget;
  const background = onColor ? colors.brand.onPrimary : toneColors.solid;
  const foreground = onColor ? toneColors.solid : toneColors.onSolid;

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.four,
          backgroundColor: background,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        containerStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} color={foreground} size={20} /> : null}
          <AppText
            variant={size === 'large' ? 'bodyEmphasis' : 'bodyEmphasis'}
            style={{ color: foreground }}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  tone = 'brand',
  size = 'default',
  loading,
  icon,
  fullWidth = true,
  disabled,
  containerStyle,
  onColor = false,
  ...pressableProps
}: BaseButtonProps) {
  const { radius, spacing, colors } = useTheme();
  const toneColors = useToneColors(tone);
  const isDisabled = disabled || loading;
  const minHeight = size === 'large' ? WorkoutTouchTarget : MinTouchTarget;
  const foreground = onColor ? colors.brand.onPrimary : toneColors.subtleText;
  const border = onColor ? colors.brand.onPrimary : toneColors.outline;

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.four,
          backgroundColor: pressed ? colors.surface.sunken : 'transparent',
          borderWidth: 1.5,
          borderColor: border,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        containerStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} color={foreground} size={20} /> : null}
          <AppText variant="bodyEmphasis" style={{ color: foreground }}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

export function TertiaryButton({
  label,
  tone = 'brand',
  icon,
  fullWidth = false,
  disabled,
  ...pressableProps
}: Omit<BaseButtonProps, 'size' | 'loading'>) {
  const { spacing } = useTheme();
  const toneColors = useToneColors(tone);

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? undefined }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: MinTouchTarget,
          paddingHorizontal: spacing.two,
          opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
    >
      <View style={styles.content}>
        {icon ? <Icon name={icon} color={toneColors.subtleText} size={18} /> : null}
        <AppText variant="bodyEmphasis" style={{ color: toneColors.subtleText }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

type IconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: IconName;
  accessibilityLabel: string;
  tone?: Tone;
  variant?: 'filled' | 'plain';
  size?: number;
};

export function IconButton({
  icon,
  accessibilityLabel,
  tone = 'brand',
  variant = 'plain',
  size = MinTouchTarget,
  disabled,
  ...pressableProps
}: IconButtonProps) {
  const { colors, radius } = useTheme();
  const toneColors = useToneColors(tone);

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled ?? undefined }}
      disabled={disabled}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          backgroundColor:
            variant === 'filled'
              ? colors.surface.sunken
              : pressed
                ? colors.surface.sunken
                : 'transparent',
        },
      ]}
    >
      <Icon name={icon} color={toneColors.subtleText} size={22} decorative />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
