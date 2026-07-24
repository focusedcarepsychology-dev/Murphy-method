import { renderRouter, screen } from 'expo-router/testing-library';

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

describe('tab shell', () => {
  it('boots to Welcome when signed out', async () => {
    await renderRouter('src/app', { initialUrl: '/' });

    expect(await screen.findByText(/Your body\./i)).toBeTruthy();
  });

  it('renders the Today dashboard when navigated directly, for a fully onboarded signed-in user', async () => {
    mockSupabase.setInitialSession(createMockSession());
    mockSupabase.mockProfileResponse({ onboarding_completed_at: '2026-01-01T00:00:00.000Z' });

    await renderRouter('src/app', { initialUrl: '/(tabs)/today' });

    expect(await screen.findByText(/What's next/i)).toBeTruthy();
    expect(screen.getByText('Upper Body A')).toBeTruthy();
  });

  it('renders the Plan tab, for a fully onboarded signed-in user', async () => {
    mockSupabase.setInitialSession(createMockSession());
    mockSupabase.mockProfileResponse({ onboarding_completed_at: '2026-01-01T00:00:00.000Z' });

    await renderRouter('src/app', { initialUrl: '/(tabs)/plan' });

    expect(await screen.findByText('My Plan')).toBeTruthy();
  });
});
