import { renderRouter, screen } from 'expo-router/testing-library';

import {
  createFakeOnboardingClient,
  FakeOnboardingBackend,
} from '@/test-utils/fake-onboarding-backend';

/**
 * INVARIANTS A–D: a brand-new authenticated user, rendered against
 * genuinely empty tables, must never see fictional history, fictional
 * previous performance, fictional records, or a name they did not enter.
 */
const USER_ID = 'a0000000-0000-4000-8000-000000000001';

let backend: FakeOnboardingBackend;
let mockClient: ReturnType<typeof createFakeOnboardingClient>;

jest.mock('@/config/env', () => ({
  isSupabaseConfigured: true,
  supabaseEnvConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' },
}));

jest.mock('@/services/supabase/client', () => ({
  getSupabaseClient: () => mockClient,
}));

function seedCompletedOnboarding(overrides: Record<string, unknown> = {}) {
  backend = new FakeOnboardingBackend();
  backend.seedProfile(USER_ID, {
    onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    available_training_days: ['monday', 'wednesday', 'friday'],
    preferred_session_duration_minutes: 40,
    training_experience: 'beginner',
    coaching_style: 'supportive',
    ...overrides,
  });
  const exerciseId = 'exercise-bodyweight-squat';
  const programmeId = 'programme-real';
  const versionId = 'programme-version-real';
  backend.tables.exercises.push({
    id: exerciseId,
    name: 'Bodyweight Squat',
    slug: 'bodyweight-squat',
    description: 'A squat using only your bodyweight.',
    visual_key: 'pose_squat',
    starting_position: 'Stand with your feet about shoulder-width apart.',
    instructions: ['Lower with control.', 'Stand back up.'],
    coaching_cues: ['Keep your chest lifted.'],
    common_mistakes: ['Letting the knees collapse inward.'],
    movement_pattern_id: 'movement-squat',
    active: true,
  });
  backend.tables.programmes.push({
    id: programmeId,
    profile_id: USER_ID,
    status: 'active',
    current_version_id: versionId,
    created_at: '2026-01-01T00:00:01.000Z',
  });
  backend.tables.programme_versions.push({
    id: versionId,
    programme_id: programmeId,
    version_number: 1,
    structure: {
      engineVersion: 'deterministic-v1',
      weeklyFrequencyDays: ['monday', 'wednesday', 'friday'],
      sessionDurationMinutes: 40,
      requiresClearance: false,
      restrictionFlags: [],
      limitationNotes: [],
      sessions: [
        {
          sessionIndex: 0,
          label: 'Full Body A',
          focusSummary: 'A balanced full-body session.',
          exercises: [
            {
              exerciseId,
              orderIndex: 0,
              targetSets: 3,
              targetRepRangeLow: 8,
              targetRepRangeHigh: 12,
              whyIncluded: 'Matches your bodyweight-only starting plan.',
            },
          ],
        },
      ],
    },
    change_level: 0,
    change_reason: 'Initial real programme.',
    engine_version: 'deterministic-v1',
    exercise_dataset_version: '1',
    created_at: '2026-01-01T00:00:02.000Z',
  });
  mockClient = createFakeOnboardingClient(backend, USER_ID);
}

describe('a brand-new user with no training history', () => {
  it('is greeted without a name when display_name is null', async () => {
    seedCompletedOnboarding({ display_name: null });

    await renderRouter('src/app', { initialUrl: '/(tabs)/today' });

    expect(await screen.findByText(/What's next/i)).toBeTruthy();
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

    expect(await screen.findByText('0 of 3 planned sessions this week')).toBeTruthy();
    expect(screen.queryByText(/3 of 4 planned sessions/)).toBeNull();
  });

  it('shows an empty personal-records state instead of sample records', async () => {
    seedCompletedOnboarding();

    await renderRouter('src/app', { initialUrl: '/(tabs)/progress/records' });

    expect(await screen.findByText('No records yet')).toBeTruthy();
    expect(screen.queryByText(/kg ×/)).toBeNull();
  });

  it('reports no completed sessions on the consistency screen, with no percentage', async () => {
    seedCompletedOnboarding();

    await renderRouter('src/app', { initialUrl: '/(tabs)/progress/consistency' });

    expect(await screen.findByText(/No sessions completed in the last 6 weeks yet\./)).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('offers no coach insight when nothing has been logged', async () => {
    seedCompletedOnboarding();

    await renderRouter('src/app', { initialUrl: '/(tabs)/coach' });

    expect(await screen.findByText('Nothing to report yet')).toBeTruthy();
    expect(screen.queryByText(/one rep away/i)).toBeNull();
  });
});
