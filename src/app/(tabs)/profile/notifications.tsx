import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ToggleRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '@/services/settings/settings-repository';

export default function NotificationsScreen() {
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const { status, data, reload } = useAuthenticatedData((c, id) =>
    loadNotificationPreferences(c, id),
  );
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preferences = draft ?? data;

  async function save() {
    if (!userId || !preferences || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveNotificationPreferences(client, userId, preferences);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save notification settings.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading notification settings" rows={4} />
      </ScrollScreen>
    );
  }
  if (status === 'error' || !preferences) {
    return (
      <ScrollScreen>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  const change = (key: keyof NotificationPreferences, value: boolean) => {
    setDraft({ ...preferences, [key]: value });
    setSaved(false);
  };

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Notifications</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Choose which reminders the scheduling service may send. Device permission is requested
          separately by the operating system.
        </AppText>
      </View>

      <Card style={{ gap: 0 }}>
        <ToggleRow
          title="Workout reminders"
          subtitle="Reminders before planned sessions"
          icon="notifications"
          value={preferences.workoutReminders}
          onValueChange={(value) => change('workoutReminders', value)}
        />
        <ToggleRow
          title="Missed-start nudges"
          subtitle="A gentle follow-up after a planned start is missed"
          icon="timer"
          value={preferences.missedStartNudges}
          onValueChange={(value) => change('missedStartNudges', value)}
        />
        <ToggleRow
          title="Progress updates"
          subtitle="Occasional summaries from real completed activity"
          icon="progress"
          value={preferences.progressUpdates}
          onValueChange={(value) => change('progressUpdates', value)}
        />
        <ToggleRow
          title="BodyScan reminders"
          subtitle="Optional reminders for consistent comparison photos"
          icon="camera"
          value={preferences.bodyScanReminders}
          onValueChange={(value) => change('bodyScanReminders', value)}
        />
      </Card>

      {error ? <AppText color="critical">{error}</AppText> : null}
      {saved ? <Caption color="positive">Notification preferences saved.</Caption> : null}
      <PrimaryButton label="Save notifications" loading={saving} onPress={save} />
    </ScrollScreen>
  );
}
