import { useAuth } from '@/state/auth/auth-context';
import type { MurphySupabaseClient } from '@/services/supabase/client';

/**
 * Convenience accessor for onboarding (and other authenticated-only)
 * screens: the shared Supabase client plus the current user id, or `null`
 * when a session isn't actually established yet. Every screen that uses
 * this is only ever reachable while signed in (route guards,
 * `src/hooks/use-protected-route.ts`) — the `null` case is a defensive
 * fallback for the brief window before that guard resolves, not an
 * expected steady state.
 */
export function useAuthenticatedClient(): {
  client: MurphySupabaseClient;
  userId: string | null;
} {
  const { state, client } = useAuth();
  const userId = state.status === 'signed_in' ? state.session.user.id : null;
  return { client, userId };
}
