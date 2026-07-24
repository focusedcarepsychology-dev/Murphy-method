import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/state/auth/auth-context';

const AUTH_GROUP = '(auth)';
const ONBOARDING_GROUP = '(onboarding)';

/**
 * Central route guard (docs/ROUTES.md §3). Lives once at the app root
 * rather than duplicated per route-group `_layout.tsx`, so there is a
 * single source of truth for "where should this session be routed right
 * now?" — the exact thing that makes redirect loops possible if two
 * layouts disagree.
 *
 * Deliberately does nothing while `status === 'initialising'` or
 * `profileStatus !== 'ready'` — redirecting on incomplete information is
 * what causes both redirect flicker and incorrect routing (Phase 2 §5, §8).
 */
export function useProtectedRoute() {
  const { state } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'initialising') {
      return;
    }

    const currentGroup = segments[0] as string | undefined;

    if (state.status === 'password_recovery') {
      // Deliberately does not fall through to the signed_in branches below
      // — a recovery session must never route into (tabs)/(onboarding), it
      // only ever goes to the reset-password screen (docs/ROUTES.md §3
      // correction, Phase 2A).
      const onResetPassword =
        currentGroup === AUTH_GROUP && (segments as readonly string[])[1] === 'reset-password';
      if (!onResetPassword) {
        router.replace('/(auth)/reset-password');
      }
      return;
    }

    if (state.status === 'signed_out' || state.status === 'error') {
      if (currentGroup !== AUTH_GROUP) {
        router.replace('/(auth)/welcome');
      }
      return;
    }

    // state.status === 'signed_in' from here on.
    if (state.profileStatus !== 'ready') {
      // 'loading': resolves on its own shortly. 'error': a blocking retry
      // overlay is rendered at the root instead of guessing a redirect.
      return;
    }

    const onboardingComplete = state.onboardingCompletedAt !== null;

    if (!onboardingComplete) {
      if (currentGroup !== ONBOARDING_GROUP) {
        router.replace('/(onboarding)/introduction');
      }
      return;
    }

    if (currentGroup === AUTH_GROUP || currentGroup === ONBOARDING_GROUP) {
      router.replace('/(tabs)/today');
    }
  }, [state, segments, router]);
}
