import type { Session } from '@supabase/supabase-js';

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
  | { status: 'error'; message: string };

export type AuthResult = { error: string | null };
export type SignUpResult = AuthResult & { needsVerification: boolean };

export type AuthContextValue = {
  state: AuthState;
  signUp: (input: { email: string; password: string }) => Promise<SignUpResult>;
  signIn: (input: { email: string; password: string }) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPasswordForEmail: (email: string) => Promise<AuthResult>;
  resendVerificationEmail: (email: string) => Promise<AuthResult>;
  /** Re-fetches the profile-routing fields after a `profileStatus: 'error'`. */
  retryProfileLoad: () => void;
  /**
   * Re-checks the current session (Verify Email's "I've verified" action,
   * docs/SCREEN_SPECIFICATIONS.md §1) — a verification link opened as a
   * deep link already flows through onAuthStateChange automatically; this
   * covers the case where the user verified via a browser and returns to
   * the app manually.
   */
  refreshSession: () => Promise<void>;
};
