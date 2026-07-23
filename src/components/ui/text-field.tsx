import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { MinTouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'onChangeText'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  /** Field-level error, shown below the field and announced to screen readers. */
  error?: string;
  /** Adds a show/hide toggle; still renders as a secure field until toggled. */
  isPassword?: boolean;
};

/**
 * Shared text input primitive for forms (docs/DESIGN_SYSTEM.md §7). Not
 * workout-mode-specific (that uses the numeric stepper, see set-logger.tsx).
 */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  isPassword = false,
  editable = true,
  ...inputProps
}: TextFieldProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={{ gap: spacing.one }}>
      <Caption color={hasError ? 'critical' : 'secondary'}>{label}</Caption>
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          secureTextEntry={isPassword && !revealed}
          placeholderTextColor={colors.text.disabled}
          accessibilityLabel={label}
          style={[
            typography.body,
            {
              color: colors.text.primary,
              minHeight: MinTouchTarget,
              borderRadius: radius.sm,
              borderWidth: 1.5,
              borderColor: hasError ? colors.status.critical : colors.border.default,
              backgroundColor: editable ? colors.surface.default : colors.surface.sunken,
              paddingHorizontal: spacing.three,
              paddingRight: isPassword ? spacing.six : spacing.three,
            },
          ]}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={8}
            style={{
              position: 'absolute',
              right: spacing.two,
              width: MinTouchTarget,
              height: MinTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={revealed ? 'eyeOff' : 'eye'}
              color={colors.text.tertiary}
              size={20}
              decorative
            />
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <AppText variant="supporting" color="critical" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
