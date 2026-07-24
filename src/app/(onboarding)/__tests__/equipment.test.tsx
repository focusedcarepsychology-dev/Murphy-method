import { act, renderRouter, screen } from 'expo-router/testing-library';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { FakeOnboardingBackend } from '@/test-utils/fake-onboarding-backend';

const USER_ID = 'user-equipment-test';
let mockBackend: FakeOnboardingBackend;

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: true,
  supabaseEnvConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' },
}));

jest.mock('@/services/supabase/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- babel-plugin-jest-hoist only allows a jest.mock() factory to close over `require` itself, not an imported binding.
  const { createFakeOnboardingClient } = require('@/test-utils/fake-onboarding-backend');
  return {
    getSupabaseClient: () => createFakeOnboardingClient(mockBackend, 'user-equipment-test'),
  };
});

describe('Equipment screen (docs/SCREEN_SPECIFICATIONS.md §2 "Available Equipment")', () => {
  beforeEach(() => {
    mockBackend = new FakeOnboardingBackend();
    // Seed every required step before "equipment" as already complete, so
    // the forward-navigation guard (src/hooks/use-onboarding-guard.ts)
    // does not redirect this direct deep link away from the screen under
    // test — it only allows landing exactly on the true first incomplete
    // required step.
    mockBackend.seedProfile(USER_ID, {
      date_of_birth: '1990-01-01',
      height_cm: 180,
      training_experience: 'beginner',
    });
    mockBackend.tables.body_measurements.push({
      id: 'seed-weight',
      profile_id: USER_ID,
      measured_on: '2026-01-01',
      metric: 'weight',
      value: 75,
    });
    mockBackend.tables.user_goals.push({
      id: 'seed-goal',
      profile_id: USER_ID,
      goal_id: 'goal-build_muscle',
      priority: 1,
      active: true,
    });
  });

  it('lets a bodyweight-only user proceed and does not block on prior required steps missing', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/equipment' });

    const bodyweightCard = await screen.findByLabelText('Bodyweight only');
    await act(async () => fireEvent.press(bodyweightCard));

    const nextButton = await screen.findByRole('button', { name: 'Next' });
    await waitFor(() => expect(nextButton.props.accessibilityState.disabled).toBe(false));

    await act(async () => fireEvent.press(nextButton));

    await waitFor(() =>
      expect(
        mockBackend.tables.user_equipment.filter(
          (row) => row.profile_id === USER_ID && row.available,
        ),
      ).toHaveLength(1),
    );
  });

  it('disables Next until at least one item is selected', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/equipment' });
    await screen.findByLabelText('Bodyweight only');

    const nextButton = await screen.findByRole('button', { name: 'Next' });
    expect(nextButton.props.accessibilityState.disabled).toBe(true);
  });
});
