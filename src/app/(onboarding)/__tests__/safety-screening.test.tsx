import { act, renderRouter, screen } from 'expo-router/testing-library';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { FakeOnboardingBackend } from '@/test-utils/fake-onboarding-backend';

const USER_ID = 'user-safety-test';
let mockBackend: FakeOnboardingBackend;

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: true,
  supabaseEnvConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' },
}));

jest.mock('@/services/supabase/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- babel-plugin-jest-hoist only allows a jest.mock() factory to close over `require` itself, not an imported binding.
  const { createFakeOnboardingClient } = require('@/test-utils/fake-onboarding-backend');
  return { getSupabaseClient: () => createFakeOnboardingClient(mockBackend, 'user-safety-test') };
});

function seedThroughDuration(backend: FakeOnboardingBackend) {
  backend.seedProfile(USER_ID, {
    date_of_birth: '1990-01-01',
    height_cm: 180,
    training_experience: 'beginner',
    available_training_days: ['mon', 'wed'],
    preferred_session_duration_minutes: 45,
  });
  backend.tables.body_measurements.push({
    id: 'seed-weight',
    profile_id: USER_ID,
    measured_on: '2026-01-01',
    metric: 'weight',
    value: 75,
  });
  backend.tables.user_goals.push({
    id: 'seed-goal',
    profile_id: USER_ID,
    goal_id: 'goal-build_muscle',
    priority: 1,
    active: true,
  });
  backend.tables.user_equipment.push({
    id: 'seed-equip',
    profile_id: USER_ID,
    equipment_id: 'equip-bodyweight',
    available: true,
  });
}

describe('Safety Screening (safety-critical, cannot be skipped — MASTER_SPEC.md §8.1)', () => {
  beforeEach(() => {
    mockBackend = new FakeOnboardingBackend();
    seedThroughDuration(mockBackend);
  });

  it('keeps Next disabled until every question is answered', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/safety-screening' });

    await screen.findAllByRole('tab', { name: 'No' });

    const nextButton = await screen.findByRole('button', { name: 'Next' });
    expect(nextButton.props.accessibilityState.disabled).toBe(true);
  });

  it('submits deterministic all-clear answers and proceeds without a clearance notice', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/safety-screening' });

    const noButtons = await screen.findAllByRole('tab', { name: 'No' });
    for (const button of noButtons) {
      await act(async () => fireEvent.press(button));
    }

    const nextButton = await screen.findByRole('button', { name: 'Next' });
    await waitFor(() => expect(nextButton.props.accessibilityState.disabled).toBe(false));
    await act(async () => fireEvent.press(nextButton));

    await waitFor(() =>
      expect(
        mockBackend.tables.health_screenings.filter((r) => r.profile_id === USER_ID),
      ).toHaveLength(1),
    );
    const row = mockBackend.tables.health_screenings[0];
    expect(row.requires_clearance).toBe(false);
    expect(row.restriction_flags).toEqual([]);
  });
});
