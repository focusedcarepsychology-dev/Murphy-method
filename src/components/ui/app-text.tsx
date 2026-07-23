import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type AppTextVariant =
  | 'hero'
  | 'title'
  | 'section'
  | 'body'
  | 'bodyEmphasis'
  | 'supporting'
  | 'supportingEmphasis'
  | 'caption';

export type AppTextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'disabled'
  | 'brand'
  | 'positive'
  | 'warning'
  | 'critical';

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  color?: AppTextColor;
  align?: 'left' | 'center' | 'right';
};

function resolveColor(colors: ReturnType<typeof useTheme>['colors'], color: AppTextColor) {
  switch (color) {
    case 'secondary':
      return colors.text.secondary;
    case 'tertiary':
      return colors.text.tertiary;
    case 'inverse':
      return colors.text.inverse;
    case 'disabled':
      return colors.text.disabled;
    case 'brand':
      return colors.brand.primary;
    case 'positive':
      return colors.status.positive;
    case 'warning':
      return colors.status.warning;
    case 'critical':
      return colors.status.critical;
    case 'primary':
    default:
      return colors.text.primary;
  }
}

/**
 * Base text primitive. Font size/line-height come from the semantic
 * typography scale (docs/DESIGN_SYSTEM.md §4) and respect the OS text-size
 * setting via React Native's default `allowFontScaling` behaviour.
 */
export function AppText({
  variant = 'body',
  color = 'primary',
  align,
  style,
  ...rest
}: AppTextProps) {
  const { colors, typography } = useTheme();

  return (
    <Text
      style={[
        typography[variant] as object,
        { color: resolveColor(colors, color) },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}

export function Heading({ variant = 'title', style, ...rest }: AppTextProps) {
  return <AppText variant={variant} accessibilityRole="header" style={style} {...rest} />;
}

export function BodyText({ variant = 'body', ...rest }: AppTextProps) {
  return <AppText variant={variant} {...rest} />;
}

export function Caption({ variant = 'caption', color = 'secondary', ...rest }: AppTextProps) {
  return <AppText variant={variant} color={color} {...rest} />;
}
