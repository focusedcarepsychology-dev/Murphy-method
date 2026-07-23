import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function TodayLayout() {
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
      <Stack.Screen
        name="readiness"
        options={{ presentation: 'modal', title: 'Daily Readiness' }}
      />
    </Stack>
  );
}
