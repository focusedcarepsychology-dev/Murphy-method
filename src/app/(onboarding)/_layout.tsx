import { Stack } from 'expo-router';

// Guard (authenticated + onboarding incomplete, docs/ROUTES.md §3) is Phase 2 —
// there is no session/profile state yet for it to check.
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
