import { act, renderRouter, screen } from 'expo-router/testing-library';

import { createMockSession, createMockSupabaseClient } from '@/test-utils/mock-supabase-client';

let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: true,
  supabaseEnvConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' },
}));

jest.mock('@/services/supabase/client', () => ({
  getSupabaseClient: () => mockSupabase.client,
}));

beforeEach(() => {
  mockSupabase = createMockSupabaseClient();
});

describe('route guards (docs/ROUTES.md §3)', () => {
  it('redirects an unauthenticated user away from a private tab to Welcome', async () => {
    await renderRouter('src/app', { initialUrl: '/(tabs)/today' });

    expect(await screen.findByText(/Your body\./i)).toBeTruthy();
  });

  it('redirects an unauthenticated user away from an onboarding route to Welcome', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/introduction' });

    expect(await screen.findByText(/Your body\./i)).toBeTruthy();
  });

  it('lets an unauthenticated user reach Sign In directly (no redirect loop)', async () => {
    await renderRouter('src/app', { initialUrl: '/(auth)/sign-in' });

    expect(await screen.findByText('Sign in')).toBeTruthy();
  });

  it('redirects a signed-in user with incomplete onboarding away from a private tab', async () => {
    mockSupabase.setInitialSession(createMockSession());
    mockSupabase.mockProfileResponse({ onboarding_completed_at: null });

    await renderRouter('src/app', { initialUrl: '/(tabs)/today' });

    expect(await screen.findByText("Let's build your plan")).toBeTruthy();
  });

  it('redirects a signed-in user with incomplete onboarding away from Sign In', async () => {
    mockSupabase.setInitialSession(createMockSession());
    mockSupabase.mockProfileResponse({ onboarding_completed_at: null });

    await renderRouter('src/app', { initialUrl: '/(auth)/sign-in' });

    expect(await screen.findByText("Let's build your plan")).toBeTruthy();
  });

  it('redirects a fully onboarded signed-in user away from Sign In to Today', async () => {
    mockSupabase.setInitialSession(createMockSession());
    mockSupabase.mockProfileResponse({ onboarding_completed_at: '2026-01-01T00:00:00.000Z' });

    await renderRouter('src/app', { initialUrl: '/(auth)/sign-in' });

    expect(await screen.findByText(/What's next/i)).toBeTruthy();
  });

  it('redirects a fully onboarded signed-in user away from an onboarding route to Today', async () => {
    mockSupabase.setInitialSession(createMockSession());
    mockSupabase.mockProfileResponse({ onboarding_completed_at: '2026-01-01T00:00:00.000Z' });

    await renderRouter('src/app', { initialUrl: '/(onboarding)/introduction' });

    expect(await screen.findByText(/What's next/i)).toBeTruthy();
  });

  it('lets a fully onboarded signed-in user reach a private tab directly (deep link passes through the guard)', async () => {
    mockSupabase.setInitialSession(createMockSession());
    mockSupabase.mockProfileResponse({ onboarding_completed_at: '2026-01-01T00:00:00.000Z' });

    await renderRouter('src/app', { initialUrl: '/(tabs)/plan' });

    expect(await screen.findByText('My Plan')).toBeTruthy();
  });

  it('forces a password-recovery session onto Reset Password from a private tab, not the app', async () => {
    mockSupabase.setInitialSession(createMockSession());
    mockSupabase.mockProfileResponse({ onboarding_completed_at: '2026-01-01T00:00:00.000Z' });

    await renderRouter('src/app', { initialUrl: '/(tabs)/today' });
    expect(await screen.findByText(/What's next/i)).toBeTruthy();

    await act(async () => {
      mockSupabase.emitAuthStateChange('PASSWORD_RECOVERY', createMockSession());
    });

    expect(await screen.findByText('Set a new password')).toBeTruthy();
  });

  it('forces a password-recovery session onto Reset Password even from Sign In (not the ordinary auth flow)', async () => {
    await renderRouter('src/app', { initialUrl: '/(auth)/sign-in' });
    expect(await screen.findByText('Sign in')).toBeTruthy();

    await act(async () => {
      mockSupabase.emitAuthStateChange('PASSWORD_RECOVERY', createMockSession());
    });

    expect(await screen.findByText('Set a new password')).toBeTruthy();
  });
});
