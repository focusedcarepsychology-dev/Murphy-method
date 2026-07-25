import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { TextField } from '@/components/ui/text-field';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { deleteAllBodyScans } from '@/services/bodyscan/bodyscan-repository';
import { useTheme } from '@/hooks/use-theme';
import { deleteMyAccount } from '@/services/settings/settings-repository';

const CONFIRMATION = 'DELETE MY ACCOUNT';

export default function DeleteAccountScreen() {
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    if (confirmation !== CONFIRMATION || deleting) return;
    Alert.alert(
      'Permanently delete your account?',
      'This removes your sign-in identity and all associated app data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void deleteAccount();
          },
        },
      ],
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      if (!userId) throw new Error('Your signed-in account could not be verified.');
      await deleteAllBodyScans(client, userId);
      await deleteMyAccount(client, confirmation);
      await client.auth.signOut({ scope: 'local' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete your account.');
      setDeleting(false);
    }
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Delete account</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Permanent deletion removes your identity, profile, programmes, workouts, measurements,
          private BodyScan database records and Momentum activity.
        </AppText>
      </View>

      <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">Before deleting</AppText>
        <Caption color="tertiary" style={{ flexShrink: 1 }}>
          Export your data first. Account deletion cannot be reversed and is separate from deleting
          only workout history or BodyScan photos.
        </Caption>
      </Card>

      <TextField
        label={`Type ${CONFIRMATION}`}
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {error ? <AppText color="critical">{error}</AppText> : null}
      <PrimaryButton
        label="Permanently delete my account"
        tone="critical"
        loading={deleting}
        disabled={confirmation !== CONFIRMATION}
        onPress={confirmDelete}
      />
    </ScrollScreen>
  );
}
