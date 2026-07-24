import {
  createFakeOnboardingClient,
  FakeOnboardingBackend,
} from '@/test-utils/fake-onboarding-backend';
import {
  completeOnboarding,
  hasActiveGoals,
  hasEquipmentSelection,
  hasGrantedBodyScanConsent,
  hasHealthScreening,
  insertBaselineMeasurements,
  loadOnboardingSnapshot,
  loadSelectedEquipmentIds,
  loadSelectedGoals,
  OnboardingRepositoryError,
  recordBodyScanConsent,
  replaceUserGoalPriorities,
  setUserEquipment,
  submitSafetyScreening,
  updateProfile,
} from '@/services/onboarding/onboarding-repository';

const USER_A = 'user-a';
const USER_B = 'user-b';

const ALL_CLEAR_ANSWERS = {
  heart_condition_supervised_only: false,
  chest_pain_during_activity: false,
  chest_pain_at_rest: false,
  dizziness_or_balance_loss: false,
  bone_or_joint_problem: false,
  blood_pressure_or_heart_medication: false,
  pregnant_or_recent_postpartum: false,
} as const;

function makeClient(backend: FakeOnboardingBackend, userId: string) {
  backend.seedProfile(userId);
  return createFakeOnboardingClient(backend, userId);
}

describe('replaceUserGoalPriorities (goal priority RPC)', () => {
  it('persists goals in call order and supports reorder/removal', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await replaceUserGoalPriorities(client, ['build_muscle', 'improve_strength', 'consistency']);
    let selected = await loadSelectedGoals(client, USER_A);
    expect(selected.map((g) => g.goalKey)).toEqual([
      'build_muscle',
      'improve_strength',
      'consistency',
    ]);

    await replaceUserGoalPriorities(client, ['consistency', 'build_muscle']);
    selected = await loadSelectedGoals(client, USER_A);
    expect(selected.map((g) => g.goalKey)).toEqual(['consistency', 'build_muscle']);
  });

  it('retrying the same call does not create duplicate active priorities', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await replaceUserGoalPriorities(client, ['build_muscle']);
    await replaceUserGoalPriorities(client, ['build_muscle']);

    const activeRows = backend.tables.user_goals.filter(
      (row) => row.profile_id === USER_A && row.active,
    );
    expect(activeRows).toHaveLength(1);
  });

  it('surfaces a friendly error when the RPC rejects the request', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await expect(replaceUserGoalPriorities(client, [])).rejects.toBeInstanceOf(
      OnboardingRepositoryError,
    );
  });

  it('keeps two users fully isolated', async () => {
    const backend = new FakeOnboardingBackend();
    backend.seedProfile(USER_A);
    backend.seedProfile(USER_B);

    await replaceUserGoalPriorities(createFakeOnboardingClient(backend, USER_A), ['build_muscle']);
    await replaceUserGoalPriorities(createFakeOnboardingClient(backend, USER_B), ['consistency']);

    expect(await hasActiveGoals(createFakeOnboardingClient(backend, USER_A), USER_A)).toBe(true);
    const aGoals = await loadSelectedGoals(createFakeOnboardingClient(backend, USER_A), USER_A);
    expect(aGoals.map((g) => g.goalKey)).toEqual(['build_muscle']);
  });
});

describe('setUserEquipment (idempotent equipment writes)', () => {
  it('supports a bodyweight-only / no-equipment selection', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await setUserEquipment(client, USER_A, ['equip-bodyweight']);

    expect(await hasEquipmentSelection(client, USER_A)).toBe(true);
    expect(await loadSelectedEquipmentIds(client, USER_A)).toEqual(['equip-bodyweight']);
  });

  it('is idempotent: calling it twice with the same selection does not duplicate rows', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await setUserEquipment(client, USER_A, ['equip-bodyweight', 'equip-dumbbell']);
    await setUserEquipment(client, USER_A, ['equip-bodyweight', 'equip-dumbbell']);

    expect(backend.tables.user_equipment.filter((r) => r.profile_id === USER_A)).toHaveLength(2);
  });

  it('marks a deselected item unavailable rather than deleting it', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await setUserEquipment(client, USER_A, ['equip-bodyweight', 'equip-dumbbell']);
    await setUserEquipment(client, USER_A, ['equip-bodyweight']);

    const rows = backend.tables.user_equipment.filter((r) => r.profile_id === USER_A);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.equipment_id === 'equip-dumbbell')?.available).toBe(false);
    expect(await loadSelectedEquipmentIds(client, USER_A)).toEqual(['equip-bodyweight']);
  });
});

describe('submitSafetyScreening (immutable, server-derived)', () => {
  it('never lets the caller supply requires_clearance/restriction_flags directly', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    const result = await submitSafetyScreening(client, {
      ...ALL_CLEAR_ANSWERS,
      heart_condition_supervised_only: true,
    });

    expect(result.requiresClearance).toBe(true);
    expect(result.restrictionFlags).toEqual(['cardiac_supervision_required']);
  });

  it('every submission creates a new immutable row (re-screen history)', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await submitSafetyScreening(client, ALL_CLEAR_ANSWERS);
    await submitSafetyScreening(client, ALL_CLEAR_ANSWERS);

    expect(await hasHealthScreening(client, USER_A)).toBe(true);
    expect(backend.tables.health_screenings.filter((r) => r.profile_id === USER_A)).toHaveLength(2);
  });
});

