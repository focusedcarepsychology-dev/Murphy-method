import type { MurphySupabaseClient } from '@/services/supabase/client';
import {
  flushPendingWorkoutCompletions,
  listPendingWorkoutCompletions,
} from '@/services/workouts/offline-workout-completion-queue';

export type ActiveWorkoutReference = {
  id: string;
  mode: 'full' | 'quick' | 'minimum';
  startedAt: string | null;
};

/** Returns the caller's newest unfinished workout, excluding locally completed sessions. */
export async function loadActiveWorkout(
  client: MurphySupabaseClient,
  userId: string,
): Promise<ActiveWorkoutReference | null> {
  try {
    await flushPendingWorkoutCompletions(client, userId);
  } catch {
    // The query below can still resolve from the server. Pending completion
    // ids are filtered locally so an offline-completed workout is never
    // presented as something the user must repeat.
  }

  const pendingIds = new Set(
    (await listPendingWorkoutCompletions(userId)).map((item) => item.workoutId),
  );
  const { data, error } = await client
    .from('workouts')
    .select('id, mode, started_at')
    .eq('profile_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error("Couldn't check for an active workout. Check your connection and try again.");
  }

  const active = (data ?? []).find((row) => !pendingIds.has(row.id));
  return active ? { id: active.id, mode: active.mode, startedAt: active.started_at } : null;
}
