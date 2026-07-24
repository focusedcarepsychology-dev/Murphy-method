import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

// The forward-redirect-if-authenticated guard (docs/ROUTES.md §3) lives
// centrally in src/hooks/use-protected-route.ts (wired at the app root),
// not per-group, so there is a single source of truth for routing decisions.
export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background.default },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text.primary },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ title: 'Sign Up' }} />
      <Stack.Screen name="sign-in" options={{ title: 'Sign In' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Reset Password' }} />
      <Stack.Screen name="verify-email" options={{ title: 'Verify Email' }} />
    </Stack>
  );
}
