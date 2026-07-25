import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { seedCompletedOnboarding } from '@/test-utils/fake-supabase';

jest.mock('@/services/supabase/client', () => {
  const { createFakeSupabaseClient } = jest.requireActual('@/test-utils/fake-supabase');
  return { supabase: createFakeSupabaseClient() };
});

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  File: class File {},
}));

describe('a brand-new user with no training history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not show the fictional name Alex or a dangling name separator', async () => {
    seedCompletedOnboarding();

    await renderRouter('src/app', { initialUrl: '/(tabs)/today' });

    expect(await screen.findByText(/^Good (morning|afternoon|evening)$/)).toBeTruthy();
    expect(screen.queryByText(/Alex/)).toBeNull();
    // Greeting renders alone, with no dangling comma after an empty name.
    expect(screen.queryByText(/^Good (morning|afternoon|evening|Hello),\s*$/)).toBeNull();
  }, 15_000);

  it('is greeted by name when display_name is set', async () => {
    seedCompletedOnboarding({ display_name: 'Sam' });

    await renderRouter('src/app', { initialUrl: '/(tabs)/today' });

    expect(await screen.findByText(/, Sam$/)).toBeTruthy();
  });

  it('shows zero completed sessions rather than an invented tally', async () => {
    seedCompletedOnboarding();

    await renderRouter('src/app', { initialUrl: '/(tabs)/today' });

    expect(await screen.findByText('0 of 3')).toBeTruthy();
    expect(
      screen.getByText('Progress is measured by completed sessions, not an all-or-nothing streak.'),
    ).toBeTruthy();
    expect(screen.queryByText(/3 of 4 planned sessions/)).toBeNull();
  });

  it('shows an empty personal-records state instead of sample records', async () => {
    seedCompletedOnboarding();

    await renderRouter('src/app', { initialUrl: '/(tabs)/progress/records' });

    expect(await screen.findByText('No records yet')).toBeTruthy();
    expect(screen.queryByText(/Bench Press/)).toBeNull();
    expect(screen.queryByText(/100 kg/)).toBeNull();
  });
});
