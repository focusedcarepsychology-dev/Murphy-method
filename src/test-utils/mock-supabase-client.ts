import type { AuthError, Session } from '@supabase/supabase-js';

import type { MurphySupabaseClient } from '@/services/supabase/client';

type AuthChangeCallback = (event: string, session: Session | null) => void;
type ProfileRow = { onboarding_completed_at: string | null };

/**
 * Test/mocking boundary for the Supabase client (docs/IMPLEMENTATION_PLAN.md
 * Phase 2 §4, §14). Jest tests inject the returned `client` into
 * `<AuthProvider client={...}>` instead of the real
 * `getSupabaseClient()` singleton, so no test depends on real Supabase
 * configuration or a network call.
 */
export function createMockSupabaseClient() {
  let session: Session | null = null;
  let onAuthStateChangeCallback: AuthChangeCallback | null = null;

  const auth = {
    getSession: jest.fn(async () => ({ data: { session }, error: null as AuthError | null })),
    onAuthStateChange: jest.fn((callback: AuthChangeCallback) => {
      onAuthStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    signUp: jest.fn(async () => ({
      data: { session: null as Session | null, user: null as unknown },
      error: null as unknown,
    })),
    signInWithPassword: jest.fn(async () => ({
      data: { session: null as Session | null, user: null as unknown },
      error: null as unknown,
    })),
    signOut: jest.fn(async () => ({ error: null as AuthError | null })),
    resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null as AuthError | null })),
    updateUser: jest.fn(async () => ({
      data: { user: null as unknown },
      error: null as unknown,
    })),
    resend: jest.fn(async () => ({ data: {}, error: null as AuthError | null })),
    setSession: jest.fn(async () => ({
      data: { session: null as Session | null, user: null as unknown },
      error: null as unknown,
    })),
    exchangeCodeForSession: jest.fn(async () => ({
      data: { session: null as Session | null, user: null as unknown },
      error: null as unknown,
    })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  };

  const singleMock = jest.fn(async () => ({
    data: { onboarding_completed_at: null } as ProfileRow | null,
    error: null as unknown,
  }));
  const eqMock = jest.fn(() => ({ single: singleMock }));
  const selectMock = jest.fn(() => ({ eq: eqMock }));
  const from = jest.fn(() => ({ select: selectMock }));

  return {
    client: { auth, from } as unknown as MurphySupabaseClient,
    auth,
    from,
    /** Simulates a Supabase Auth state change event (e.g. after sign-in). */
    emitAuthStateChange(event: string, nextSession: Session | null) {
      session = nextSession;
      onAuthStateChangeCallback?.(event, nextSession);
    },
    /** Sets the session `getSession()` (the initial load) resolves with. */
    setInitialSession(nextSession: Session | null) {
      session = nextSession;
    },
    /** Configures what the `profiles` select-by-id read resolves with. */
    mockProfileResponse(data: ProfileRow | null, error: unknown = null) {
      singleMock.mockResolvedValue({ data, error });
    },
  };
}

export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'a0000000-0000-4000-8000-000000000001',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'user-a@example.com',
    },
    ...overrides,
  } as Session;
}
