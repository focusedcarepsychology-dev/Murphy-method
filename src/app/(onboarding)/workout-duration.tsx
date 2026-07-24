import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SelectionCard } from '@/components/ui/selection-card';
import { SESSION_DURATION_OPTIONS_MINUTES } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { loadProfile, updateProfile } from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

export default function WorkoutDurationScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    loadProfile(client, userId)
      .then((profile) => {
        setSelected(profile.preferredSessionDurationMinutes);
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
      await updateProfile(client, userId, { preferredSessionDurationMinutes: selected });
      router.push('/(onboarding)/safety-screening');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={8}
        title="How long should sessions be?"
        onNext={() => {}}
        nextDisabled
      >
        <LoadingState accessibilityLabel="Loading" rows={3} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold
        stepIndex={8}
        title="How long should sessions be?"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={8}
      title="How long should sessions be?"
      description="A target, not a hard limit — your programme sizes sessions around it."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!selected}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.two }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        {SESSION_DURATION_OPTIONS_MINUTES.map((minutes) => (
          <SelectionCard
            key={minutes}
            label={`${minutes} minutes`}
            selected={selected === minutes}
            onPress={() => setSelected(minutes)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
