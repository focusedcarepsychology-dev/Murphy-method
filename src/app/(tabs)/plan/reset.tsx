import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton, TertiaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { regenerateCurrentProgramme } from '@/services/programme/programme-repository';

export default function ResetPlanScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client } = useAuthenticatedClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRestructure() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await regenerateCurrentProgramme(client);
      router.replace('/(tabs)/plan');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not restructure your programme.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollScreen contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ gap: spacing.two }}>
        <Heading variant="title">Reset or restructure your plan</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          This creates a new programme from your current goals, equipment, availability, experience
          and safety answers. Your existing programme is preserved in history rather than deleted.
        </AppText>
      </View>

      <Card style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">Before continuing</AppText>
        <Caption style={{ flexShrink: 1 }}>
          Review your profile settings first if your circumstances have changed. You cannot restructure
          while a workout is in progress; resume and finish that workout before returning here.
        </Caption>
      </Card>

      {error ? (
        <Card>
          <AppText color="critical" style={{ flexShrink: 1 }}>
            {error}
          </AppText>
        </Card>
      ) : null}

      <View style={{ gap: spacing.two, marginTop: 'auto' }}>
        <PrimaryButton
          label="Create restructured programme"
          onPress={handleRestructure}
          loading={saving}
        />
        <TertiaryButton label="Cancel" fullWidth onPress={() => router.back()} disabled={saving} />
      </View>
    </ScrollScreen>
  );
}
