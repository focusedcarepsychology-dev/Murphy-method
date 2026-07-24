import { Stack } from 'expo-router';

import { useOnboardingForwardGuard } from '@/hooks/use-onboarding-guard';

// Guard (authenticated + onboarding incomplete, docs/ROUTES.md §3) lives
// centrally in src/hooks/use-protected-route.ts (wired at the app root).
// The forward-navigation guard (blocking a jump past an incomplete
// required step) is specific to this group, so it's wired here instead.
export default function OnboardingLayout() {
  useOnboardingForwardGuard();
  return <Stack screenOptions={{ headerShown: false }} />;
}
