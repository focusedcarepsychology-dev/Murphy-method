import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SelectionCard } from '@/components/ui/selection-card';
import { WEEKDAY_OPTIONS } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadProfile, updateProfile } from '@/services/onboarding/onboarding-repository';

export default function ProfileAvailabilityScreen() {
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const { status, data, reload } = useAuthenticatedData((c, id) => loadProfile(c, id));
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = draft ?? data?.availableTrainingDays ?? [];

  function toggle(day: string) {
    setDraft((currentDraft) => {
      const current = currentDraft ?? data?.availableTrainingDays ?? [];
      return current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
    });
    setMessage(null);
  }

  async function save() {
    if (!userId || saving || selected.length === 0) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateProfile(client, userId, { availableTrainingDays: selected });
      setMessage(
        'Availability saved. Restructure your programme when you want the plan to change.',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save availability.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading training availability" rows={5} />
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
        <Heading variant="title">Training availability</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Choose days you can realistically protect. At least one day is required.
        </AppText>
      </View>

      <View style={{ gap: spacing.two }}>
        {WEEKDAY_OPTIONS.map((day) => (
          <SelectionCard
            key={day.key}
            label={day.label}
            selected={selected.includes(day.key)}
            onPress={() => toggle(day.key)}
          />
        ))}
      </View>

      <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">Your current programme stays stable</AppText>
        <Caption color="tertiary" style={{ flexShrink: 1 }}>
          Saving availability does not silently rewrite an active plan. Use Programme restructure
          when you are ready to create a new version and preserve the old one in history.
        </Caption>
      </Card>

      {error ? <AppText color="critical">{error}</AppText> : null}
      {message ? <AppText color="positive">{message}</AppText> : null}
      <PrimaryButton
        label="Save availability"
        loading={saving}
        disabled={selected.length === 0}
        onPress={save}
      />
    </ScrollScreen>
  );
}
