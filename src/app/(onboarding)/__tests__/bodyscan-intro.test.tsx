import { act, renderRouter, screen } from 'expo-router/testing-library';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { FakeOnboardingBackend } from '@/test-utils/fake-onboarding-backend';

const USER_ID = 'user-bodyscan-intro-test';
let mockBackend: FakeOnboardingBackend;

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: true,
  supabaseEnvConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' },
}));

jest.mock('@/services/supabase/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- babel-plugin-jest-hoist only allows a jest.mock() factory to close over `require` itself, not an imported binding.
  const { createFakeOnboardingClient } = require('@/test-utils/fake-onboarding-backend');
  return {
    getSupabaseClient: () => createFakeOnboardingClient(mockBackend, 'user-bodyscan-intro-test'),
  };
});

function seedThroughBaselineMeasurements(backend: FakeOnboardingBackend) {
  backend.seedProfile(USER_ID, {
    date_of_birth: '1990-01-01',
    height_cm: 180,
    training_experience: 'beginner',
    available_training_days: ['mon'],
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
  backend.tables.health_screenings.push({
    id: 'seed-screening',
    profile_id: USER_ID,
    responses: {},
    screening_version: 'murphy-safety-v1',
    requires_clearance: false,
    restriction_flags: [],
    created_at: '2026-01-01T00:00:00.000Z',
  });
}

describe('BodyScan Introduction & Consent (docs/SCREEN_SPECIFICATIONS.md §2)', () => {
  beforeEach(() => {
    mockBackend = new FakeOnboardingBackend();
    seedThroughBaselineMeasurements(mockBackend);
  });

  it('reaching the screen writes no consent row at all', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/bodyscan-intro' });
    await screen.findByText('BodyScan (optional)');

    expect(mockBackend.tables.consent_records).toHaveLength(0);
  });

  it('skipping writes no positive consent row', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/bodyscan-intro' });

    const skipButton = await screen.findByRole('button', { name: 'Skip for now' });
    await act(async () => fireEvent.press(skipButton));

    expect(mockBackend.tables.consent_records.filter((r) => r.profile_id === USER_ID)).toHaveLength(
      0,
    );
  });

  it('explicit consent writes exactly one positive, versioned record', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/bodyscan-intro' });

    const consentButton = await screen.findByRole('button', { name: 'Continue to BodyScan' });
    await act(async () => fireEvent.press(consentButton));

    await waitFor(() =>
      expect(
        mockBackend.tables.consent_records.filter((r) => r.profile_id === USER_ID),
      ).toHaveLength(1),
    );
    const record = mockBackend.tables.consent_records[0];
    expect(record.granted).toBe(true);
    expect(record.consent_type).toBe('bodyscan_capture');
    expect(typeof record.version).toBe('string');
  });
});
