import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/button';
import { BODYSCAN_CONSENT_VERSION } from '@/domain/onboarding/consent';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { recordBodyScanConsent } from '@/services/onboarding/onboarding-repository';

/**
 * Explains BodyScan plainly and obtains explicit consent before any
 * capture (docs/SCREEN_SPECIFICATIONS.md §2 "BodyScan Introduction &
 * Consent"). A positive `consent_records` row is only written on
 * affirmative action — reaching this screen, or skipping it, never
 * creates one.
 */
export default function BodyScanIntroScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleConsent() {
    if (!userId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await recordBodyScanConsent(client, userId, true, BODYSCAN_CONSENT_VERSION);
      router.push('/(onboarding)/bodyscan-baseline');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingScaffold
      stepIndex={11}
      title="BodyScan (optional)"
      description="Standardised photos to track visual progress over time."
      nextLabel="Continue to BodyScan"
      onBack={() => router.back()}
      onNext={handleConsent}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.two }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        <AppText color="secondary">
          BodyScan is entirely optional and private — photos are stored only for you, never made
          public, and Murphy Method remains fully useful without it.
        </AppText>
        <AppText color="secondary">
          It&apos;s comparison imagery for tracking visual change over time — not a medical body
          composition measurement.
        </AppText>
        <AppText color="tertiary" variant="supporting">
          You can revisit this later from Progress, and delete any scan at any time.
        </AppText>
        <SecondaryButton
          label="Skip for now"
          onPress={() => router.push('/(onboarding)/bodyscan-baseline')}
          disabled={submitting}
        />
      </View>
    </OnboardingScaffold>
  );
}
