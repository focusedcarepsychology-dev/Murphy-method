import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectionCard } from '@/components/ui/selection-card';
import {
  isNoEquipmentSelection,
  normaliseEquipmentSelection,
  toggleEquipmentSelection,
} from '@/domain/onboarding/equipment-selection';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  listEquipment,
  loadSelectedEquipmentIds,
  setUserEquipment,
  type EquipmentOption,
} from '@/services/onboarding/onboarding-repository';

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
 * Editing equipment after onboarding. Changing this changes what the
 * programme generator is allowed to pick, so the same mutual-exclusion
 * rule applies here as during onboarding, and the server-side
 * `set_user_equipment` RPC remains the only writer either way.
 */
export default function ProfileEquipmentScreen() {
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const { status, data, reload } = useAuthenticatedData(async (c, id) => {
    const [options, selected] = await Promise.all([
      listEquipment(c),
      loadSelectedEquipmentIds(c, id),
    ]);
    return { options, selected: normaliseEquipmentSelection(options, selected) };
  });

  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = data?.options ?? [];
  const selectedIds = draft ?? data?.selected ?? [];

  async function handleSave() {
    if (!userId || saving || selectedIds.length === 0) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await setUserEquipment(client, userId, selectedIds);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading your equipment" rows={4} />
      </ScrollScreen>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ScrollScreen>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">What equipment do you have?</AppText>
        <Caption>
          Only exercises your selection genuinely covers are used in your programme.
        </Caption>
      </View>

      {error ? <AppText color="critical">{error}</AppText> : null}
      {isNoEquipmentSelection(options, selectedIds) ? (
        <AppText color="secondary">
          You will get exercises that need no equipment at all. Pick anything else and this option
          clears.
        </AppText>
      ) : null}

      <View style={{ gap: spacing.four }}>
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
                  onPress={() => {
                    setDraft(toggleEquipmentSelection(options, selectedIds, item.id));
                    setSaved(false);
                  }}
                />
              ))}
            </View>
          );
        })}
      </View>

      {saved ? <Caption color="secondary">Saved.</Caption> : null}
      <PrimaryButton
        label="Save"
        onPress={handleSave}
        loading={saving}
        disabled={selectedIds.length === 0}
      />
    </ScrollScreen>
  );
}
