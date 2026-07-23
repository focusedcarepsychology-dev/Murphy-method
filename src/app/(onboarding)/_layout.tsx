import { Stack } from 'expo-router';

// Guard (authenticated + onboarding incomplete, docs/ROUTES.md §3) lives
// centrally in src/hooks/use-protected-route.ts (wired at the app root).
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
