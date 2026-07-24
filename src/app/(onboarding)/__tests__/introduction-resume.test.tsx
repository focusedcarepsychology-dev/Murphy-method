import { renderRouter, screen } from 'expo-router/testing-library';

import { FakeOnboardingBackend } from '@/test-utils/fake-onboarding-backend';

const USER_ID = 'user-resume-test';
let mockBackend: FakeOnboardingBackend;

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: true,
  supabaseEnvConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' },
}));

jest.mock('@/services/supabase/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- babel-plugin-jest-hoist only allows a jest.mock() factory to close over `require` itself, not an imported binding.
  const { createFakeOnboardingClient } = require('@/test-utils/fake-onboarding-backend');
  return { getSupabaseClient: () => createFakeOnboardingClient(mockBackend, 'user-resume-test') };
});

describe('Onboarding resume after relaunch (docs/IMPLEMENTATION_PLAN.md Phase 3 §24)', () => {
  beforeEach(() => {
    mockBackend = new FakeOnboardingBackend();
  });

  it('a fresh user with nothing started sees Introduction normally', async () => {
    mockBackend.seedProfile(USER_ID);

    await renderRouter('src/app', { initialUrl: '/(onboarding)/introduction' });

    expect(await screen.findByText("Let's build your plan")).toBeTruthy();
  });

  it('a user who already completed several steps resumes at the true first incomplete step, not Introduction', async () => {
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

    // Simulate relaunch: signed-in session lands on the app's default
    // incomplete-onboarding entry point (introduction), same as
    // useProtectedRoute always redirects to.
    await renderRouter('src/app', { initialUrl: '/(onboarding)/introduction' });

    expect(await screen.findByText('What equipment do you have?')).toBeTruthy();
    expect(screen.queryByText("Let's build your plan")).toBeNull();
  });

  it('a user who finished every required step resumes at Programme Preview', async () => {
    mockBackend.seedProfile(USER_ID, {
      date_of_birth: '1990-01-01',
      height_cm: 180,
      training_experience: 'beginner',
      available_training_days: ['mon'],
      preferred_session_duration_minutes: 45,
      coaching_style: 'supportive',
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

    await renderRouter('src/app', { initialUrl: '/(onboarding)/introduction' });

    // Programme generation is synchronous to landing here (complete_onboarding
    // is idempotent and fast against the fake backend) — either the
    // meaningful loading state or the resolved preview is a valid outcome
    // to observe, but Introduction must never be what's shown.
    expect(await screen.findByText('Your programme is ready')).toBeTruthy();
    expect(screen.queryByText("Let's build your plan")).toBeNull();
  });
});
