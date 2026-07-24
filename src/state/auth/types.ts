import type { Session } from '@supabase/supabase-js';

import type { MurphySupabaseClient } from '@/services/supabase/client';
import type { AuthDeepLinkKind } from '@/state/auth/process-auth-deep-link';

/**
 * Explicit auth states (docs/IMPLEMENTATION_PLAN.md Phase 2 §5). Route
 * guards (src/app/_layout.tsx and per-group layouts) switch on `status`,
 * never on ad-hoc booleans, so there is exactly one source of truth for
 * "where should this session be routed right now?"
 */
export type AuthState =
  | { status: 'initialising' }
  | { status: 'signed_out' }
  | {
      status: 'signed_in';
      session: Session;
      /**
       * `onboarding_completed_at` read from the user's own profiles row
       * (docs/ROUTES.md §3 rule 2). `profileStatus` is tracked separately
       * from `status` so a slow/failed profile read never gets confused
       * with "not signed in" — a route guard sees signed_in immediately,
       * and can render its own loading/error state for the profile read
       * specifically (docs/IMPLEMENTATION_PLAN.md Phase 2 §17 "profile-loading failure").
       */
      profileStatus: 'loading' | 'ready' | 'error';
      onboardingCompletedAt: string | null;
    }
  | { status: 'error'; message: string }
  | {
      /**
       * Opening a password-recovery link establishes a real Supabase
       * session (Supabase emits `PASSWORD_RECOVERY`, not `SIGNED_IN`), but
       * that session is scoped to setting a new password, not to using the
       * app as this user — it must never be treated as an ordinary
       * `signed_in` session by the route guard (docs/ROUTES.md §3), or the
       * guard would route the user straight into the app before they've
       * set a new password. Kept as its own status for exactly that reason.
       */
      status: 'password_recovery';
      session: Session;
    };

export type AuthResult = { error: string | null };
export type SignUpResult = AuthResult & { needsVerification: boolean };

/**
 * The outcome of the most recent auth email link (signup confirmation or
 * password recovery) this provider processed, for the relevant screen to
 * react to — e.g. Verify Email showing "that link is invalid or expired"
 * when `kind: 'signup'` fails. `null` once acknowledged
 * (`acknowledgeDeepLinkNotice`) or before any link has been processed.
 */
export type DeepLinkNotice = { kind: AuthDeepLinkKind; outcome: 'established' | 'failed' };

export type AuthContextValue = {
  state: AuthState;
  /**
   * The single shared Supabase client instance driving this provider
   * (docs/IMPLEMENTATION_PLAN.md Phase 2 §4, §14 test/mocking boundary).
   * Onboarding/domain services (`src/services/onboarding`) read this
   * rather than calling `getSupabaseClient()` directly, so a test that
   * injects `<AuthProvider client={mock}>` transparently covers every
   * authenticated call the app makes, not just auth itself.
   */
  client: MurphySupabaseClient;
  signUp: (input: { email: string; password: string }) => Promise<SignUpResult>;
  signIn: (input: { email: string; password: string }) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPasswordForEmail: (email: string) => Promise<AuthResult>;
  /**
   * Completes the recovery flow `resetPasswordForEmail` started: only
   * meaningful while `state.status === 'password_recovery'`. Signs the
   * recovery session out on success so the user returns to Sign In with
   * their new password, rather than leaving a recovery-scoped session
   * live (docs/IMPLEMENTATION_PLAN.md Phase 2A correction pass).
   */
  updatePasswordAndSignOut: (newPassword: string) => Promise<AuthResult>;
  resendVerificationEmail: (email: string) => Promise<AuthResult>;
  /** Re-fetches the profile-routing fields after a `profileStatus: 'error'`. */
  retryProfileLoad: () => void;
  /**
   * Re-checks the current session (Verify Email's "I've verified" action,
   * docs/SCREEN_SPECIFICATIONS.md §1) — a verification link opened as a
   * deep link already establishes the session via the app's incoming-link
   * handler (`state/auth/process-auth-deep-link.ts`) as soon as it's
   * tapped; this covers the case where the user verified via a browser and
   * returns to the app manually.
   */
  refreshSession: () => Promise<void>;
  /** See {@link DeepLinkNotice}. */
  deepLinkNotice: DeepLinkNotice | null;
  /** Marks the current `deepLinkNotice` as handled, resetting it to `null`. */
  acknowledgeDeepLinkNotice: () => void;
};
