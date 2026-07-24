import { AppState } from 'react-native';

const mockCreateClient = jest.fn((..._args: unknown[]) => ({
  auth: {
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

describe('getSupabaseClient (configured)', () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockClear();
    jest.doMock('@/config/env', () => ({
      supabaseEnvConfig: {
        url: 'https://project.supabase.co',
        publishableKey: 'sb_publishable_test',
      },
    }));
  });

  it('creates the client only once across multiple calls (no per-render duplication)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSupabaseClient } = require('@/services/supabase/client');
    const a = getSupabaseClient();
    const b = getSupabaseClient();

    expect(a).toBe(b);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });

  it('passes AsyncStorage-backed session persistence and auto-refresh options', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSupabaseClient } = require('@/services/supabase/client');
    getSupabaseClient();

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'sb_publishable_test',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        }),
      }),
    );
  });

  it('subscribes to AppState changes only once even across multiple calls', () => {
    const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSupabaseClient } = require('@/services/supabase/client');

    getSupabaseClient();
    getSupabaseClient();

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    addEventListenerSpy.mockRestore();
  });
});

describe('getSupabaseClient (not configured)', () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockClear();
    jest.doMock('@/config/env', () => ({ supabaseEnvConfig: null }));
  });

  it('throws a clear error instead of silently creating a client or falling back to a fake backend', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSupabaseClient } = require('@/services/supabase/client');

    expect(() => getSupabaseClient()).toThrow(/without supabase configuration/i);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
