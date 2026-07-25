import { useState } from 'react';
import { Share, View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { loadMyDataExport } from '@/services/settings/settings-repository';

export default function DataExportScreen() {
  const { spacing } = useTheme();
  const { client } = useAuthenticatedClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState(false);

  async function prepareAndShare() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setPrepared(false);
    try {
      const data = await loadMyDataExport(client);
      const json = JSON.stringify(data, null, 2);
      await Share.share({
        title: 'Murphy Method data export',
        message: json,
      });
      setPrepared(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not prepare your export.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Export your data</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Prepare an owner-scoped JSON copy of your profile, programme, workouts, logged sets,
          measurements, consent history and Momentum activity.
        </AppText>
      </View>

      <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">Private photos are handled separately</AppText>
        <Caption color="tertiary" style={{ flexShrink: 1 }}>
          The export includes BodyScan dates and camera angles, not private storage paths, signed
          links or the photo files themselves. Photos remain available only inside BodyScan.
        </Caption>
      </Card>

      {loading ? <LoadingState accessibilityLabel="Preparing data export" rows={2} /> : null}
      {error ? (
        <Card>
          <ErrorState
            title="Couldn't prepare the export"
            description={error}
            onRetry={prepareAndShare}
          />
        </Card>
      ) : null}
      {prepared ? (
        <AppText color="positive" accessibilityLiveRegion="polite">
          Your device share sheet received the export.
        </AppText>
      ) : null}

      <PrimaryButton
        label="Prepare and share JSON export"
        icon="share"
        loading={loading}
        onPress={prepareAndShare}
      />
    </ScrollScreen>
  );
}
