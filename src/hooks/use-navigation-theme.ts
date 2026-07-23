import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/**
 * Derives the Expo Router / React Navigation theme from the same resolved
 * Murphy theme every UI component consumes (`useTheme`), so a manual
 * light/dark override updates navigation chrome (header, tab bar, screen
 * background) in lockstep with app content instead of drifting from a
 * second, independent theme resolution.
 */
export function useNavigationTheme(): Theme {
  const { isDark, colors } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;

  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: colors.brand.primary,
      background: colors.background.default,
      card: colors.surface.raised,
      text: colors.text.primary,
      border: colors.border.default,
      notification: colors.status.critical,
    },
  };
}
