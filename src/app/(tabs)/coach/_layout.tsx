import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function CoachLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.default },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text.primary },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="insight" options={{ title: 'Insight' }} />
      <Stack.Screen name="motivation-profile" options={{ title: 'Motivation Profile' }} />
      <Stack.Screen name="reset-plan" options={{ title: 'Reset My Plan' }} />
      <Stack.Screen name="accountability-settings" options={{ title: 'Accountability' }} />
    </Stack>
  );
}
