import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SelectionCard } from '@/components/ui/selection-card';
import { WEEKDAY_OPTIONS } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { loadProfile, updateProfile } from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

export default function AvailabilityScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    loadProfile(client, userId)
      .then((profile) => {
        setSelectedDays(profile.availableTrainingDays ?? []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  function retry() {
    setStatus('loading');
    load();
  }

  useEffect(load, [client, userId]);

  function toggle(key: string) {
    setSelectedDays((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function handleNext() {
    if (selectedDays.length === 0 || !userId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateProfile(client, userId, { availableTrainingDays: selectedDays });
      router.push('/(onboarding)/workout-duration');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold stepIndex={7} title="When can you train?" onNext={() => {}} nextDisabled>
        <LoadingState accessibilityLabel="Loading" rows={3} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold stepIndex={7} title="When can you train?" onNext={() => {}} nextDisabled>
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={7}
      title="When can you train?"
      description="Pick the days you're realistically able to train — at least one is required."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={selectedDays.length === 0}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.two }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        {WEEKDAY_OPTIONS.map((day) => (
          <SelectionCard
            key={day.key}
            label={day.label}
            selected={selectedDays.includes(day.key)}
            onPress={() => toggle(day.key)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
