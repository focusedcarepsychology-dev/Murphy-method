import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SelectionCard } from '@/components/ui/selection-card';
import { COACHING_STYLE_OPTIONS } from '@/domain/onboarding/coaching-styles';
import type { CoachingStyle } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadProfile, updateProfile } from '@/services/onboarding/onboarding-repository';

export default function ProfileCoachingStyleScreen() {
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const { status, data, reload } = useAuthenticatedData((c, id) => loadProfile(c, id));
  const [draft, setDraft] = useState<CoachingStyle | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = draft ?? data?.coachingStyle ?? null;

  async function save() {
    if (!userId || !selected || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateProfile(client, userId, { coachingStyle: selected });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save coaching style.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading coaching styles" rows={5} />
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
        <Heading variant="title">Coach style</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Choose the tone you find useful. This changes presentation, never safety rules or facts.
        </AppText>
      </View>

      <View style={{ gap: spacing.two }}>
        {COACHING_STYLE_OPTIONS.map((option) => (
          <SelectionCard
            key={option.key}
            label={option.label}
            description={option.description}
            selected={selected === option.key}
            onPress={() => {
              setDraft(option.key);
              setSaved(false);
            }}
          />
        ))}
      </View>

      {error ? <AppText color="critical">{error}</AppText> : null}
      {saved ? <Caption color="positive">Coach style saved.</Caption> : null}
      <PrimaryButton
        label="Save coach style"
        loading={saving}
        disabled={!selected}
        onPress={save}
      />
    </ScrollScreen>
  );
}
