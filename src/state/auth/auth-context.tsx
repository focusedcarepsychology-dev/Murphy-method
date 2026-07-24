import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { getSupabaseClient, type MurphySupabaseClient } from '@/services/supabase/client';
import { mapAuthErrorMessage } from '@/state/auth/auth-errors';
import type { AuthContextValue, AuthResult, AuthState, SignUpResult } from '@/state/auth/types';

/**
 * Deep link the password-recovery email points at (`(auth)/reset-password`,
 * matching the Expo Router path). Must be registered as an allowed redirect
 * URL in the Supabase project's Auth settings — local dev's `supabase/config.toml`
 * already allows `murphymethod://**`; Phase 2B must add the equivalent for
 * the remote project (`docs/SUPABASE_SETUP.md` §6).
 */
const PASSWORD_RECOVERY_REDIRECT_PATH = 'reset-password';

const AuthContext = createContext<AuthContextValue | null>(null);

export type AuthProviderProps = PropsWithChildren<{
  /**
   * Test/mocking boundary (docs/IMPLEMENTATION_PLAN.md Phase 2 §4, §14):
   * inject a fake `MurphySupabaseClient` in tests instead of the real
   * lazily-created singleton, so Jest never depends on real Supabase
   * configuration or a network call.
   */
  client?: MurphySupabaseClient;
}>;

async function fetchOnboardingStatus(
  client: MurphySupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }
  return data.onboarding_completed_at;
}

export function AuthProvider({ children, client: injectedClient }: AuthProviderProps) {
  // Lazy initializer so this only ever runs once per mount (React 19 +
  // React Compiler flag reading a ref's `.current` during render, since
  // ref access is meant for effects/handlers, not render — a state lazy
  // initializer is the correct tool for "compute once, never changes").
  const [client] = useState<MurphySupabaseClient>(() => injectedClient ?? getSupabaseClient());
  const [state, setState] = useState<AuthState>({ status: 'initialising' });
  const mountedRef = useRef(true);

  const loadProfile = useCallback(
    async (session: Session) => {
      try {
        const onboardingCompletedAt = await fetchOnboardingStatus(client, session.user.id);
        if (!mountedRef.current) return;
        setState({
          status: 'signed_in',
          session,
          profileStatus: 'ready',
          onboardingCompletedAt,
        });
      } catch {
        if (!mountedRef.current) return;
        setState((previous) =>
          previous.status === 'signed_in' && previous.session.user.id === session.user.id
            ? { ...previous, profileStatus: 'error' }
            : previous,
        );
      }
    },
    [client],
  );

  // Tracks which user's profile-routing state is currently loaded, so a
  // same-user re-emission of onAuthStateChange (e.g. TOKEN_REFRESHED, which
  // fires roughly hourly) updates the session object in place instead of
  // resetting profileStatus to 'loading' — resetting it every refresh would
  // flicker already-visible private content back to a loading state, which
  // docs/IMPLEMENTATION_PLAN.md Phase 2 §5 explicitly requires avoiding.
  const lastLoadedUserIdRef = useRef<string | null>(null);

  const applySession = useCallback(
    (session: Session | null) => {
      if (!session) {
        lastLoadedUserIdRef.current = null;
        setState({ status: 'signed_out' });
        return;
      }

      if (lastLoadedUserIdRef.current === session.user.id) {
        setState((previous) =>
          previous.status === 'signed_in' && previous.session.user.id === session.user.id
            ? { ...previous, session }
            : previous,
        );
        return;
      }

      lastLoadedUserIdRef.current = session.user.id;
      setState({
        status: 'signed_in',
        session,
        profileStatus: 'loading',
        onboardingCompletedAt: null,
      });
      void loadProfile(session);
    },
    [loadProfile],
  );

  useEffect(() => {
    mountedRef.current = true;

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mountedRef.current) return;
        if (error) {
          setState({ status: 'error', message: mapAuthErrorMessage(error) });
          return;
        }
        applySession(data.session);
      })
      .catch((error: unknown) => {
        if (!mountedRef.current) return;
        setState({ status: 'error', message: mapAuthErrorMessage(error) });
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      // A password-recovery link opened as a deep link: this session is
      // scoped to setting a new password, not to using the app as this
      // user (see AuthState['password_recovery'] and useProtectedRoute).
      if (event === 'PASSWORD_RECOVERY' && session) {
        lastLoadedUserIdRef.current = null;
        setState({ status: 'password_recovery', session });
        return;
      }
      applySession(session);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const signUp = useCallback<AuthContextValue['signUp']>(
    async ({ email, password }): Promise<SignUpResult> => {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) {
        return { error: mapAuthErrorMessage(error), needsVerification: false };
      }
      // Supabase returns a null session when email confirmation is required
      // (config.toml auth.email.enable_confirmations — on for this project).
      return { error: null, needsVerification: data.session === null };
    },
    [client],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(
    async ({ email, password }): Promise<AuthResult> => {
      const { error } = await client.auth.signInWithPassword({ email, password });
      return { error: error ? mapAuthErrorMessage(error) : null };
    },
    [client],
  );

  const signOut = useCallback<AuthContextValue['signOut']>(async (): Promise<AuthResult> => {
    const { error } = await client.auth.signOut();
    return { error: error ? mapAuthErrorMessage(error) : null };
  }, [client]);

  const resetPasswordForEmail = useCallback<AuthContextValue['resetPasswordForEmail']>(
    async (email): Promise<AuthResult> => {
      const redirectTo = Linking.createURL(PASSWORD_RECOVERY_REDIRECT_PATH);
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      return { error: error ? mapAuthErrorMessage(error) : null };
    },
    [client],
  );

  const updatePasswordAndSignOut = useCallback<AuthContextValue['updatePasswordAndSignOut']>(
    async (newPassword): Promise<AuthResult> => {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        return { error: mapAuthErrorMessage(error) };
      }
      // The recovery session's only purpose was setting this password —
      // sign it out so the user lands back on Sign In with the new one,
      // rather than leaving a recovery-scoped session live.
      await client.auth.signOut();
      return { error: null };
    },
    [client],
  );

  const resendVerificationEmail = useCallback<AuthContextValue['resendVerificationEmail']>(
    async (email): Promise<AuthResult> => {
      const { error } = await client.auth.resend({ type: 'signup', email });
      return { error: error ? mapAuthErrorMessage(error) : null };
    },
    [client],
  );

  const retryProfileLoad = useCallback(() => {
    setState((previous) => {
      if (previous.status !== 'signed_in') return previous;
      void loadProfile(previous.session);
      return { ...previous, profileStatus: 'loading' };
    });
  }, [loadProfile]);

  const refreshSession = useCallback(async (): Promise<void> => {
    const { data } = await client.auth.getSession();
    applySession(data.session);
  }, [client, applySession]);

  const value: AuthContextValue = {
    state,
    signUp,
    signIn,
    signOut,
    resetPasswordForEmail,
    updatePasswordAndSignOut,
    resendVerificationEmail,
    retryProfileLoad,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() must be called within an AuthProvider.');
  }
  return context;
}
