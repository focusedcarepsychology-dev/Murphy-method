import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SelectionCard } from '@/components/ui/selection-card';
import type { TrainingExperience } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { loadProfile, updateProfile } from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

const OPTIONS: { key: TrainingExperience; label: string; description: string }[] = [
  {
    key: 'beginner',
    label: 'Beginner',
    description: 'New to structured training, or returning after a long break.',
  },
  {
    key: 'recreational',
    label: 'Recreational',
    description: 'Train fairly regularly, comfortable with the basics.',
  },
  {
    key: 'intermediate',
    label: 'Intermediate',
    description: 'Consistent structured training for a year or more.',
  },
];

export default function TrainingExperienceScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [selected, setSelected] = useState<TrainingExperience | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    loadProfile(client, userId)
      .then((profile) => {
        setSelected(profile.trainingExperience);
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
      await updateProfile(client, userId, { trainingExperience: selected });
      router.push('/(onboarding)/equipment');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={5}
        title="Your training experience"
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
        stepIndex={5}
        title="Your training experience"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={5}
      title="Your training experience"
      description="This sets a sensible starting point — it adapts from here based on how training actually goes."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!selected}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.two }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        {OPTIONS.map((option) => (
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
