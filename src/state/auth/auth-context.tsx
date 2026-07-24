import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { getSupabaseClient, type MurphySupabaseClient } from '@/services/supabase/client';
import { mapAuthErrorMessage } from '@/state/auth/auth-errors';
import {
  PASSWORD_RECOVERY_REDIRECT_PATH,
  processAuthDeepLink,
  SIGNUP_CONFIRMATION_REDIRECT_PATH,
} from '@/state/auth/process-auth-deep-link';
import type { AuthContextValue, AuthResult, AuthState, SignUpResult } from '@/state/auth/types';

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

  // Every URL this instance has already run through `handleAuthDeepLink`,
  // by exact string — `Linking.getInitialURL()` and the `'url'` event can
  // both deliver the same cold-start link on some platforms, and a Supabase
  // auth code/token is single-use: a second exchange attempt for a link
  // that already succeeded would come back as a (spurious) failure and
  // incorrectly tell the user their just-used link was invalid.
  const handledDeepLinksRef = useRef<Set<string>>(new Set());
  const [deepLinkNotice, setDeepLinkNotice] = useState<AuthContextValue['deepLinkNotice']>(null);

  const handleAuthDeepLink = useCallback(
    async (url: string) => {
      if (handledDeepLinksRef.current.has(url)) {
        return;
      }
      handledDeepLinksRef.current.add(url);

      const result = await processAuthDeepLink(client, url);
      if (!mountedRef.current || result.outcome === 'ignored') {
        return;
      }

      if (result.outcome === 'failed') {
        setDeepLinkNotice({ kind: result.kind, outcome: 'failed' });
        return;
      }

      // result.outcome === 'established'. Set state directly here rather
      // than relying on `onAuthStateChange` to have classified it: calling
      // `setSession` (the implicit-token branch) always emits `SIGNED_IN`,
      // never `PASSWORD_RECOVERY`, regardless of what the link was for — so
      // a recovery link must be routed to `password_recovery` explicitly, or
      // it would fall through into an ordinary authenticated session
      // (docs/ROUTES.md §3).
      if (result.kind === 'recovery') {
        lastLoadedUserIdRef.current = null;
        setState({ status: 'password_recovery', session: result.session });
      } else {
        applySession(result.session);
      }
      setDeepLinkNotice({ kind: result.kind, outcome: 'established' });
    },
    [client, applySession],
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
      // Defensive fallback only — `handleAuthDeepLink` below is what
      // actually drives this transition for links this app opens.
      if (event === 'PASSWORD_RECOVERY' && session) {
        lastLoadedUserIdRef.current = null;
        setState({ status: 'password_recovery', session });
        return;
      }
      applySession(session);
    });

    let cancelled = false;
    Linking.getInitialURL()
      .then((url) => {
        if (cancelled || !url) return;
        void handleAuthDeepLink(url);
      })
      .catch(() => {
        // Cold-start URL retrieval failing isn't a boot-time auth error —
        // the app just opens as if it had no incoming link.
      });
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthDeepLink(url);
    });

    return () => {
      mountedRef.current = false;
      cancelled = true;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, handleAuthDeepLink]);

  const signUp = useCallback<AuthContextValue['signUp']>(
    async ({ email, password }): Promise<SignUpResult> => {
      const emailRedirectTo = Linking.createURL(SIGNUP_CONFIRMATION_REDIRECT_PATH);
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) {
        return { error: mapAuthErrorMessage(error), needsVerification: false };
      }
      // Supabase returns a null session when email confirmation is required
      // (config.toml auth.email.enable_confirmations — on for this project).
      // The session that confirmation eventually creates comes from
      // `handleAuthDeepLink` processing the tapped link, never from this
      // call directly.
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
      const emailRedirectTo = Linking.createURL(SIGNUP_CONFIRMATION_REDIRECT_PATH);
      const { error } = await client.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo },
      });
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

  const acknowledgeDeepLinkNotice = useCallback(() => {
    setDeepLinkNotice(null);
  }, []);

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
    deepLinkNotice,
    acknowledgeDeepLinkNotice,
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
