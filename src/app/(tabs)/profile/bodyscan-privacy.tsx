import { Alert, View } from 'react-native';
import { useState } from 'react';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { deleteAllBodyScans, listBodyScans } from '@/services/bodyscan/bodyscan-repository';
import {
  hasGrantedBodyScanConsent,
  recordBodyScanConsent,
} from '@/services/onboarding/onboarding-repository';

export default function BodyScanPrivacyScreen() {
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { status, data, reload } = useAuthenticatedData(async (authClient, id) => {
    const [consented, scans] = await Promise.all([
      hasGrantedBodyScanConsent(authClient, id),
      listBodyScans(authClient, id),
    ]);
    return { consented, scans };
  });

  async function confirmDeletion() {
    if (!userId || deleting) return;
    Alert.alert(
      'Delete all BodyScan photos?',
      'This permanently removes every private BodyScan photo and timeline entry. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => {
            void deleteEverything();
          },
        },
      ],
    );
  }

  async function deleteEverything() {
    if (!userId || deleting) return;
    setDeleting(true);
    setActionError(null);
    setMessage(null);
    try {
      const deleted = await deleteAllBodyScans(client, userId);
      await recordBodyScanConsent(client, userId, false, 'bodyscan-capture-v1');
      setMessage(
        `Deleted ${deleted.photosDeleted} private ${
          deleted.photosDeleted === 1 ? 'photo' : 'photos'
        } from ${deleted.scansDeleted} ${deleted.scansDeleted === 1 ? 'BodyScan' : 'BodyScans'}.`,
      );
      reload();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not delete your BodyScan data.',
      );
    } finally {
      setDeleting(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading BodyScan privacy settings" rows={4} />
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

  const photoCount = data.scans.reduce((total, scan) => total + scan.images.length, 0);

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">BodyScan privacy</Heading>
        <Caption style={{ flexShrink: 1 }}>
          BodyScan photos are optional and stored in a private bucket under your account.
        </Caption>
      </View>

      <Card style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">Current status</AppText>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Consent: {data.consented ? 'granted' : 'not currently granted'}
        </AppText>
        <AppText color="secondary">
          {data.scans.length} {data.scans.length === 1 ? 'BodyScan' : 'BodyScans'} · {photoCount}{' '}
          private {photoCount === 1 ? 'photo' : 'photos'}
        </AppText>
      </Card>

      <Card style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">How viewing works</AppText>
        <Caption style={{ flexShrink: 1 }}>
          The app opens photos using short-lived signed links. It does not create public photo URLs,
          estimate body fat or make medical assessments from your images.
        </Caption>
      </Card>

      {message ? (
        <Card>
          <AppText color="secondary" style={{ flexShrink: 1 }}>
            {message}
          </AppText>
        </Card>
      ) : null}
      {actionError ? (
        <Card>
          <AppText color="critical" style={{ flexShrink: 1 }}>
            {actionError}
          </AppText>
        </Card>
      ) : null}

      <PrimaryButton
        label={photoCount > 0 ? 'Delete all BodyScan data' : 'No BodyScan data to delete'}
        tone="critical"
        onPress={confirmDeletion}
        loading={deleting}
        disabled={photoCount === 0}
      />

      <Caption color="tertiary" style={{ flexShrink: 1 }}>
        Deletion first removes private storage objects and then removes their database records. If
        storage deletion fails, the records remain so the action can be retried safely.
      </Caption>
    </ScrollScreen>
  );
}
