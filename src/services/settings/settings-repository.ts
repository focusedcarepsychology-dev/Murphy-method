import type { MurphySupabaseClient } from '@/services/supabase/client';

export type NotificationPreferences = {
  workoutReminders: boolean;
  missedStartNudges: boolean;
  progressUpdates: boolean;
  bodyScanReminders: boolean;
};

export type ConsentRecord = {
  id: string;
  type: string;
  granted: boolean;
  version: string;
  createdAt: string;
};

export class SettingsRepositoryError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SettingsRepositoryError';
    this.cause = cause;
  }
}

function fail(action: string, error: unknown): never {
  throw new SettingsRepositoryError(
    `Couldn't ${action}. Check your connection and try again.`,
    error,
  );
}

export async function loadNotificationPreferences(
  client: MurphySupabaseClient,
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await client
    .from('notification_preferences')
    .select(
      'profile_id, workout_reminders_enabled, missed_start_nudges_enabled, progress_notifications_enabled, bodyscan_reminders_enabled',
    )
    .eq('profile_id', userId)
    .maybeSingle();
  if (error) fail('load notification preferences', error);
  return {
    workoutReminders: data?.workout_reminders_enabled !== false,
    missedStartNudges: data?.missed_start_nudges_enabled !== false,
    progressUpdates: data?.progress_notifications_enabled !== false,
    bodyScanReminders: data?.bodyscan_reminders_enabled !== false,
  };
}

export async function saveNotificationPreferences(
  client: MurphySupabaseClient,
  userId: string,
  preferences: NotificationPreferences,
): Promise<void> {
  const { error } = await client
    .from('notification_preferences')
    .update({
      workout_reminders_enabled: preferences.workoutReminders,
      missed_start_nudges_enabled: preferences.missedStartNudges,
      progress_notifications_enabled: preferences.progressUpdates,
      bodyscan_reminders_enabled: preferences.bodyScanReminders,
    })
    .eq('profile_id', userId);
  if (error) fail('save notification preferences', error);
}

export async function loadConsentHistory(
  client: MurphySupabaseClient,
  userId: string,
): Promise<ConsentRecord[]> {
  const { data, error } = await client
    .from('consent_records')
    .select('id, profile_id, consent_type, granted, version, created_at')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });
  if (error) fail('load consent history', error);
  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.consent_type,
    granted: row.granted,
    version: row.version,
    createdAt: row.created_at,
  }));
}

export async function loadMyDataExport(client: MurphySupabaseClient): Promise<unknown> {
  const { data, error } = await client.rpc('get_my_data_export');
  if (error) fail('prepare your data export', error);
  return data;
}

export async function deleteMyTrainingHistory(
  client: MurphySupabaseClient,
  confirmation: string,
): Promise<{ workoutsDeleted: number }> {
  const { data, error } = await client.rpc('delete_my_training_history', {
    p_confirmation: confirmation,
  });
  if (error) fail('delete your training history', error);
  const value = data as { workoutsDeleted?: unknown } | null;
  return {
    workoutsDeleted:
      typeof value?.workoutsDeleted === 'number' && Number.isFinite(value.workoutsDeleted)
        ? value.workoutsDeleted
        : 0,
  };
}

export async function deleteMyAccount(
  client: MurphySupabaseClient,
  confirmation: string,
): Promise<void> {
  const { error } = await client.rpc('delete_my_account', { p_confirmation: confirmation });
  if (error) fail('delete your account', error);
}
