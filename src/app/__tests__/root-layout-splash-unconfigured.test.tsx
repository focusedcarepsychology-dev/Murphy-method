import { renderRouter, screen } from 'expo-router/testing-library';

/**
 * Regression coverage for the startup deadlock: when Supabase isn't
 * configured, `AuthProvider`/`AppNavigation` never mount, so the
 * `SplashScreen.hideAsync()` call that normally lives in `AppNavigation`'s
 * effect never runs either, the native splash stayed up forever and
 * `ConfigurationErrorScreen` was rendered underneath it, invisibly.
 */
const mockHideAsync = jest.fn(async () => {});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => {}),
  hideAsync: () => mockHideAsync(),
}));

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: false,
  supabaseEnvConfig: null,
}));

beforeEach(() => {
  mockHideAsync.mockClear();
});

describe('root layout splash lifecycle (Supabase not configured)', () => {
  it('hides the native splash screen and surfaces the configuration error screen instead of deadlocking behind it', async () => {
    await renderRouter('src/app', { initialUrl: '/' });

    expect(await screen.findByText('Configuration required')).toBeTruthy();
    expect(mockHideAsync).toHaveBeenCalled();
  });
});
