/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference } from '@/hooks/use-theme-preference';

export function useTheme() {
  const systemScheme = useColorScheme();
  const { preference } = useThemePreference();

  const scheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  return {
    scheme,
    isDark: scheme === 'dark',
    colors: Colors[scheme],
    spacing: Spacing,
    radius: Radius,
    typography: Typography,
    elevation: Elevation[scheme],
  };
}
