import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/**
 * Independent stack outside (tabs) so an active workout survives tab
 * navigation away and back (docs/ROUTES.md §6). State itself will live in
 * the client-side domain layer from Phase 6 onward — this phase only
 * builds the route/visual shell. Guarded (authenticated + onboarding
 * complete) by the central guard in src/hooks/use-protected-route.ts.
 */
export default function WorkoutLayout() {
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
      <Stack.Screen
        name="[workoutId]/overview"
        options={{ presentation: 'modal', title: 'Overview' }}
      />
      <Stack.Screen
        name="[workoutId]/active"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="[workoutId]/exercise/[workoutExerciseId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="[workoutId]/summary"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
