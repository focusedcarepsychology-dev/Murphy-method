import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ToggleRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { TextField } from '@/components/ui/text-field';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  loadGamificationDashboard,
  saveGamificationPreferences,
  validateTournamentAlias,
} from '@/services/gamification/gamification-repository';

export default function GamificationSettingsScreen() {
  const { spacing } = useTheme();
  const { client } = useAuthenticatedClient();
  const { status, data, reload } = useAuthenticatedData((authClient) =>
    loadGamificationDashboard(authClient),
  );
  const [aliasDraft, setAliasDraft] = useState<string | null>(null);
  const [optedInDraft, setOptedInDraft] = useState<boolean | null>(null);
  const [celebrationsDraft, setCelebrationsDraft] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const alias = aliasDraft ?? data?.publicAlias ?? '';
  const optedIn = optedInDraft ?? data?.leaderboardOptIn ?? false;
  const celebrations = celebrationsDraft ?? data?.celebrationEffects ?? true;

  const aliasError = optedIn ? (validateTournamentAlias(alias) ?? undefined) : undefined;

  async function save() {
    if (saving || aliasError) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const updated = await saveGamificationPreferences(client, {
        publicAlias: alias.trim(),
        leaderboardOptIn: optedIn,
        celebrationEffects: celebrations,
      });
      setAliasDraft(updated.publicAlias ?? '');
      setOptedInDraft(updated.leaderboardOptIn);
      setCelebrationsDraft(updated.celebrationEffects);
      setSavedMessage(
        updated.leaderboardOptIn
          ? 'You are entered in the current Momentum Cup.'
          : 'Your points and achievements remain private.',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save these settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">Momentum</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Personal points and achievements are private. The ranked tournament is optional and uses
          only the alias you choose here.
        </AppText>
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading Momentum settings" rows={4} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : (
        <>
          <Card style={{ gap: spacing.two }}>
            <Heading variant="section">Your private progress</Heading>
            <AppText variant="bodyEmphasis">{data.lifetimePoints} Momentum Points</AppText>
            <Caption color="tertiary">
              {data.scoredDays} scored {data.scoredDays === 1 ? 'day' : 'days'} ·{' '}
              {data.achievements.filter((item) => item.achievedAt).length} achievements
            </Caption>
          </Card>

          <Card style={{ gap: 0 }}>
            <ToggleRow
              title="Join the ranked tournament"
              subtitle="Show an alias, rank and consistency points to other opted-in members."
              icon="trophy"
              value={optedIn}
              onValueChange={setOptedInDraft}
            />
            <ToggleRow
              title="Celebration effects"
              subtitle="Use restrained haptics and positive completion moments."
              icon="star"
              value={celebrations}
              onValueChange={setCelebrationsDraft}
            />
          </Card>

          <TextField
            label="Public tournament alias"
            value={alias}
            onChangeText={setAliasDraft}
            editable={optedIn}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={24}
            placeholder="For example, WaterfordMover"
            error={aliasError}
          />

          <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
            <Heading variant="bodyEmphasis">Designed for healthy competition</Heading>
            <Caption color="tertiary" style={{ flexShrink: 1 }}>
              No public photos, body measurements or lifted weights. No pay-to-win points. Only one
              completion score per day, with the highest completed mode counting, so extra volume is
              not rewarded.
            </Caption>
          </Card>

          {error ? (
            <AppText color="critical" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          {savedMessage ? (
            <AppText color="positive" accessibilityLiveRegion="polite">
              {savedMessage}
            </AppText>
          ) : null}

          <PrimaryButton label="Save Momentum settings" loading={saving} onPress={save} />
        </>
      )}
    </ScrollScreen>
  );
}
