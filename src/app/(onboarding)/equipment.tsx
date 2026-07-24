import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectionCard } from '@/components/ui/selection-card';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import {
  listEquipment,
  loadSelectedEquipmentIds,
  setUserEquipment,
  type EquipmentOption,
} from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

const CATEGORY_LABELS: Record<EquipmentOption['category'], string> = {
  bodyweight: 'No equipment',
  free_weight: 'Free weights',
  accessory: 'Accessories',
  machine: 'Machines',
};

const CATEGORY_ORDER: EquipmentOption['category'][] = [
  'bodyweight',
  'free_weight',
  'accessory',
  'machine',
];

/**
 * Multi-select checklist grouped by category (docs/SCREEN_SPECIFICATIONS.md
 * §2 "Available Equipment"). The seeded `bodyweight` row is the
 * unambiguous "no equipment" choice — selecting only it is a fully valid,
 * required-satisfying answer, not a lesser fallback.
 */
export default function EquipmentScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [options, setOptions] = useState<EquipmentOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    Promise.all([listEquipment(client), loadSelectedEquipmentIds(client, userId)])
      .then(([equipmentOptions, selected]) => {
        setOptions(equipmentOptions);
        setSelectedIds(selected);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  function retry() {
    setStatus('loading');
    load();
  }

  useEffect(load, [client, userId]);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function handleNext() {
    if (selectedIds.length === 0 || !userId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await setUserEquipment(client, userId, selectedIds);
      router.push('/(onboarding)/availability');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={6}
        title="What equipment do you have?"
        onNext={() => {}}
        nextDisabled
      >
        <LoadingState accessibilityLabel="Loading equipment" rows={4} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold
        stepIndex={6}
        title="What equipment do you have?"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={6}
      title="What equipment do you have?"
      description="Select everything you can realistically use. Training with bodyweight only is a fully supported choice."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={selectedIds.length === 0}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.four }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        {CATEGORY_ORDER.map((category) => {
          const items = options.filter((option) => option.category === category);
          if (items.length === 0) return null;
          return (
            <View key={category} style={{ gap: spacing.two }}>
              <SectionHeader title={CATEGORY_LABELS[category]} />
              {items.map((item) => (
                <SelectionCard
                  key={item.id}
                  label={item.label}
                  selected={selectedIds.includes(item.id)}
                  onPress={() => toggle(item.id)}
                />
              ))}
            </View>
          );
        })}
      </View>
    </OnboardingScaffold>
  );
}
