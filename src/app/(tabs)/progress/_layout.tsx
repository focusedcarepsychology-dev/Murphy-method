import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function ProgressLayout() {
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
      <Stack.Screen name="goal-journey" options={{ title: 'Goal Journey' }} />
      <Stack.Screen name="strength" options={{ title: 'Strength' }} />
      <Stack.Screen name="measurements" options={{ title: 'Measurements' }} />
      <Stack.Screen name="records" options={{ title: 'Personal Records' }} />
      <Stack.Screen name="consistency" options={{ title: 'Consistency' }} />
      <Stack.Screen name="bodyscan/index" options={{ title: 'BodyScan' }} />
      <Stack.Screen
        name="bodyscan/new"
        options={{ presentation: 'modal', title: 'New BodyScan' }}
      />
      <Stack.Screen name="bodyscan/compare" options={{ title: 'Compare Scans' }} />
      <Stack.Screen name="review" options={{ title: 'Progress Review' }} />
      <Stack.Screen name="pathway" options={{ title: 'Adaptive Work Pathway' }} />
    </Stack>
  );
}
