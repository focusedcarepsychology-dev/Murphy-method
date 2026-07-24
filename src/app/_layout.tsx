import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConfigurationErrorScreen } from '@/components/dev/configuration-error-screen';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { isSupabaseConfigured } from '@/config/env';
import { useNavigationTheme } from '@/hooks/use-navigation-theme';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useTheme } from '@/hooks/use-theme';
import { ThemePreferenceProvider } from '@/hooks/use-theme-preference';
import { AuthProvider, useAuth } from '@/state/auth/auth-context';

SplashScreen.preventAutoHideAsync();

/**
 * Reads the resolved Murphy theme (`useNavigationTheme` → `useTheme`) rather
 * than the system colour scheme directly, so this stays in sync with the
 * manual light/dark override that Murphy UI components already honour.
 * Must render inside `ThemePreferenceProvider`.
 *
 * The route guard (`useProtectedRoute`, docs/ROUTES.md §3) runs here,
 * unconditionally — it only ever redirects, it never blocks rendering
 * itself. Blocking states (initialising, a boot-time auth error, a
 * profile-loading failure) are rendered as an opaque overlay on top of the
 * `Stack` rather than replacing it, so `useSegments()`/`useRouter()` keep a
 * real navigator to operate against throughout.
 */
function AppNavigation() {
  const navigationTheme = useNavigationTheme();
  const { colors } = useTheme();
  const { state, refreshSession, retryProfileLoad } = useAuth();
  useProtectedRoute();

  useEffect(() => {
    if (state.status !== 'initialising') {
      SplashScreen.hideAsync();
    }
  }, [state.status]);

  const blockingOverlay =
    state.status === 'error' ? (
      <ErrorState
        title="Can't connect"
        description={state.message}
        onRetry={() => void refreshSession()}
      />
    ) : state.status === 'signed_in' && state.profileStatus === 'error' ? (
      <ErrorState
        title="Can't load your profile"
        description="Check your connection and try again."
        onRetry={retryProfileLoad}
      />
    ) : state.status === 'initialising' ? (
      <LoadingState accessibilityLabel="Loading your session" />
    ) : null;

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout" />
      </Stack>
      {blockingOverlay ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.overlay,
            { backgroundColor: colors.background.default },
          ]}
        >
          {blockingOverlay}
        </View>
      ) : null}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      {isSupabaseConfigured ? (
        <AuthProvider>
          <AppNavigation />
        </AuthProvider>
      ) : (
        <ConfigurationErrorScreen />
      )}
    </ThemePreferenceProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
