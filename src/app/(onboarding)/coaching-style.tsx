import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SelectionCard } from '@/components/ui/selection-card';
import { COACHING_STYLE_OPTIONS } from '@/domain/onboarding/coaching-styles';
import type { CoachingStyle } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { loadProfile, updateProfile } from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * Requires an explicit choice — no style is pre-selected
 * (docs/IMPLEMENTATION_PLAN.md Phase 3 §19).
 */
export default function CoachingStyleScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [selected, setSelected] = useState<CoachingStyle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    loadProfile(client, userId)
      .then((profile) => {
        setSelected(profile.coachingStyle);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  function retry() {
    setStatus('loading');
    load();
  }

  useEffect(load, [client, userId]);

  async function handleNext() {
    if (!selected || !userId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateProfile(client, userId, { coachingStyle: selected });
      router.push('/(onboarding)/programme-preview');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={13}
        title="Choose your coaching style"
        onNext={() => {}}
        nextDisabled
      >
        <LoadingState accessibilityLabel="Loading" rows={5} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold
        stepIndex={13}
        title="Choose your coaching style"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={13}
      title="Choose your coaching style"
      description="Pick the tone that motivates you — changeable any time later in Profile."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!selected}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.two }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        {COACHING_STYLE_OPTIONS.map((option) => (
          <SelectionCard
            key={option.key}
            label={option.label}
            description={option.description}
            selected={selected === option.key}
            onPress={() => setSelected(option.key)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
