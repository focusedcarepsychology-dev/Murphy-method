import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { TextField } from '@/components/ui/text-field';
import { DISPLAY_NAME_MAX_LENGTH, validateDisplayName } from '@/domain/profile/greeting';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadViewerProfile, updateDisplayName } from '@/services/training/training-repository';

/**
 * The name here is optional in the strongest sense: leaving it empty is a
 * supported end state, not an unfinished one. Nothing downstream depends
 * on it (programme generation included), and the app greets the user
 * without a name rather than inventing one.
 */
export default function PersonalDetailsScreen() {
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const { status, data, reload } = useAuthenticatedData((c, id) => loadViewerProfile(c, id));

  // `null` means "not edited yet", so the field shows the saved name as
  // soon as it loads without an effect writing state back into itself.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const name = draft ?? data?.displayName ?? '';

  async function handleSave() {
    if (!userId || saving) return;
    const validation = validateDisplayName(name);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      await updateDisplayName(client, userId, validation.value);
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
        <LoadingState accessibilityLabel="Loading your details" rows={2} />
      </ScrollScreen>
    );
  }

  if (status === 'error') {
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
      <Card style={{ gap: spacing.three }}>
        <View style={{ gap: spacing.one }}>
          <AppText variant="bodyEmphasis">What should we call you?</AppText>
          <Caption>
            Optional. Used to greet you in the app. Leave it empty and we will just say hello.
          </Caption>
        </View>
        <TextField
          label="Name"
          value={name}
          onChangeText={(value) => {
            setDraft(value);
            setSaved(false);
          }}
          error={error ?? undefined}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Your name"
        />
        {saved ? <Caption color="secondary">Saved.</Caption> : null}
        <PrimaryButton label="Save" onPress={handleSave} loading={saving} fullWidth={false} />
      </Card>

      <Caption color="tertiary">
        Date of birth, height and weight are recorded during onboarding. Editing them here is not
        built yet.
      </Caption>
    </ScrollScreen>
  );
}
