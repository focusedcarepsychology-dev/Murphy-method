import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function PlanLayout() {
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
      <Stack.Screen name="schedule" options={{ title: 'Weekly Schedule' }} />
      <Stack.Screen name="workout/[workoutId]" options={{ title: 'Workout' }} />
      <Stack.Screen name="exercise/[exerciseId]" options={{ title: 'Exercise' }} />
      <Stack.Screen
        name="swap/[workoutExerciseId]"
        options={{ presentation: 'modal', title: 'Swap Exercise' }}
      />
      <Stack.Screen name="history" options={{ title: 'Programme History' }} />
      <Stack.Screen
        name="why-changed/[decisionId]"
        options={{ presentation: 'modal', title: 'Why did my programme change?' }}
      />
      <Stack.Screen name="reset" options={{ title: 'Reset Plan' }} />
    </Stack>
  );
}
