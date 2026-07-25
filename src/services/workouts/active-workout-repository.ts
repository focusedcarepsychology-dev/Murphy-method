import type { MurphySupabaseClient } from '@/services/supabase/client';

export type ActiveWorkoutReference = {
  id: string;
  mode: 'full' | 'quick' | 'minimum';
  startedAt: string | null;
};

/** Returns the caller's newest unfinished workout, or null when none exists. */
export async function loadActiveWorkout(
  client: MurphySupabaseClient,
  userId: string,
): Promise<ActiveWorkoutReference | null> {
  const { data, error } = await client
    .from('workouts')
    .select('id, mode, started_at')
    .eq('profile_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Couldn't check for an active workout. Check your connection and try again.");
  }
  if (!data) return null;
  return { id: data.id, mode: data.mode, startedAt: data.started_at };
}
