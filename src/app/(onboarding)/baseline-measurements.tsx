import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { TextField } from '@/components/ui/text-field';
import { inToCm, roundTo2Decimals } from '@/domain/onboarding/units';
import type { UnitPreference } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import {
  insertBaselineMeasurements,
  loadProfile,
  type BaselineMetric,
} from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

const FIELDS: { metric: BaselineMetric; label: string }[] = [
  { metric: 'waist', label: 'Waist' },
  { metric: 'chest', label: 'Chest' },
  { metric: 'hips', label: 'Hips' },
  { metric: 'arm', label: 'Arm' },
  { metric: 'thigh', label: 'Thigh' },
  { metric: 'calf', label: 'Calf' },
];

/**
 * Fully optional (docs/SCREEN_SPECIFICATIONS.md §2 "Baseline
 * Measurements") — no field here can ever block onboarding. Only values
 * the user actually typed are written; empty fields are simply skipped.
 */
export default function BaselineMeasurementsScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [unit, setUnit] = useState<UnitPreference>('metric');
  const [values, setValues] = useState<Partial<Record<BaselineMetric, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    loadProfile(client, userId)
      .then((profile) => {
        setUnit(profile.unitPreference);
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
    if (!userId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const toInsert: Partial<Record<BaselineMetric, number>> = {};
      for (const { metric } of FIELDS) {
        const raw = values[metric];
        if (!raw) continue;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) continue;
        toInsert[metric] = unit === 'imperial' ? inToCm(parsed) : roundTo2Decimals(parsed);
      }
      await insertBaselineMeasurements(client, userId, toInsert);
      router.push('/(onboarding)/bodyscan-intro');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={10}
        title="Baseline measurements"
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
        stepIndex={10}
        title="Baseline measurements"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  const unitLabel = unit === 'imperial' ? 'in' : 'cm';

  return (
    <OnboardingScaffold
      stepIndex={10}
      title="Baseline measurements"
      description={`Every field is optional — there's no scale requirement. Enter in ${unitLabel}, or skip entirely.`}
      onBack={() => router.back()}
      onNext={handleNext}
      nextLabel={Object.values(values).some(Boolean) ? 'Save & Continue' : 'Skip for now'}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.three }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        {FIELDS.map((field) => (
          <TextField
            key={field.metric}
            label={`${field.label} (${unitLabel})`}
            value={values[field.metric] ?? ''}
            onChangeText={(text) => setValues((current) => ({ ...current, [field.metric]: text }))}
            keyboardType="decimal-pad"
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
