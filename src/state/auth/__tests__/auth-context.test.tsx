import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { AuthProvider, useAuth } from '@/state/auth/auth-context';
import { createMockSession, createMockSupabaseClient } from '@/test-utils/mock-supabase-client';

// `Linking.createURL` needs the Expo Constants manifest that only a full
// `renderRouter`-driven app tree provides (see src/app/__tests__/route-guards.test.tsx);
// this file drives AuthProvider directly via renderHook, so the manifest
// is never populated — mock the one call this module makes.
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `murphymethod://${path}`),
}));

function wrapperFor(client: ReturnType<typeof createMockSupabaseClient>['client']) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <AuthProvider client={client}>{children}</AuthProvider>;
  };
}

describe('AuthProvider / useAuth', () => {
  it('resolves to signed_out with no session (starting from initialising)', async () => {
    const mock = createMockSupabaseClient();
    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });

    // `renderHook` itself is async and lets the initial getSession() promise
    // resolve before returning, so `initialising` may already have flipped
    // to `signed_out` by this point — asserting eventual convergence (not
    // a synchronous snapshot mid-transition) is what's actually observable
    // and meaningful here.
    expect(['initialising', 'signed_out']).toContain(result.current.state.status);

    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));
  });

  it('resolves to signed_in and loads onboarding status when a session already exists', async () => {
    const mock = createMockSupabaseClient();
    mock.setInitialSession(createMockSession());
    mock.mockProfileResponse({ onboarding_completed_at: '2026-01-01T00:00:00.000Z' });

    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });

    await waitFor(() => expect(result.current.state.status).toBe('signed_in'));
    await waitFor(() => {
      if (result.current.state.status !== 'signed_in') throw new Error('not signed in yet');
      expect(result.current.state.profileStatus).toBe('ready');
    });

    const state = result.current.state;
    if (state.status !== 'signed_in') throw new Error('expected signed_in');
    expect(state.onboardingCompletedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('transitions signed_out -> signed_in when onAuthStateChange fires (sign-in success)', async () => {
    const mock = createMockSupabaseClient();
    mock.mockProfileResponse({ onboarding_completed_at: null });

    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));

    await act(async () => {
      mock.emitAuthStateChange('SIGNED_IN', createMockSession());
    });

    await waitFor(() => expect(result.current.state.status).toBe('signed_in'));
    const state = result.current.state;
    if (state.status !== 'signed_in') throw new Error('expected signed_in');
    expect(state.onboardingCompletedAt).toBeNull();
  });

  it('surfaces a profile-loading failure as profileStatus: error without crashing', async () => {
    const mock = createMockSupabaseClient();
    mock.setInitialSession(createMockSession());
    mock.mockProfileResponse(null, new Error('network down'));

    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });

    await waitFor(() => {
      const state = result.current.state;
      if (state.status !== 'signed_in') throw new Error('not signed in yet');
      expect(state.profileStatus).toBe('error');
    });
  });

  it('retryProfileLoad re-fetches after a profile-loading failure', async () => {
    const mock = createMockSupabaseClient();
    mock.setInitialSession(createMockSession());
    mock.mockProfileResponse(null, new Error('network down'));

    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });

    await waitFor(() => {
      const state = result.current.state;
      if (state.status !== 'signed_in') throw new Error('not signed in yet');
      expect(state.profileStatus).toBe('error');
    });

    mock.mockProfileResponse({ onboarding_completed_at: null });
    await act(async () => {
      result.current.retryProfileLoad();
    });

    await waitFor(() => {
      const state = result.current.state;
      if (state.status !== 'signed_in') throw new Error('not signed in yet');
      expect(state.profileStatus).toBe('ready');
    });
  });

  it('does not reset profileStatus/onboardingCompletedAt on a same-user re-emission (e.g. token refresh) — no redirect flicker', async () => {
    const mock = createMockSupabaseClient();
    const session = createMockSession();
    mock.setInitialSession(session);
    mock.mockProfileResponse({ onboarding_completed_at: '2026-01-01T00:00:00.000Z' });

    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => {
      const state = result.current.state;
      if (state.status !== 'signed_in') throw new Error('not signed in yet');
      expect(state.profileStatus).toBe('ready');
    });

    mock.from.mockClear();
    await act(async () => {
      mock.emitAuthStateChange('TOKEN_REFRESHED', { ...session, access_token: 'refreshed-token' });
    });

    const state = result.current.state;
    if (state.status !== 'signed_in') throw new Error('expected signed_in');
    expect(state.profileStatus).toBe('ready');
    expect(state.onboardingCompletedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('sign-in success returns no error', async () => {
    const mock = createMockSupabaseClient();
    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));

    let response: Awaited<ReturnType<typeof result.current.signIn>> | undefined;
    await act(async () => {
      response = await result.current.signIn({
        email: 'user-a@example.com',
        password: 'correct-password',
      });
    });

    expect(response?.error).toBeNull();
    expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user-a@example.com',
      password: 'correct-password',
    });
  });

  it('sign-in failure returns a safe, non-technical error message', async () => {
    const mock = createMockSupabaseClient();
    mock.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: new Error('Invalid login credentials'),
    });

    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));

    let response: Awaited<ReturnType<typeof result.current.signIn>> | undefined;
    await act(async () => {
      response = await result.current.signIn({ email: 'user-a@example.com', password: 'wrong' });
    });

    expect(response?.error).toBe('Incorrect email or password.');
  });

  it('sign-up requiring verification is reported via needsVerification', async () => {
    const mock = createMockSupabaseClient();
    mock.auth.signUp.mockResolvedValueOnce({ data: { session: null, user: {} }, error: null });

    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));

    let response: Awaited<ReturnType<typeof result.current.signUp>> | undefined;
    await act(async () => {
      response = await result.current.signUp({ email: 'new@example.com', password: 'aB1!aB1!' });
    });

    expect(response).toEqual({ error: null, needsVerification: true });
  });

  it('password-reset request never reveals whether the email exists (always no-error on success)', async () => {
    const mock = createMockSupabaseClient();
    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));

    let response: Awaited<ReturnType<typeof result.current.resetPasswordForEmail>> | undefined;
    await act(async () => {
      response = await result.current.resetPasswordForEmail('maybe-not-registered@example.com');
    });

    expect(response?.error).toBeNull();
  });

  it('password-reset request sends a redirectTo pointing at the reset-password deep link', async () => {
    const mock = createMockSupabaseClient();
    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));

    await act(async () => {
      await result.current.resetPasswordForEmail('user-a@example.com');
    });

    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user-a@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('reset-password') }),
    );
  });

  it('opening a password-recovery link sets status: password_recovery, not signed_in', async () => {
    const mock = createMockSupabaseClient();
    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));

    await act(async () => {
      mock.emitAuthStateChange('PASSWORD_RECOVERY', createMockSession());
    });

    expect(result.current.state.status).toBe('password_recovery');
    // Never treated as an ordinary signed-in session: no profile fetch.
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('updatePasswordAndSignOut saves the new password and signs the recovery session out', async () => {
    const mock = createMockSupabaseClient();
    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));

    await act(async () => {
      mock.emitAuthStateChange('PASSWORD_RECOVERY', createMockSession());
    });
    expect(result.current.state.status).toBe('password_recovery');

    mock.auth.signOut.mockImplementationOnce(async () => {
      mock.emitAuthStateChange('SIGNED_OUT', null);
      return { error: null };
    });

    let response: Awaited<ReturnType<typeof result.current.updatePasswordAndSignOut>> | undefined;
    await act(async () => {
      response = await result.current.updatePasswordAndSignOut('a-new-strong-password');
    });

    expect(response?.error).toBeNull();
    expect(mock.auth.updateUser).toHaveBeenCalledWith({ password: 'a-new-strong-password' });
    expect(mock.auth.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));
  });

  it('updatePasswordAndSignOut surfaces an error without signing out', async () => {
    const mock = createMockSupabaseClient();
    mock.auth.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Password should be at least 8 characters'),
    });

    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));

    await act(async () => {
      mock.emitAuthStateChange('PASSWORD_RECOVERY', createMockSession());
    });

    let response: Awaited<ReturnType<typeof result.current.updatePasswordAndSignOut>> | undefined;
    await act(async () => {
      response = await result.current.updatePasswordAndSignOut('short');
    });

    expect(response?.error).toBe('Password should be at least 8 characters');
    expect(mock.auth.signOut).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('password_recovery');
  });

  it('sign-out clears the session back to signed_out', async () => {
    const mock = createMockSupabaseClient();
    mock.setInitialSession(createMockSession());
    mock.mockProfileResponse({ onboarding_completed_at: null });

    const { result } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });
    await waitFor(() => expect(result.current.state.status).toBe('signed_in'));

    mock.auth.signOut.mockImplementationOnce(async () => {
      mock.emitAuthStateChange('SIGNED_OUT', null);
      return { error: null };
    });

    await act(async () => {
      await result.current.signOut();
    });

    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));
  });

  it('unsubscribes from onAuthStateChange on unmount (no subscription leak)', async () => {
    const mock = createMockSupabaseClient();
    const { unmount } = await renderHook(() => useAuth(), { wrapper: wrapperFor(mock.client) });

    await waitFor(() => expect(mock.auth.onAuthStateChange).toHaveBeenCalledTimes(1));
    const { subscription } = mock.auth.onAuthStateChange.mock.results[0].value.data;

    await unmount();
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error when useAuth is called outside AuthProvider', async () => {
    const { result } = await renderHook(() => {
      try {
        return useAuth();
      } catch (error) {
        return error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toMatch(
      /useAuth\(\) must be called within an AuthProvider/,
    );
  });
});
