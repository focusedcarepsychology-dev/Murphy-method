import { act, renderRouter, screen } from 'expo-router/testing-library';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { FakeOnboardingBackend } from '@/test-utils/fake-onboarding-backend';

const USER_ID = 'user-coaching-style-test';
let mockBackend: FakeOnboardingBackend;

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: true,
  supabaseEnvConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' },
}));

jest.mock('@/services/supabase/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- babel-plugin-jest-hoist only allows a jest.mock() factory to close over `require` itself, not an imported binding.
  const { createFakeOnboardingClient } = require('@/test-utils/fake-onboarding-backend');
  return {
    getSupabaseClient: () => createFakeOnboardingClient(mockBackend, 'user-coaching-style-test'),
  };
});

describe('Coaching Style (docs/IMPLEMENTATION_PLAN.md Phase 3 §19)', () => {
  beforeEach(() => {
    mockBackend = new FakeOnboardingBackend();
    mockBackend.seedProfile(USER_ID, {
      date_of_birth: '1990-01-01',
      height_cm: 180,
      training_experience: 'beginner',
      available_training_days: ['mon'],
      preferred_session_duration_minutes: 45,
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
    mockBackend.tables.user_equipment.push({
      id: 'seed-equip',
      profile_id: USER_ID,
      equipment_id: 'equip-bodyweight',
      available: true,
    });
    mockBackend.tables.health_screenings.push({
      id: 'seed-screening',
      profile_id: USER_ID,
      responses: {},
      screening_version: 'murphy-safety-v1',
      requires_clearance: false,
      restriction_flags: [],
      created_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('has no style pre-selected and requires an explicit choice', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/coaching-style' });

    const nextButton = await screen.findByRole('button', { name: 'Next' });
    expect(nextButton.props.accessibilityState.disabled).toBe(true);

    const supportiveCard = await screen.findByLabelText('Supportive');
    expect(supportiveCard.props.accessibilityState.checked).toBe(false);
  });

  it('persists the canonical enum value for the chosen style', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/coaching-style' });

    const analyticalCard = await screen.findByLabelText('Analytical');
    await act(async () => fireEvent.press(analyticalCard));

    const nextButton = await screen.findByRole('button', { name: 'Next' });
    await waitFor(() => expect(nextButton.props.accessibilityState.disabled).toBe(false));
    await act(async () => fireEvent.press(nextButton));

    await waitFor(() => {
      const profile = mockBackend.tables.profiles.find((p) => p.id === USER_ID);
      expect(profile?.coaching_style).toBe('analytical');
    });
  });
});
