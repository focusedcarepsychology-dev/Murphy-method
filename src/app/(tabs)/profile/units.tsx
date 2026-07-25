import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { UnitPreference } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/hooks/use-theme-preference';
import { loadProfile, updateProfile } from '@/services/onboarding/onboarding-repository';

export default function UnitsScreen() {
  const { spacing } = useTheme();
  const { preference, setPreference } = useThemePreference();
  const { client, userId } = useAuthenticatedClient();
  const { status, data, reload } = useAuthenticatedData((c, id) => loadProfile(c, id));
  const [unitPreference, setUnitPreference] = useState<UnitPreference | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveUnitPreference = unitPreference ?? data?.unitPreference ?? null;

  async function saveUnits() {
    if (!userId || !effectiveUnitPreference || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateProfile(client, userId, { unitPreference: effectiveUnitPreference });
      setUnitPreference(effectiveUnitPreference);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save unit preference.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading units and appearance" rows={3} />
      </ScrollScreen>
    );
  }
  if (status === 'error' || effectiveUnitPreference === null) {
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
      <Heading variant="title">Units & appearance</Heading>

      <View style={{ gap: spacing.two }}>
        <Caption>APPEARANCE</Caption>
        <Card>
          <SegmentedControl
            accessibilityLabel="Appearance"
            value={preference}
            onChange={(value) => setPreference(value as typeof preference)}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Card>
      </View>

      <View style={{ gap: spacing.two }}>
        <Caption>UNITS</Caption>
        <Card style={{ gap: spacing.two }}>
          <SegmentedControl
            accessibilityLabel="Measurement units"
            value={effectiveUnitPreference}
            onChange={(value) => {
              setUnitPreference(value as UnitPreference);
              setSaved(false);
            }}
            options={[
              { value: 'metric', label: 'Metric' },
              { value: 'imperial', label: 'Imperial' },
            ]}
          />
          <AppText color="secondary">
            {effectiveUnitPreference === 'metric'
              ? 'Kilograms and centimetres'
              : 'Pounds and inches'}
          </AppText>
        </Card>
      </View>

      {error ? <AppText color="critical">{error}</AppText> : null}
      {saved ? <Caption color="positive">Unit preference saved.</Caption> : null}
      <PrimaryButton label="Save units" loading={saving} onPress={saveUnits} />
    </ScrollScreen>
  );
}