describe('insertBaselineMeasurements (optional)', () => {
  it('an empty submission succeeds and writes nothing', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await insertBaselineMeasurements(client, USER_A, {});

    expect(backend.tables.body_measurements).toHaveLength(0);
  });

  it('only writes the fields the user actually supplied', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await insertBaselineMeasurements(client, USER_A, { waist: 80 });

    expect(backend.tables.body_measurements).toHaveLength(1);
    expect(backend.tables.body_measurements[0]).toMatchObject({ metric: 'waist', value: 80 });
  });
});

describe('BodyScan consent', () => {
  it('no affirmative consent means no positive consent row exists', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    expect(await hasGrantedBodyScanConsent(client, USER_A)).toBe(false);
  });

  it('consent is append-only: withdrawing writes a new row, not an update', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await recordBodyScanConsent(client, USER_A, true, 'v1');
    await recordBodyScanConsent(client, USER_A, false, 'v1');

    expect(backend.tables.consent_records.filter((r) => r.profile_id === USER_A)).toHaveLength(2);
    expect(await hasGrantedBodyScanConsent(client, USER_A)).toBe(false);
  });
});

describe('completeOnboarding', () => {
  async function completeAllRequiredSteps(backend: FakeOnboardingBackend, userId: string) {
    backend.seedProfile(userId);
    const client = createFakeOnboardingClient(backend, userId);
    await updateProfile(client, userId, {
      dateOfBirth: '1990-01-01',
      heightCm: 180,
      trainingExperience: 'beginner',
      availableTrainingDays: ['mon', 'wed', 'fri'],
      preferredSessionDurationMinutes: 45,
      coachingStyle: 'supportive',
    });
    backend.tables.body_measurements.push({
      id: 'w1',
      profile_id: userId,
      measured_on: '2026-01-01',
      metric: 'weight',
      value: 80,
    });
    await replaceUserGoalPriorities(client, ['build_muscle']);
    await setUserEquipment(client, userId, ['equip-bodyweight']);
    await submitSafetyScreening(client, ALL_CLEAR_ANSWERS);
    return client;
  }

  it('rejects an incomplete profile with a structured, itemised error', async () => {
    const backend = new FakeOnboardingBackend();
    const client = makeClient(backend, USER_A);

    await expect(completeOnboarding(client)).rejects.toMatchObject({
      cause: { kind: 'incomplete_onboarding', missingFields: expect.arrayContaining(['goals']) },
    });
  });

  it('succeeds once every required step has data and creates a valid programme stand-in', async () => {
    const backend = new FakeOnboardingBackend();
    const client = await completeAllRequiredSteps(backend, USER_A);

    const result = await completeOnboarding(client);

    expect(result.onboardingCompletedAt).toBeTruthy();
    expect(result.programme.structure.requiresClearance).toBe(false);
    expect(backend.tables.programmes).toHaveLength(1);
    expect(backend.tables.programme_versions).toHaveLength(1);
  });

  it('is idempotent: a repeat call returns the same programme, not a second one', async () => {
    const backend = new FakeOnboardingBackend();
    const client = await completeAllRequiredSteps(backend, USER_A);

    const first = await completeOnboarding(client);
    const second = await completeOnboarding(client);

    expect(second.programme.id).toBe(first.programme.id);
    expect(backend.tables.programmes).toHaveLength(1);
  });

  it('honestly reflects a requires-clearance outcome in the generated structure', async () => {
    const backend = new FakeOnboardingBackend();
    const client = createFakeOnboardingClient(backend, USER_A);
    backend.seedProfile(USER_A, {
      date_of_birth: '1990-01-01',
      height_cm: 180,
      training_experience: 'beginner',
      available_training_days: ['tue'],
      preferred_session_duration_minutes: 30,
      coaching_style: 'direct',
    });
    backend.tables.body_measurements.push({
      id: 'w2',
      profile_id: USER_A,
      measured_on: '2026-01-01',
      metric: 'weight',
      value: 70,
    });
    await replaceUserGoalPriorities(client, ['improve_fitness']);
    await setUserEquipment(client, USER_A, ['equip-bodyweight']);
    await submitSafetyScreening(client, { ...ALL_CLEAR_ANSWERS, bone_or_joint_problem: true });

    const result = await completeOnboarding(client);

    expect(result.programme.structure.requiresClearance).toBe(true);
    expect(result.programme.structure.restrictionFlags).toEqual(['joint_or_bone_limitation']);
  });
});

describe('loadOnboardingSnapshot (resume/guard data)', () => {
  it('reflects a fully completed required set', async () => {
    const backend = new FakeOnboardingBackend();
    const client = await (async () => {
      const c = createFakeOnboardingClient(backend, USER_A);
      backend.seedProfile(USER_A, {
        date_of_birth: '1990-01-01',
        height_cm: 180,
        training_experience: 'beginner',
        available_training_days: ['mon'],
        preferred_session_duration_minutes: 45,
        coaching_style: 'supportive',
      });
      backend.tables.body_measurements.push({
        id: 'w3',
        profile_id: USER_A,
        measured_on: '2026-01-01',
        metric: 'weight',
        value: 80,
      });
      await replaceUserGoalPriorities(c, ['build_muscle']);
      await setUserEquipment(c, USER_A, ['equip-bodyweight']);
      await submitSafetyScreening(c, ALL_CLEAR_ANSWERS);
      return c;
    })();

    const snapshot = await loadOnboardingSnapshot(client, USER_A);

    expect(snapshot).toMatchObject({
      hasWeightMeasurement: true,
      hasActiveGoals: true,
      hasEquipmentSelection: true,
      hasHealthScreening: true,
      trainingExperience: 'beginner',
      coachingStyle: 'supportive',
    });
  });
});
