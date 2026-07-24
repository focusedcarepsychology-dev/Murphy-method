import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BodyMap } from '@/components/onboarding/body-map';
import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText, Caption } from '@/components/ui/app-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectionCard } from '@/components/ui/selection-card';
import { BODY_AREA_OPTIONS, type BodyAreaKey } from '@/domain/onboarding/body-areas';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import {
  loadSelectedBodyAreaKeys,
  replaceBodyAreaGoals,
} from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * Optional step (docs/SCREEN_SPECIFICATIONS.md §2 "Interactive Body Goal
 * Map") — zero selections is a fully valid outcome, so Next is never
 * disabled here. The map is a visual convenience; the list below it is the
 * accessible, screen-reader-friendly equivalent selector covering the same
 * 13 regions (docs/DESIGN_SYSTEM.md §8).
 */
export default function BodyGoalMapScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selectedKeys, setSelectedKeys] = useState<BodyAreaKey[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    loadSelectedBodyAreaKeys(client, userId)
      .then((keys) => {
        setSelectedKeys(keys);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  function retry() {
    setStatus('loading');
    load();
  }

  useEffect(load, [client, userId]);

  function toggle(key: BodyAreaKey) {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function handleNext() {
    if (!userId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await replaceBodyAreaGoals(client, userId, selectedKeys);
      router.push('/(onboarding)/training-experience');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={4}
        title="Where would you like to focus?"
        onNext={() => {}}
        nextDisabled
      >
        <LoadingState accessibilityLabel="Loading body-area goals" rows={3} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold
        stepIndex={4}
        title="Where would you like to focus?"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={4}
      title="Where would you like to focus?"
      description="Optional — this guides emphasis within your plan. Training a body area can't selectively remove fat there; that's not physiologically possible."
      onBack={() => router.back()}
      onNext={handleNext}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.four }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}

        <SegmentedControl
          accessibilityLabel="Body view"
          value={view}
          onChange={(value) => setView(value as 'front' | 'back')}
          options={[
            { value: 'front', label: 'Front' },
            { value: 'back', label: 'Back' },
          ]}
        />

        <BodyMap view={view} selectedKeys={selectedKeys} onToggle={toggle} />

        <View style={{ gap: spacing.two }}>
          <Caption>OR SELECT FROM A LIST</Caption>
          {BODY_AREA_OPTIONS.filter((option) => option.view === view).map((option) => (
            <SelectionCard
              key={option.key}
              label={option.label}
              selected={selectedKeys.includes(option.key)}
              onPress={() => toggle(option.key)}
            />
          ))}
        </View>
      </View>
    </OnboardingScaffold>
  );
}
