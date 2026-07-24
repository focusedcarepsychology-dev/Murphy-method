import { renderRouter, screen } from 'expo-router/testing-library';

import { FakeOnboardingBackend } from '@/test-utils/fake-onboarding-backend';

const USER_ID = 'user-bodyscan-test';
let mockBackend: FakeOnboardingBackend;

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: true,
  supabaseEnvConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' },
}));

jest.mock('@/services/supabase/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- babel-plugin-jest-hoist only allows a jest.mock() factory to close over `require` itself, not an imported binding.
  const { createFakeOnboardingClient } = require('@/test-utils/fake-onboarding-backend');
  return { getSupabaseClient: () => createFakeOnboardingClient(mockBackend, 'user-bodyscan-test') };
});

function seedThroughSafetyScreening(backend: FakeOnboardingBackend) {
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

describe('Optional Baseline BodyScan — consent gating (docs/IMPLEMENTATION_PLAN.md Phase 3 §18)', () => {
  beforeEach(() => {
    mockBackend = new FakeOnboardingBackend();
    seedThroughSafetyScreening(mockBackend);
  });

  it('shows no capture UI and offers only Skip when consent was never granted', async () => {
    await renderRouter('src/app', { initialUrl: '/(onboarding)/bodyscan-baseline' });

    await screen.findByText(/nothing to capture here/i);
    expect(screen.queryByText('Capture')).toBeNull();
    expect(screen.queryByLabelText('Front')).toBeNull();

    // No consent, no upload path exists on this screen at all — nothing in
    // body_scan_images could have been written.
    expect(mockBackend.tables.body_scan_images).toHaveLength(0);
  });

  it('shows the capture entry once consent was granted', async () => {
    mockBackend.tables.consent_records.push({
      id: 'seed-consent',
      profile_id: USER_ID,
      consent_type: 'bodyscan_capture',
      granted: true,
      version: 'bodyscan-consent-v1',
      created_at: '2026-01-01T00:00:00.000Z',
    });

    await renderRouter('src/app', { initialUrl: '/(onboarding)/bodyscan-baseline' });

    expect(await screen.findByText('Front')).toBeTruthy();
    expect(await screen.findByText('Side')).toBeTruthy();
    expect(await screen.findByText('Face away from the camera, arms relaxed.')).toBeTruthy();
  });
});
