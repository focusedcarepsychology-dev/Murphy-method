import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useNavigationTheme } from '@/hooks/use-navigation-theme';
import { ThemePreferenceProvider } from '@/hooks/use-theme-preference';

SplashScreen.preventAutoHideAsync();

/**
 * Reads the resolved Murphy theme (`useNavigationTheme` → `useTheme`) rather
 * than the system colour scheme directly, so this stays in sync with the
 * manual light/dark override that Murphy UI components already honour.
 * Must render inside `ThemePreferenceProvider`.
 */
function AppNavigation() {
  const navigationTheme = useNavigationTheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <AppNavigation />
    </ThemePreferenceProvider>
  );
}
