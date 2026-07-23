import { Redirect } from 'expo-router';

/**
 * Entry route. Real auth/onboarding guards (docs/ROUTES.md §3) land in
 * Phase 2 once session state exists — for Phase 1 this always opens on
 * Welcome, which is also where the dev-preview shortcut into the tab shell
 * lives (see (auth)/welcome.tsx).
 */
export default function Index() {
  return <Redirect href="/welcome" />;
}
