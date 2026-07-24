import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';
import { LoadingState } from '@/components/ui/loading-state';
import { Screen } from '@/components/ui/screen';
import { computeFirstIncompleteRequiredStep } from '@/domain/onboarding/progress';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { pathForStepId } from '@/onboarding/steps';
import { loadOnboardingSnapshot } from '@/services/onboarding/onboarding-repository';

type ResumeCheck = 'checking' | 'introduction' | 'redirecting';

/**
 * Sets expectations before any input is required
 * (docs/SCREEN_SPECIFICATIONS.md §2 "Introduction"): brief, becomes more
 * personalised over time, responses are editable later, fitness/wellness
 * framing with no exaggerated AI claims. No data write happens on this
 * screen — there's nothing to persist yet.
 *
 * This is also the entry point `useProtectedRoute` (`ROUTES.md` §3 rule 2)
 * always redirects an incomplete-onboarding session to, regardless of how
 * far they'd already gotten — so on mount, this screen itself checks
 * whether real progress already exists and, if so, silently forwards to
 * the true first incomplete required step instead of showing Introduction
 * again ("resume after app restart", docs/IMPLEMENTATION_PLAN.md Phase 3
 * §24). A brand-new user (nothing started yet) sees Introduction normally.
 */
export default function IntroductionScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const [resumeCheck, setResumeCheck] = useState<ResumeCheck>('checking');

  function checkResume() {
    if (!userId) return;
    loadOnboardingSnapshot(client, userId)
      .then((snapshot) => {
        const firstIncomplete = computeFirstIncompleteRequiredStep(snapshot);
        const target = firstIncomplete
          ? pathForStepId(firstIncomplete)
          : pathForStepId('programme_preview');
        if (firstIncomplete === 'basic_profile') {
          setResumeCheck('introduction');
        } else {
          setResumeCheck('redirecting');
          router.replace(target);
        }
      })
      .catch(() => {
        // Best-effort resume check only — if it fails, fall back to
        // showing Introduction rather than blocking the user entirely.
        setResumeCheck('introduction');
      });
  }

  useEffect(checkResume, [client, userId, router]);

  if (resumeCheck !== 'introduction') {
    return (
      <Screen>
        <LoadingState accessibilityLabel="Loading" rows={2} />
      </Screen>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={0}
      title="Let's build your plan"
      description="A few quick questions about your goals, experience, and schedule — about 3–6 minutes — so we can build a starting programme around you."
      nextLabel="Get Started"
      onNext={() => router.push('/(onboarding)/basic-profile')}
    >
      <View style={{ gap: spacing.two }}>
        <AppText color="secondary">
          Your programme gets more personalised over time as you train — this isn&apos;t a one-time
          questionnaire.
        </AppText>
        <AppText color="secondary">
          Everything you tell us here can be changed later in your Profile.
        </AppText>
        <AppText color="tertiary" variant="supporting">
          Murphy Method is fitness and wellness software, not a medical service.
        </AppText>
      </View>
    </OnboardingScaffold>
  );
}
