import { renderRouter, screen } from 'expo-router/testing-library';

import { createMockSupabaseClient } from '@/test-utils/mock-supabase-client';

/**
 * Companion to root-layout-splash-unconfigured.test.tsx: the valid-config
 * path must still hide the native splash once boot/auth initialisation
 * finishes, and must never render `ConfigurationErrorScreen`.
 */
const mockHideAsync = jest.fn(async () => {});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => {}),
  hideAsync: () => mockHideAsync(),
}));

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: true,
  supabaseEnvConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' },
}));

let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

jest.mock('@/services/supabase/client', () => ({
  getSupabaseClient: () => mockSupabase.client,
}));

beforeEach(() => {
  mockHideAsync.mockClear();
  mockSupabase = createMockSupabaseClient();
});

describe('root layout splash lifecycle (Supabase configured)', () => {
  it('hides the native splash screen once auth has resolved, and never renders the configuration error screen', async () => {
    await renderRouter('src/app', { initialUrl: '/' });

    expect(await screen.findByText(/Your body\./i)).toBeTruthy();
    expect(mockHideAsync).toHaveBeenCalled();
    expect(screen.queryByText('Configuration required')).toBeNull();
  });
});
