import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { TextField } from '@/components/ui/text-field';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import { deleteMyTrainingHistory } from '@/services/settings/settings-repository';
import { clearAllActiveWorkoutCache } from '@/services/workouts/active-workout-cache';
import { clearAllPendingSetLogs } from '@/services/workouts/offline-set-queue';
import { clearAllPendingWorkoutCompletions } from '@/services/workouts/offline-workout-completion-queue';

const CONFIRMATION = 'DELETE WORKOUT HISTORY';

export default function DeleteDataScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client } = useAuthenticatedClient();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    if (confirmation !== CONFIRMATION || deleting) return;
    Alert.alert(
      'Delete workout history?',
      'This permanently deletes workouts, logged sets, personal-record evidence and Momentum Points. Your account, profile, programme settings, measurements and BodyScan data remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => {
            void deleteHistory();
          },
        },
      ],
    );
  }

  async function deleteHistory() {
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await deleteMyTrainingHistory(client, confirmation);
      await Promise.all([
        clearAllPendingSetLogs(),
        clearAllPendingWorkoutCompletions(),
        clearAllActiveWorkoutCache(),
      ]);
      setConfirmation('');
      setMessage(
        `Deleted ${result.workoutsDeleted} ${
          result.workoutsDeleted === 1 ? 'workout' : 'workouts'
        } and the associated training history.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete training history.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Delete data</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Delete specific categories without deleting your entire account.
        </AppText>
      </View>

      <Card style={{ gap: spacing.two }}>
        <Heading variant="section">BodyScan photos</Heading>
        <Caption color="tertiary" style={{ flexShrink: 1 }}>
          BodyScan deletion removes private storage objects and their timeline records.
        </Caption>
        <SecondaryButton
          label="Open BodyScan deletion"
          tone="critical"
          fullWidth={false}
          onPress={() => router.push('/(tabs)/profile/bodyscan-privacy')}
        />
      </Card>

      <Card style={{ gap: spacing.two }}>
        <Heading variant="section">Workout history</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Permanently removes workouts, sets, workout feedback, derived records and Momentum
          activity. It does not remove your profile or BodyScan data.
        </AppText>
        <TextField
          label={`Type ${CONFIRMATION}`}
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <PrimaryButton
          label="Delete workout history"
          tone="critical"
          loading={deleting}
          disabled={confirmation !== CONFIRMATION}
          onPress={confirmDelete}
        />
      </Card>

      {error ? <AppText color="critical">{error}</AppText> : null}
      {message ? <AppText color="positive">{message}</AppText> : null}
    </ScrollScreen>
  );
}
