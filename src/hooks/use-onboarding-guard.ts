import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { computeFirstIncompleteRequiredStep } from '@/domain/onboarding/progress';
import { loadOnboardingSnapshot } from '@/services/onboarding/onboarding-repository';
import {
  onboardingSteps,
  pathForStepId,
  stepIndexById,
  type OnboardingStepId,
} from '@/onboarding/steps';
import { useAuth } from '@/state/auth/auth-context';

function stepIdForSlug(slug: string): OnboardingStepId | null {
  const match = onboardingSteps.find((step) => step.path.endsWith(`/${slug}`));
  return match ? match.id : null;
}

/**
 * Forward-navigation guard (`ROUTES.md` §3 rule 2: "forward navigation past
 * an incomplete required step is blocked by the step screen itself, not by
 * the router"). Wired once in `(onboarding)/_layout.tsx` rather than per
 * screen, and re-checks on every in-group navigation so a deep link/typed
 * URL straight to a later required step (e.g. Safety Screening before
 * Basic Profile) redirects back to the true first incomplete step.
 *
 * Deliberately non-blocking: it never renders a loading state of its own
 * and only redirects when it actually detects a forward-skip, so ordinary
 * sequential navigation (the common case, where the check always passes)
 * has no visible effect. This is a UX convenience, not the security
 * boundary — `complete_onboarding` (supabase/migrations) is the
 * authoritative server-side check that can never be bypassed by racing
 * this client-side redirect.
 */
export function useOnboardingForwardGuard(): void {
  const { state, client } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (state.status !== 'signed_in' || state.profileStatus !== 'ready') return;
    if (segments[0] !== '(onboarding)') return;

    const slug = (segments as readonly string[])[1] as string | undefined;
    const currentStepId = slug ? stepIdForSlug(slug) : null;
    if (!currentStepId) return;

    let cancelled = false;
    loadOnboardingSnapshot(client, state.session.user.id)
      .then((snapshot) => {
        if (cancelled) return;
        const firstIncomplete = computeFirstIncompleteRequiredStep(snapshot);
        if (!firstIncomplete) return;
        if (stepIndexById(currentStepId) > stepIndexById(firstIncomplete)) {
          router.replace(pathForStepId(firstIncomplete));
        }
      })
      .catch(() => {
        // Best-effort only — see doc comment above.
      });

    return () => {
      cancelled = true;
    };
  }, [state, segments, client, router]);
}
